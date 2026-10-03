// src/features/validate/server/sections.ts   OWNER: T1 — plan_sections read/write (one row per plan, kind, language)
import "server-only";
import { and, eq } from "drizzle-orm";
import type { Lang } from "@/contracts/profile";
import { db } from "@/db/client";
import { planSections } from "@/db/schema";

export type Section<T> = { content: T; editedByUser: boolean; updatedAt: string };

export async function getSection<T>(planId: string, kind: string, lang: Lang): Promise<Section<T> | null> {
  const [row] = await db
    .select({ content: planSections.content, editedByUser: planSections.editedByUser, updatedAt: planSections.updatedAt })
    .from(planSections)
    .where(and(eq(planSections.planId, planId), eq(planSections.kind, kind), eq(planSections.language, lang)))
    .limit(1);
  return row ? { content: row.content as T, editedByUser: row.editedByUser, updatedAt: row.updatedAt.toISOString() } : null;
}

export async function saveSection(planId: string, kind: string, lang: Lang, content: unknown, editedByUser: boolean, userId: string) {
  await db
    .insert(planSections)
    .values({ planId, kind, language: lang, content, editedByUser, updatedBy: userId })
    .onConflictDoUpdate({
      target: [planSections.planId, planSections.kind, planSections.language],
      set: { content, editedByUser, updatedAt: new Date(), updatedBy: userId },
    });
}
