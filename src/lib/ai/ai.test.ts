import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { FIXTURE_PROFILE } from "@/fixtures/home-bakery";
import { AiInvalidOutput, callJson, parseJsonLoose } from "./callJson";
import { createAi } from "./core";
import { mergeProfile, nextFollowUpField } from "./profile";
import type { ChatOptions, Provider } from "./provider";
import { redact, REDACTED } from "./redact";

/** A provider that replays canned answers and records what it was sent. */
function fakeProvider(replies: string[]) {
  const calls: ChatOptions[] = [];
  const provider: Provider = {
    name: "gemini",
    chat: vi.fn(async (opts: ChatOptions) => {
      calls.push(opts);
      return replies.shift() ?? "";
    }),
    embed: vi.fn(async (texts: string[]) => texts.map(() => new Array(768).fill(0.1))),
    transcribe: vi.fn(async () => "hello"),
  };
  return { provider, calls };
}

describe("redact", () => {
  it("removes emails, phone numbers and 12+ digit IDs", () => {
    const out = redact("mail me at priya.k@gmail.com or call +91 98765 43210, Aadhaar 1234 5678 9012, acct 123456789012345");
    expect(out).not.toMatch(/gmail|98765|1234 5678|123456789012345/);
    expect(out.split(REDACTED).length - 1).toBe(4);
  });

  it("keeps budgets, hours and short numbers", () => {
    expect(redact("budget 30000, ₹30,000 or 1 lakh, 4 hours a day, 2 kg")).toBe("budget 30000, ₹30,000 or 1 lakh, 4 hours a day, 2 kg");
  });
});

describe("callJson", () => {
  const Schema = z.object({ n: z.number() });

  it("parses fenced JSON", () => {
    expect(parseJsonLoose('```json\n{"n": 1}\n```')).toEqual({ n: 1 });
  });

  it("returns valid output without retrying", async () => {
    const { provider, calls } = fakeProvider(['{"n": 3}']);
    await expect(callJson(Schema, { system: "s", user: "u" }, { temperature: 0.2, provider })).resolves.toEqual({ n: 3 });
    expect(calls).toHaveLength(1);
  });

  it("retries once with the error, then succeeds", async () => {
    const { provider, calls } = fakeProvider(['{"n": "three"', '{"n": 3}']);
    await expect(callJson(Schema, { system: "s", user: "u" }, { temperature: 0.2, provider })).resolves.toEqual({ n: 3 });
    expect(calls).toHaveLength(2);
    expect(calls[1].user).toContain("rejected");
  });

  it("broken JSON twice → exactly one retry, then a clean AiInvalidOutput", async () => {
    const { provider, calls } = fakeProvider(["{broken", "{still broken"]);
    await expect(callJson(Schema, { system: "s", user: "u" }, { temperature: 0.2, provider })).rejects.toBeInstanceOf(AiInvalidOutput);
    expect(calls).toHaveLength(2);
  });
});

describe("profile merge (code, not AI)", () => {
  it("fills missing fields from what is null, in a fixed order", () => {
    const p = mergeProfile(undefined, { businessType: "home_food", product: "cakes", city: "Pune", premises: "home" }, "hi");
    expect(p.missingFields).toEqual(["locality", "budgetInr", "hoursPerDay", "sellsOnline", "targetCustomer", "expectedMonthlySalesInr"]);
    expect(p.language).toBe("hi");
    expect(nextFollowUpField(p)).toBe("locality");
  });

  it("a follow-up answer adds a field without erasing or flipping the rest", () => {
    const first = mergeProfile(undefined, { businessType: "home_food", product: "cakes", city: "Pune", premises: "home" }, "en");
    const next = mergeProfile(first, { businessType: "other", locality: "Kothrud", budgetInr: 30000.4 }, "en");
    expect(next).toMatchObject({ businessType: "home_food", premises: "home", locality: "Kothrud", budgetInr: 30000 });
  });

  it("clamps hours to 0–24", () => {
    expect(mergeProfile(undefined, { hoursPerDay: 30 }, "en").hoursPerDay).toBe(24);
  });

  it("asks at most 3 follow-ups for the bakery idea", () => {
    let p = mergeProfile(undefined, { businessType: "home_food", product: "cakes", city: "Pune" }, "en");
    const answers = [{ premises: "home" as const }, { locality: "Kothrud" }, { budgetInr: 30000 }, { hoursPerDay: 4 }];
    let asked = 0;
    while (nextFollowUpField(p)) {
      p = mergeProfile(p, answers[asked++], "en");
    }
    expect(asked).toBe(3);
  });
});

