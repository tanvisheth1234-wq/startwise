"use server";
// src/features/notebook/worry.ts — the Worry Box: a fear in, calm words and one small step out.
import { requirePlan } from "@/lib/auth";
import { answerWorry, type WorryReply } from "@/lib/ai/extras";
import { mergeProfile } from "@/lib/ai/profile";

export async function askWorry(planId: string, worry: string): Promise<{ ok: true; reply: WorryReply } | { ok: false }> {
  const plan = await requirePlan(planId);
  const text = worry.trim();
  if (!text) return { ok: false };
  try {
    const profile = plan.profile ?? mergeProfile(undefined, {}, plan.language);
    return { ok: true, reply: await answerWorry(text, profile, plan.language) };
  } catch {
    return { ok: false };
  }
}
