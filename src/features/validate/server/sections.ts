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


/**
 * A section in the language she is using now, or else the copy she made in another language
 * (so switching language never hides her plan or makes her start again). Returns where it lives.
 */
export async function getSectionAnyLang<T>(planId: string, kind: string, preferred: Lang): Promise<{ section: Section<T>; lang: Lang } | null> {
  for (const lang of [preferred, ...(["en", "hi", "mr"] as const).filter((l) => l !== preferred)]) {
    const section = await getSection<T>(planId, kind, lang);
    if (section) return { section, lang };
  }
  return null;
}
