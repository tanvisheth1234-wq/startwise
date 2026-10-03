// src/features/dashboard/server/data.ts   OWNER: T1
// One fetch per module per request (several cards share the roadmap), all through public api.ts doors.
import "server-only";
import { cache } from "react";
import type { Lang } from "@/contracts/profile";
import { compliance } from "@/features/compliance/api";
import { funding } from "@/features/funding/api";
import { money } from "@/features/money/api";
import { readiness } from "@/features/readiness/api";
import { roadmap } from "@/features/roadmap/api";
import { validate } from "@/features/validate/api";

export const getRoadmap = cache((planId: string, lang: Lang) => roadmap.getRoadmap(planId, lang));
export const getNextStep = cache((planId: string, lang: Lang) => roadmap.getNextStep(planId, lang));
export const getReadiness = cache((planId: string, lang: Lang) => readiness.getReadiness(planId, lang));
export const getChecklist = cache((planId: string, lang: Lang) => compliance.getChecklist(planId, lang));
export const getMoney = cache((planId: string) => money.getMoneySummary(planId));
export const getSchemes = cache((planId: string, lang: Lang) => funding.matchSchemes(planId, lang));
export const getValidation = cache((planId: string) => validate.getValidationStatus(planId));

/** Runs a loader; a failing module becomes { ok: false } so only its card shows an error. */
export async function settle<T>(p: Promise<T>): Promise<{ ok: true; value: T } | { ok: false }> {
  try {
    return { ok: true, value: await p };
  } catch (e) {
    console.error("[dashboard] module failed:", e);
    return { ok: false };
  }
}
