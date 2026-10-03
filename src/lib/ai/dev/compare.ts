// src/lib/ai/dev/compare.ts   OWNER: T1 — live provider check (costs a few API calls).
// Run:  npx tsx src/lib/ai/dev/compare.ts
// Uses GEMINI_API_KEY and/or OPENAI_API_KEY from .env.local if set, otherwise AI_PROVIDER + AI_API_KEY.
// Prints the T1-01 acceptance checks for each provider so we can pick one for Hindi/Marathi quality.
import { config } from "dotenv";
import type { BusinessProfile, Lang } from "@/contracts/profile";
import { createAi } from "../core";
import { createProvider, type ProviderConfig } from "../provider";

config({ path: ".env.local" });

const IDEAS: { label: string; lang: Lang; text: string }[] = [
  { label: "English ", lang: "en", text: "I want to start a home bakery in Pune, making custom cakes and cookies from my kitchen." },
  { label: "Hinglish", lang: "hi", text: "mujhe Pune mein home bakery start karni hai" },
  { label: "Marathi ", lang: "mr", text: "मला पुण्यात घरून होम बेकरी सुरू करायची आहे, केक आणि कुकीज बनवून विकायचे आहेत." },
];

const RULE_TEXT =
  "FSSAI Basic Registration is needed by small food businesses, including home kitchens, below the turnover limit set by FSSAI. Apply online on the FoSCoS portal. Check the current fee and limit on the portal.";

function configs(): ProviderConfig[] {
  const out: ProviderConfig[] = [];
  if (process.env.GEMINI_API_KEY) out.push({ name: "gemini", apiKey: process.env.GEMINI_API_KEY });
  if (process.env.OPENAI_API_KEY) out.push({ name: "openai", apiKey: process.env.OPENAI_API_KEY });
  if (out.length === 0 && process.env.AI_API_KEY) {
    out.push({
      name: process.env.AI_PROVIDER === "openai" ? "openai" : "gemini",
      apiKey: process.env.AI_API_KEY,
      model: process.env.AI_MODEL || undefined,
      embedModel: process.env.AI_EMBED_MODEL || undefined,
    });
  } else {
    // Model overrides apply to the matching provider.
    for (const c of out) if (c.name === process.env.AI_PROVIDER) Object.assign(c, { model: process.env.AI_MODEL || undefined, embedModel: process.env.AI_EMBED_MODEL || undefined });
  }
  return out;
}

const short = (p: BusinessProfile) =>
  `${p.businessType} | ${p.city} | ${p.locality ?? "-"} | ${p.premises ?? "-"} | product="${p.product}" | missing=[${p.missingFields.join(",")}]`;

// Free tier: 5 requests/min per model, so pace the calls.
const pause = () => new Promise((r) => setTimeout(r, Number(process.env.COMPARE_PAUSE_MS ?? 7000)));

async function check(name: string, fn: () => Promise<string>) {
  await pause();
  const t = Date.now();
  try {
    console.log(`  ✔ ${name}: ${await fn()}  (${Date.now() - t} ms)`);
  } catch (e) {
    console.log(`  ✖ ${name}: ${(e as Error).message}`);
  }
}

async function run(cfg: ProviderConfig) {
  const provider = createProvider(cfg);
  const ai = createAi(() => provider);
  console.log(`\n=== ${cfg.name} (${cfg.model ?? "default model"}) ===`);

  const profiles: BusinessProfile[] = [];
  for (const idea of IDEAS) {
    await check(`parseIdea ${idea.label}`, async () => {
      const p = await ai.parseIdea(idea.text, idea.lang);
      profiles.push(p);
      return short(p);
    });
  }
  if (profiles.length === 3) {
    const key = (p: BusinessProfile) => `${p.businessType}|${p.city}|${p.premises}`;
    console.log(`  ${profiles.every((p) => key(p) === key(profiles[0])) ? "✔" : "✖"} same type/city/premises across 3 languages`);
    const hinglish = profiles[1];
    const ok = hinglish.businessType === "home_food" && hinglish.city === "Pune" && hinglish.premises === "home" &&
      hinglish.missingFields.includes("budgetInr") && hinglish.missingFields.includes("hoursPerDay");
    console.log(`  ${ok ? "✔" : "✖"} Hinglish → home_food, Pune, home, missing budget/hours`);
  }

  await check("nextFollowUp (mr)", async () => { const p = profiles[2] ?? profiles[0]; if (!p) throw new Error("no profile parsed"); return JSON.stringify(await ai.nextFollowUp(p, "mr")); });
  await check("explainFromRecord (mr)", () => ai.explainFromRecord(RULE_TEXT, "mr"));
  await check("answerFromSources unrelated → null", async () =>
    JSON.stringify(await ai.answerFromSources("What is the GST rate on cakes?", [
      { sourceKey: "udyam", content: "Udyam Registration is a free online registration for micro, small and medium enterprises." },
    ], "en")));
  await check("answerFromSources related", async () =>
    JSON.stringify(await ai.answerFromSources("Where do I apply for FSSAI registration?", [{ sourceKey: "fssai_foscos", content: RULE_TEXT }], "hi")));
  await check("draft assumptions (en)", async () => {
    const d = await ai.draft<{ items: { text: string }[] }>("assumptions", { profile: profiles[0] }, "en");
    return `${d.items.length} items, e.g. "${d.items[0]?.text}"`;
  });
  await check('embed(["test"])[0].length', async () => String((await ai.embed(["test"]))[0].length));
}

async function main() {
  const list = configs();
  if (list.length === 0) {
    console.log("No key found. Put GEMINI_API_KEY and/or OPENAI_API_KEY (or AI_PROVIDER + AI_API_KEY) in .env.local.");
    process.exit(1);
  }
  for (const cfg of list) await run(cfg);
}

main();
