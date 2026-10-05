"use server";
// src/features/practice/actions.ts — Practice room: the AI plays a bank officer, a haggling customer
// or an office buyer, using the founder's real plan; then gives kind, specific feedback.
import { z } from "zod";
import type { Lang } from "@/contracts/profile";
import { requirePlan } from "@/lib/auth";
import { callJson } from "@/lib/ai/callJson";
import { baseRules, json } from "@/lib/ai/prompts/base";
import { getProvider } from "@/lib/ai/provider";
import { redact } from "@/lib/ai/redact";
import { planSnapshot } from "@/features/talk/server/snapshot";
import type { Role } from "./roles";

export type PracticeMessage = { role: "founder" | "partner"; text: string };

const ROLE_BRIEF: Record<Role, string> = {
  bank:
    "You are Mr. Kulkarni, a polite but careful loan officer at a public-sector bank branch in Pune. The founder wants a small business loan (e.g. MUDRA). Ask one question at a time about: what the business is, how much she needs and why, her own contribution, how she will repay, proof that people buy (her test results), and whether she has Udyam/FSSAI. Push back gently once on weak answers. Never promise approval.",
  customer:
    "You are Mrs. Deshpande, a friendly but price-conscious neighbour in the founder's area. You like the product idea but haggle: say the price is high compared to a big bakery, ask for a discount, ask about eggless options and delivery. Only agree if she explains value well or offers something reasonable. Stay in character.",
  office:
    "You are Ms. Rao, admin at a 40-person office nearby, planning Diwali gift boxes. Ask about the price for 30–40 boxes, a sample, delivery date, packaging and an invoice. You are busy and want clear answers. Stay in character.",
};

const Turn = z.object({ reply: z.string().min(1), finished: z.boolean() });

export async function practiceTurn(planId: string, role: Role, history: PracticeMessage[], said: string, lang: Lang): Promise<{ ok: true; reply: string; finished: boolean } | { ok: false }> {
  const plan = await requirePlan(planId);
  try {
    const snap = await planSnapshot(plan, lang);
    const system = [
      baseRules(lang),
      "This is a ROLE-PLAY so a first-time founder can practise a real conversation out loud.",
      ROLE_BRIEF[role],
      "Speak naturally in the user's language, like a real person in Pune would (Marathi/Hindi speakers may mix English words). Max 2 short sentences, then a question. No markdown, no emojis.",
      "Use the founder's real business details from the snapshot when it helps (product, area, prices).",
      "finished: true only after about 5 exchanges or when the deal is clearly decided; then end the scene politely.",
      'Return JSON: {"reply":"","finished":false}',
    ].join("\n");
    const convo = history.slice(-10).map((m) => `${m.role === "founder" ? "Founder" : "You"}: ${m.text}`).join("\n");
    const user = `FOUNDER'S PLAN:\n${json({ business: snap.business, money: snap.moneyEstimates, test: snap.sevenDayTest, licences: snap.licences.map((l) => l.name) })}\n\nSCENE SO FAR:\n${convo || "(the founder walks in)"}\n\n${said ? `Founder says: ${redact(said.slice(0, 500))}` : "Open the scene with your first line."}`;
    const r = await callJson(Turn, { system, user }, { temperature: 0.8, provider: getProvider(), fast: true });
    return { ok: true, reply: r.reply, finished: r.finished };
  } catch {
    return { ok: false };
  }
}

const Feedback = z.object({
  stars: z.number().int().min(1).max(5),
  headline: z.string(),
  strengths: z.array(z.string()).max(3),
  tips: z.array(z.string()).max(3),
  betterLine: z.string(),
});
export type PracticeFeedback = z.infer<typeof Feedback>;

export async function practiceFeedback(planId: string, role: Role, history: PracticeMessage[], lang: Lang): Promise<{ ok: true; feedback: PracticeFeedback } | { ok: false }> {
  await requirePlan(planId);
  if (history.filter((m) => m.role === "founder").length === 0) return { ok: false };
  try {
    const convo = history.map((m) => `${m.role === "founder" ? "Founder" : "Other person"}: ${m.text}`).join("\n");
    const feedback = await callJson(
      Feedback,
      {
        system: [
          baseRules(lang),
          `You are a warm business coach. The founder just practised talking to: ${ROLE_BRIEF[role].split(".")[0]}.`,
          "Give kind, specific feedback a nervous first-time founder can use next time.",
          "stars: 1–5 for how convincing she was (be encouraging; 3 is a fine first try). headline: one upbeat sentence.",
          "strengths: 2–3 things she did well, quoting her if possible. tips: 2–3 concrete things to try next time.",
          "betterLine: one sentence she could say next time at the hardest moment, in her language.",
          'Return JSON: {"stars":3,"headline":"","strengths":[],"tips":[],"betterLine":""}',
        ].join("\n"),
        user: redact(convo.slice(-4000)),
      },
      { temperature: 0.5, provider: getProvider() },
    );
    return { ok: true, feedback };
  } catch {
    return { ok: false };
  }
}
