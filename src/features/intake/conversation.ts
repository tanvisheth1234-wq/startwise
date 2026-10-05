"use server";
// src/features/intake/conversation.ts — the first conversation. Warm, one question at a time, never
// cut short. Each turn: the AI reacts, picks up profile details and notes, and asks one thing.
// Code (not the AI) decides when enough is known to offer making the plan.
import { eq } from "drizzle-orm";
import { getLocale } from "next-intl/server";
import { z } from "zod";
import { Lang, type BusinessProfile } from "@/contracts/profile";
import { db } from "@/db/client";
import { plans } from "@/db/schema";
import { requirePlan, requireUser } from "@/lib/auth";
import { callJson } from "@/lib/ai/callJson";
import { mergeProfile } from "@/lib/ai/profile";
import { baseRules, json, LANG_NAME } from "@/lib/ai/prompts/base";
import { getProvider } from "@/lib/ai/provider";
import { redact } from "@/lib/ai/redact";
import { ExtractedProfile } from "@/lib/ai/schemas";
import { getSection, saveSection } from "@/features/validate/server/sections";
import type { Notebook } from "@/features/notebook/actions";
import { loadChat, saveChat, type ChatMessage } from "./server/chat";

export type Asking = "premises" | "locality" | "budgetInr" | null;
export type ConversationState = {
  planId: string;
  messages: ChatMessage[];
  ready: boolean;
  asking: Asking;
  city: string;
  savedNotes: number;
};
type Result = { ok: true; state: ConversationState } | { ok: false; error: "empty" | "ai" };

/** What must be known before offering to make the plan, in the order we'd ask. */
function missingEssentials(p: BusinessProfile): string[] {
  const m: string[] = [];
  // Any kind of business is welcome: knowing WHAT she will offer is enough (the type may be "other").
  if (!p.product) m.push("what she will sell or offer");
  if (!p.city) m.push("which city");
  if (!p.locality) m.push("which neighbourhood/area (locality)");
  if (p.premises === null) m.push("from home or a shop/outlet (premises)");
  if (p.budgetInr === null) m.push("rough starting budget (budgetInr)");
  return m;
}

const Turn = z.object({
  extracted: ExtractedProfile,
  reply: z.string().min(1),
  // Only a hint for the answer chips: anything unexpected just means "no chips", never a failed turn.
  asking: z.preprocess((v) => (["premises", "locality", "budgetInr"].includes(String(v)) ? v : "none"), z.enum(["premises", "locality", "budgetInr", "none"])),
  // Notes are a bonus: accept "text" strings or {text} objects, and never fail the turn over them.
  notes: z.preprocess(
    (v) => (Array.isArray(v) ? v : []).map((n) => (typeof n === "string" ? n : typeof n === "object" && n && "text" in n ? String((n as { text: unknown }).text ?? "") : "")).filter(Boolean).slice(0, 3),
    z.array(z.string()),
  ),
});

async function currentLang(): Promise<Lang> {
  const parsed = Lang.safeParse(await getLocale());
  return parsed.success ? parsed.data : "en";
}

function titleOf(p: BusinessProfile): string {
  // Her product, in her words: the city is shown elsewhere in her language.
  return (p.product || "My business").slice(0, 120);
}

