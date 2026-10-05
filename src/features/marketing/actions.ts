"use server";
// src/features/marketing/actions.ts — Marketing Buddy: a weekly posting plan with captions, times,
// calendar reminders and local partnership ideas. The AI drafts; the founder copies and posts.
import { revalidatePath } from "next/cache";
import { requirePlan, requireUser } from "@/lib/auth";
import { draftMarketingPlan, suggestNames, type MarketingPlan, type NameIdeas } from "@/lib/ai/extras";
import { mergeProfile } from "@/lib/ai/profile";
import { getSection, saveSection } from "@/features/validate/server/sections";
import { todayInIndia } from "@/features/validate/lib/testPlan";

export type CaptionLang = "english" | "hinglish" | "hindi" | "marathi";
export type MarketingState = { plan: MarketingPlan; captionLang: CaptionLang; createdAt: string; posted: number[] };

const CAPTION_LANG: Record<CaptionLang, string> = {
  english: "simple English",
  hinglish: "Hinglish (Hindi in Roman letters mixed with English, the way people text on WhatsApp)",
  hindi: "Hindi (Devanagari script)",
  marathi: "Marathi (Devanagari script)",
};

export async function loadMarketing(planId: string): Promise<MarketingState | null> {
  const plan = await requirePlan(planId);
  return (await getSection<MarketingState>(planId, "marketing", plan.language))?.content ?? null;
}

export async function generateMarketing(planId: string, captionLang: CaptionLang): Promise<{ ok: true; state: MarketingState } | { ok: false }> {
  const user = await requireUser();
  const plan = await requirePlan(planId);
  try {
    const profile = plan.profile ?? mergeProfile(undefined, {}, plan.language);
    const draft = await draftMarketingPlan(profile, plan.language, todayInIndia(), CAPTION_LANG[captionLang] ?? CAPTION_LANG.english);
    const order = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    draft.posts.sort((a, b) => order.indexOf(a.day) - order.indexOf(b.day) || a.time.localeCompare(b.time));
    const state: MarketingState = { plan: draft, captionLang, createdAt: new Date().toISOString(), posted: [] };
    await saveSection(planId, "marketing", plan.language, state, false, user.id);
    revalidatePath(`/plan/${planId}/marketing`);
    return { ok: true, state };
  } catch {
    return { ok: false };
  }
}

export async function markPosted(planId: string, index: number, posted: boolean): Promise<void> {
  const user = await requireUser();
  const plan = await requirePlan(planId);
  const s = await loadMarketing(planId);
  if (!s) return;
  const set = new Set(s.posted);
  if (posted) set.add(index);
  else set.delete(index);
  await saveSection(planId, "marketing", plan.language, { ...s, posted: [...set] }, true, user.id);
}

export async function generateNames(planId: string): Promise<{ ok: true; ideas: NameIdeas } | { ok: false }> {
  const user = await requireUser();
  const plan = await requirePlan(planId);
  try {
    const profile = plan.profile ?? mergeProfile(undefined, {}, plan.language);
    const ideas = await suggestNames(profile, plan.language);
    await saveSection(planId, "names", plan.language, ideas, false, user.id);
    return { ok: true, ideas };
  } catch {
    return { ok: false };
  }
}

export async function loadNames(planId: string): Promise<NameIdeas | null> {
  const plan = await requirePlan(planId);
  return (await getSection<NameIdeas>(planId, "names", plan.language))?.content ?? null;
}
