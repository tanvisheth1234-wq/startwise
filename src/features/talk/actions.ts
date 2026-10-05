"use server";
// src/features/talk/actions.ts — "Talk to StartWise": one conversational turn over the founder's own plan.
// The AI answers from the plan snapshot only, and can do three safe things: open a screen,
// add a task, or log a line in the sales diary (both undoable from their screens).
import { z } from "zod";
import type { Lang } from "@/contracts/profile";
import { requirePlan } from "@/lib/auth";
import { callJson } from "@/lib/ai/callJson";
import { baseRules, json, LANG_NAME } from "@/lib/ai/prompts/base";
import { getProvider } from "@/lib/ai/provider";
import { redact } from "@/lib/ai/redact";
import { noteToTask } from "@/features/notebook/actions";
import { addDiaryLine } from "@/features/first-customers/actions";
import { neutralReply } from "./lib/neutral";
import { SCREENS, type Screen } from "./lib/screens";
import { planSnapshot } from "./server/snapshot";

/** What each screen is called on HER phone, so the assistant never says "Tasks screen" in Hindi. */
const SCREEN_NAMES: Record<Lang, string> = {
  en: "Home, Tasks, the 7-day test, Money Lab, Papers, Money help, the map, Marketing buddy, Notebook, First customers, Order book, Practice room, Launch Pack",
  hi: "होम, काम, 7 दिन का टेस्ट, मनी लैब, कागज़ात, पैसों की मदद, नक्शा, मार्केटिंग साथी, नोटबुक, पहले ग्राहक, ऑर्डर बुक, अभ्यास कक्ष, लॉन्च पैक",
  mr: "होम, कामं, ७ दिवसांची चाचणी, मनी लॅब, कागदपत्रं, पैशांची मदत, नकाशा, मार्केटिंग सोबती, वही, पहिले ग्राहक, ऑर्डर वही, सराव कक्ष, लॉन्च पॅक",
};

const Turn = z.object({
  reply: z.string().min(1),
  // A screen name we don't know just means "no button", never a failed reply.
  open: z.preprocess((v) => ((SCREENS as readonly string[]).includes(String(v)) ? v : null), z.enum(SCREENS).nullable()),
  addTask: z.string().nullable(),
  logDiary: z.string().nullable(),
});

export type TalkMessage = { role: "user" | "assistant"; text: string };
export type TalkResult = { ok: true; reply: string; open: Screen | null; did: ("task" | "diary")[] } | { ok: false };

export async function talkTurn(planId: string, history: TalkMessage[], text: string, lang: Lang): Promise<TalkResult> {
  const plan = await requirePlan(planId);
  const said = text.trim().slice(0, 500);
  if (!said) return { ok: false };
  try {
    const snapshot = await planSnapshot(plan, lang);
    const system = [
      baseRules(lang),
      "You are StartWise's voice assistant: a warm, practical 'business didi' talking with the founder.",
      "Your reply is SPOKEN aloud: at most 3 short sentences, no lists, no markdown, no emojis. Talk like a friend, not a report.",
      "Answer ONLY from the PLAN SNAPSHOT. If something isn't in it, say you don't know yet and point to the right screen.",
      "For licences and schemes only repeat what the snapshot says; for money only use the snapshot's estimate numbers and say they are estimates.",
      "If they ask what to do, pick the first open task that is not locked and make it feel small and doable.",
      "Never call her sister/didi/bahen/tai. Use gender-neutral respectful grammar: Hindi आप with plural verbs (देख सकते हैं, करेंगे, never सकती/करेंगी); Marathi तुम्ही with plural (पाहू शकता, कराल).",
      `When you mention a screen, use exactly these names: ${SCREEN_NAMES[lang]}. Never English words like "tasks" or "screen" inside Hindi/Marathi.`,
      "Name screens in HER language, the way she sees them on her phone, never internal or English names: Papers (licences), Money Lab, 7-day test, Money help (schemes), Tasks, Notebook, Marketing buddy, First customers (where the sales diary and customer list live: use first-customers after logging a sale), Launch Pack, the map.",
      `open: if a screen would help, one of ${SCREENS.join(", ")}; else null.`,
      "addTask: if they ask you to remember or add something to do, the task in their words (max 12 words); else null.",
      'logDiary: if they report a sale, an expense or a customer enquiry ("sold 2 cakes for 900"), repeat that line exactly; else null. If you log it, say so warmly in the reply.',
      'Return JSON: {"reply":"","open":null,"addTask":null,"logDiary":null}',
      `LANGUAGE (most important): write "reply" ONLY in ${LANG_NAME[lang]}.`,
    ].join("\n");
    const convo = history.slice(-6).map((m) => `${m.role === "user" ? "Founder" : "You"}: ${m.text}`).join("\n");
    const user = `PLAN SNAPSHOT:\n${json(snapshot)}\n\nCONVERSATION SO FAR:\n${convo || "(start)"}\n\nFounder now says: ${redact(said)}`;
    const turn = await callJson(Turn, { system, user }, { temperature: 0.5, provider: getProvider(), fast: true });

    const did: ("task" | "diary")[] = [];
    if (turn.addTask) {
      await noteToTask(planId, turn.addTask);
      did.push("task");
    }
    if (turn.logDiary) {
      const r = await addDiaryLine(planId, turn.logDiary);
      if (r.ok) did.push("diary");
    }
    return { ok: true, reply: neutralReply(turn.reply, lang), open: turn.open, did };
  } catch {
    return { ok: false };
  }
}