async function runTurn(plan: { id: string; userId: string; language: Lang; profile: BusinessProfile | null }, name: string, text: string): Promise<Result> {
  const lang = plan.language;
  const said = text.trim().slice(0, 1000);
  if (!said) return { ok: false, error: "empty" };
  const previous = plan.profile ?? mergeProfile(undefined, {}, lang);
  const chat = await loadChat(plan.id, lang);

  let turn: z.infer<typeof Turn>;
  try {
    const system = [
      baseRules(lang),
      `You are StartWise, a warm business "saathi" (friend) chatting with ${name || "a first-time founder"} about her business idea. She may only have a small thought, not a plan.`,
      "Reply like a caring elder sister on WhatsApp: 1–3 short sentences. First react SPECIFICALLY to what she just said (encourage, show you understood), then ask exactly ONE simple question. No lists, no jargon, at most one emoji.",
      `Use her name (${name || "none"}) now and then, not every time. Never call her sister/didi/bahen/tai or assume anything about who she is.`,
      "Gender-neutral respectful grammar: Hindi with आप and plural verb forms (आप करेंगे, आप चाहेंगे); Marathi with तुम्ही and plural forms (तुम्ही कराल).",
      "Never promise that money is enough, that it will sell, or that a licence or loan will be approved. Leave numbers for the Money screen.",
      "THINK about HER idea before asking. First work out everything that is obvious and put it in extracted, never ask it: a restaurant, café, outlet, stall, salon or showroom means premises = shop; 'from home', 'ghar se', 'घरून' means home; a city she mentions is her city.",
      "Then ask the ONE question that matters most for THIS particular idea right now, the way an experienced mentor would (e.g. for an unconventional restaurant: the signature dish people will return for, who she pictures eating there, how big she imagines it). Never ask something she already told you or that is obvious from her idea, and never ask a generic question twice.",
      "Your questions should help her SHAPE the idea: each one should make her think and make the idea clearer (what makes it special, the signature product, who exactly it is for, why they would choose her, how big she imagines it). The questions must fit HER kind of business (a tutor, a baker, a candle maker and a restaurant owner each get different questions).",
      "STRICT: while QUESTIONS ABOUT THE IDEA ASKED SO FAR is less than 2, you must NOT ask about location, area, city, budget, money or home/shop. Ask about the idea itself.",
      "Never assume a city, area or any fact she has not said. Pune is only our pilot city, not her city unless she says so.",
      "MISSING lists basics the plan still needs. Only after you have explored the idea, cover them over the conversation, woven in naturally when they fit (e.g. ask the neighbourhood once you are talking about her crowd), not as a checklist and not necessarily in that order.",
      "When MISSING is empty and you have understood what makes her idea special, warmly say you understand it and offer to make her first plan, or to hear more if she wants.",
      "asking: the field your question is about if it is premises, locality or budgetInr; else none.",
      "extracted: profile fields from HER NEW MESSAGE plus anything obvious from it (null if unknown). Rules: ANY food business (home kitchen, tiffin, bakery, sweets, café, restaurant, cloud kitchen, food stall) → home_food; stitching/boutique → tailoring_boutique; reselling online → online_reselling; anything else → other. '30k'/'30 हजार' = 30000; '10 lakh' = 1000000. city and locality in English letters; product and targetCustomer in HER language (never English inside Hindi/Marathi), short. product = a short name for the business as a whole (e.g. 'Mumbai street food restaurant', 'maths tuition for 8th–10th'), never a list of items. targetCustomer = whoever she says will buy (e.g. 'brides-to-be and their mothers').",
      "notes: ONLY a worry she feels, a new idea she has, or a story about a customer (e.g. 'neighbour already orders from me', 'scared people won't pay'), each a short plain string in her words, at most 2. NEVER note plain facts already captured in the profile (her product, city, area, budget, home/shop, target customers). Usually [].",
      'Return JSON: {"extracted":{"stage":null,"businessType":null,"product":null,"city":null,"locality":null,"premises":null,"sellsOnline":null,"targetCustomer":null,"budgetInr":null,"hoursPerDay":null,"expectedMonthlySalesInr":null},"reply":"","asking":"none","notes":["short note in her words"]}',
      `LANGUAGE (most important): write "reply" ONLY in ${LANG_NAME[lang]}, even if the examples above are in another language. She chose this language.`,
    ].join("\n");
    const history = chat.messages.slice(-12).map((m) => `${m.role === "user" ? "Her" : "You"}: ${m.text}`).join("\n");
    const asked = chat.messages.filter((m) => m.role === "bot" && m.text.includes("?")).length;
    const user = `QUESTIONS ABOUT THE IDEA ASKED SO FAR: ${Math.max(0, asked - 3)}
KNOWN SO FAR:\n${json({ product: previous.product, businessType: previous.businessType, city: previous.city, locality: previous.locality, premises: previous.premises, budgetInr: previous.budgetInr, targetCustomer: previous.targetCustomer })}\nMISSING: ${JSON.stringify(missingEssentials(previous))}\n\nCHAT SO FAR:\n${history || "(this is her first message about the idea)"}\n\nShe now says: ${redact(said)}`;
    turn = await callJson(Turn, { system, user }, { temperature: 0.7, provider: getProvider(), fast: true });
  } catch (e) {
    console.error("[conversation] turn failed:", e instanceof Error ? e.message.slice(0, 400) : e);
    return { ok: false, error: "ai" };
  }

  // Once we know WHAT her business is, later details (dishes, designs, prices) must not rename it.
  const extracted = previous.product ? { ...turn.extracted, product: null, businessType: previous.businessType === "other" ? turn.extracted.businessType : null } : turn.extracted;
  const profile = mergeProfile(previous, extracted, lang);
  const ready = missingEssentials(profile).length === 0;
  const messages: ChatMessage[] = [...chat.messages, { role: "user", text: said }, { role: "bot", text: turn.reply }];
  await saveChat(plan.id, lang, { ...chat, messages, pending: null }, plan.userId);
  await db.update(plans).set({ profile, title: titleOf(profile), stage: profile.stage, updatedAt: new Date() }).where(eq(plans.id, plan.id));

  // Worries and ideas she mentions go into her notebook, so nothing she says is lost.
  let savedNotes = 0;
  if (turn.notes.length) {
    const nb = (await getSection<Notebook>(plan.id, "notebook", "en"))?.content ?? { notes: [], shaped: null, shapedAt: null };
    const fresh = turn.notes.map((text) => ({ id: crypto.randomUUID().slice(0, 8), text: text.slice(0, 300), createdAt: new Date().toISOString() }));
    await saveSection(plan.id, "notebook", "en", { ...nb, notes: [...fresh, ...nb.notes] }, true, plan.userId);
    savedNotes = fresh.length;
  }

  const asking: Asking = ready || turn.asking === "none" ? null : turn.asking;
  return { ok: true, state: { planId: plan.id, messages, ready, asking, city: profile.city, savedNotes } };
}

