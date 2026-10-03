"use server";
// src/features/intake/actions.ts   OWNER: T1 — Screen 2: idea → draft plan → follow-ups
import { eq } from "drizzle-orm";
import { getLocale } from "next-intl/server";
import { BusinessType, Lang, type BusinessProfile } from "@/contracts/profile";
import { db } from "@/db/client";
import { plans } from "@/db/schema";
import { requirePlan, requireUser } from "@/lib/auth";
import { ai, computeMissingFields, mergeProfile, redact } from "@/lib/ai";
import { applyQuickReply, findQuickReply } from "./lib/quickReplies";
import { loadChat, saveChat, type IntakeChat } from "./server/chat";

export type IntakeState = { planId: string; profile: BusinessProfile; chat: IntakeChat };
export type IntakeResult = { ok: true; state: IntakeState } | { ok: false; error: "empty" | "ai" | "notDraft" };

const MAX_TEXT = 1000;

async function currentLang(): Promise<Lang> {
  const parsed = Lang.safeParse(await getLocale());
  return parsed.success ? parsed.data : "en";
}

function titleOf(p: BusinessProfile): string {
  return [p.product || p.businessType.replace(/_/g, " "), p.city].filter(Boolean).join(" · ").slice(0, 120);
}

async function saveProfile(planId: string, profile: BusinessProfile, userId: string) {
  await db
    .update(plans)
    .set({ profile, title: titleOf(profile), stage: profile.stage, updatedAt: new Date(), updatedBy: userId })
    .where(eq(plans.id, planId));
}

/** Asks the AI for the next question, skipping fields already asked. Never throws: no question = done. */
async function nextStep(profile: BusinessProfile, chat: IntakeChat, lang: Lang): Promise<IntakeChat> {
  if (profile.businessType === "other") return { ...chat, pending: null, done: false }; // UI offers supported types first
  const notAsked = { ...profile, missingFields: profile.missingFields.filter((f) => !chat.asked.includes(f)) };
  try {
    const q = await ai.nextFollowUp(notAsked, lang);
    if (!q) return { ...chat, pending: null, done: true };
    return { ...chat, pending: q, asked: [...chat.asked, q.field], done: false };
  } catch {
    return { ...chat, pending: null, done: true }; // the profile card lets them fill the rest by hand
  }
}

/** Confirmed transcript → parse → draft plan → first follow-up. */
export async function startPlan(text: string): Promise<IntakeResult> {
  const user = await requireUser("/new");
  const idea = text.trim().slice(0, MAX_TEXT);
  if (!idea) return { ok: false, error: "empty" };
  const lang = await currentLang();

  let profile: BusinessProfile;
  let aiFailed = false;
  try {
    profile = await ai.parseIdea(redact(idea), lang);
  } catch {
    // Still create the draft: the founder can fill the profile card by hand.
    profile = mergeProfile(undefined, {}, lang);
    aiFailed = true;
  }

  const [plan] = await db
    .insert(plans)
    .values({
      userId: user.id,
      title: titleOf(profile) || "My business",
      stage: profile.stage,
      ideaText: idea,
      profile,
      language: lang,
      updatedBy: user.id,
    })
    .returning({ id: plans.id });

  let chat: IntakeChat = { messages: [{ role: "user", text: idea }], pending: null, asked: [], done: aiFailed };
  if (!aiFailed) chat = await nextStep(profile, chat, lang);
  await saveChat(plan.id, lang, chat, user.id);
  return { ok: true, state: { planId: plan.id, profile, chat } };
}

/** Loads a draft plan's chat (used after refresh). */
export async function getIntakeState(planId: string): Promise<IntakeState | null> {
  const plan = await requirePlan(planId);
  if (plan.status !== "draft" || !plan.profile) return null;
  return { planId, profile: plan.profile, chat: await loadChat(planId, plan.language) };
}

async function continueChat(
  planId: string,
  userText: string,
  update: (previous: BusinessProfile, question: string, lang: Lang) => Promise<BusinessProfile>,
): Promise<IntakeResult> {
  const user = await requireUser();
  const plan = await requirePlan(planId);
  if (plan.status !== "draft" || !plan.profile) return { ok: false, error: "notDraft" };
  const lang = plan.language;
  const chat = await loadChat(planId, lang);
  const question = chat.pending?.question ?? "";

  let profile: BusinessProfile;
  try {
    profile = await update(plan.profile, question, lang);
  } catch {
    return { ok: false, error: "ai" };
  }
  await saveProfile(planId, profile, user.id);

  const messages = [...chat.messages, ...(question ? [{ role: "bot" as const, text: question }] : []), { role: "user" as const, text: userText }];
  const next = await nextStep(profile, { ...chat, messages, pending: null }, lang);
  await saveChat(planId, lang, next, user.id);
  return { ok: true, state: { planId, profile, chat: next } };
}

/** A typed or spoken answer: the AI extracts it and code merges it. */
export async function answerFollowUp(planId: string, answer: string): Promise<IntakeResult> {
  const text = answer.trim().slice(0, MAX_TEXT);
  if (!text) return { ok: false, error: "empty" };
  return continueChat(planId, text, (previous, question, lang) =>
    ai.parseIdea(redact(question ? `Question: ${question}\nAnswer: ${text}` : text), lang, previous),
  );
}

/** A quick-reply chip: applied by code, no AI call. */
export async function answerQuickReply(planId: string, field: string, chipId: string, label: string): Promise<IntakeResult> {
  const reply = findQuickReply(field, chipId);
  if (!reply) return { ok: false, error: "empty" };
  return continueChat(planId, label.slice(0, 80), async (previous) => {
    const next = applyQuickReply(previous, reply);
    return { ...next, missingFields: computeMissingFields(next) };
  });
}

/** "We support…": the founder picks the closest supported type. */
export async function chooseBusinessType(planId: string, type: string, label: string): Promise<IntakeResult> {
  const parsed = BusinessType.safeParse(type);
  if (!parsed.success || parsed.data === "other") return { ok: false, error: "empty" };
  return continueChat(planId, label.slice(0, 80), async (previous) => ({ ...previous, businessType: parsed.data }));
}

/** Skip: stop asking and go to the profile card. */
export async function skipFollowUps(planId: string): Promise<IntakeResult> {
  const user = await requireUser();
  const plan = await requirePlan(planId);
  if (plan.status !== "draft" || !plan.profile) return { ok: false, error: "notDraft" };
  const chat = await loadChat(planId, plan.language);
  const next = { ...chat, pending: null, done: true };
  await saveChat(planId, plan.language, next, user.id);
  return { ok: true, state: { planId, profile: plan.profile, chat: next } };
}