describe("ai functions with a fake provider", () => {
  it("parseIdea redacts before sending and returns a full profile", async () => {
    const { provider, calls } = fakeProvider([
      JSON.stringify({ businessType: "home_food", product: "home bakery", city: "Pune", premises: "home", budgetInr: null }),
    ]);
    const ai = createAi(() => provider);
    const p = await ai.parseIdea("mujhe Pune mein home bakery start karni hai, call 9876543210", "hi");
    expect(calls[0].user).not.toContain("9876543210");
    expect(calls[0].temperature).toBe(0.2);
    expect(p).toMatchObject({ businessType: "home_food", city: "Pune", premises: "home", language: "hi" });
    expect(p.missingFields).toEqual(expect.arrayContaining(["budgetInr", "hoursPerDay"]));
  });

  it("nextFollowUp: code picks the field, AI phrases it; null when complete", async () => {
    const { provider } = fakeProvider(['{"question": "आप किस इलाके में काम करेंगी?"}']);
    const ai = createAi(() => provider);
    const q = await ai.nextFollowUp({ ...FIXTURE_PROFILE, locality: null, missingFields: ["locality"] }, "hi");
    expect(q).toEqual({ field: "locality", question: "आप किस इलाके में काम करेंगी?" });
    expect(await ai.nextFollowUp({ ...FIXTURE_PROFILE, missingFields: ["targetCustomer"] }, "hi")).toBeNull();
  });

  it("answerFromSources returns {answer:null} when the model finds nothing or cites unknown sources", async () => {
    const chunks = [{ sourceKey: "fssai_foscos", content: "FoSCoS is the FSSAI online portal." }];
    const { provider } = fakeProvider([
      '{"answer": null, "sourceKeys": []}',
      '{"answer": "Yes", "sourceKeys": ["made_up"]}',
      '{"answer": "Apply on FoSCoS.", "sourceKeys": ["fssai_foscos"]}',
    ]);
    const ai = createAi(() => provider);
    expect(await ai.answerFromSources("Q?", chunks, "en")).toEqual({ answer: null });
    expect(await ai.answerFromSources("Q?", chunks, "en")).toEqual({ answer: null });
    expect(await ai.answerFromSources("Q?", chunks, "en")).toEqual({ answer: "Apply on FoSCoS.", sourceKeys: ["fssai_foscos"] });
    expect(await ai.answerFromSources("Q?", [], "en")).toEqual({ answer: null });
  });

  it("draft validates against the section schema and uses 0.7 for friendly copy", async () => {
    const good = { whatsappMessage: "Hi!", poll: { question: "Which?", options: ["A", "B"] }, priceCard: "Cake ₹___" };
    const { provider, calls } = fakeProvider([JSON.stringify(good)]);
    const ai = createAi(() => provider);
    await expect(ai.draft("templates", { profile: FIXTURE_PROFILE }, "mr")).resolves.toEqual(good);
    expect(calls[0].temperature).toBe(0.7);
  });

  it("embed returns 768 numbers per text", async () => {
    const { provider } = fakeProvider([]);
    const ai = createAi(() => provider);
    expect((await ai.embed(["test"]))[0].length).toBe(768);
  });
});