/** First message about the idea: creates her (draft) plan and remembers her name and voice choice. */
export async function startConversation(name: string, voice: "speak" | "text", intro: ChatMessage[], text: string): Promise<Result> {
  const user = await requireUser("/new");
  const lang = await currentLang();
  const cleanName = name.trim().slice(0, 40);
  const [plan] = await db
    .insert(plans)
    .values({ userId: user.id, title: "My business", ideaText: text.trim().slice(0, 1000), profile: mergeProfile(undefined, {}, lang), language: lang, updatedBy: user.id })
    .returning({ id: plans.id, userId: plans.userId, language: plans.language, profile: plans.profile });
  await saveSection(plan.id, "founder", "en", { name: cleanName, voice }, true, user.id);
  // Keep the friendly opening (name, voice choice) as part of the chat history.
  await saveChat(plan.id, lang, { messages: intro.slice(-6).map((m) => ({ role: m.role, text: m.text.slice(0, 300) })), pending: null, asked: [], done: false }, user.id);
  return runTurn(plan, cleanName, text);
}

export async function continueConversation(planId: string, text: string): Promise<Result> {
  await requireUser();
  const plan = await requirePlan(planId);
  const founder = await getSection<{ name: string }>(planId, "founder", "en");
  return runTurn(plan, founder?.content.name ?? "", text);
}

/** "Make my plan": the chat is finished; the plan moves on to "Here's your business". */
export async function finishConversation(planId: string): Promise<{ guest: boolean }> {
  const user = await requireUser();
  const plan = await requirePlan(planId);
  const chat = await loadChat(planId, plan.language);
  await saveChat(planId, plan.language, { ...chat, done: true, pending: null }, user.id);
  return { guest: Boolean(user.isGuest) };
}

export async function loadConversation(planId: string): Promise<{ state: ConversationState; name: string; voice: "speak" | "text" | null } | null> {
  const plan = await requirePlan(planId);
  if (plan.status !== "draft") return null;
  const [chat, founder] = await Promise.all([loadChat(planId, plan.language), getSection<{ name: string; voice: "speak" | "text" }>(planId, "founder", "en")]);
  const profile = plan.profile ?? mergeProfile(undefined, {}, plan.language);
  return {
    state: { planId, messages: chat.messages, ready: missingEssentials(profile).length === 0, asking: null, city: profile.city, savedNotes: 0 },
    name: founder?.content.name ?? "",
    voice: founder?.content.voice ?? null,
  };
}
