// src/features/intake/server/chat.ts   OWNER: T1
// The follow-up chat is saved in plan_sections (kind "intake") after every step,
// so refreshing mid-chat keeps progress.
import "server-only";
import { and, eq } from "drizzle-orm";
import type { Lang } from "@/contracts/profile";
import { db } from "@/db/client";
import { planSections } from "@/db/schema";

export type ChatMessage = { role: "bot" | "user"; text: string };
export type IntakeChat = {
  messages: ChatMessage[];
  pending: { field: string; question: string } | null;
  asked: string[]; // each field is asked at most once
  done: boolean;
};

export const EMPTY_CHAT: IntakeChat = { messages: [], pending: null, asked: [], done: false };
const KIND = "intake";

export async function loadChat(planId: string, lang: Lang): Promise<IntakeChat> {
  const [row] = await db
    .select({ content: planSections.content })
    .from(planSections)
    .where(and(eq(planSections.planId, planId), eq(planSections.kind, KIND), eq(planSections.language, lang)))
    .limit(1);
  return (row?.content as IntakeChat | undefined) ?? EMPTY_CHAT;
}

export async function saveChat(planId: string, lang: Lang, chat: IntakeChat, userId: string): Promise<void> {
  await db
    .insert(planSections)
    .values({ planId, kind: KIND, language: lang, content: chat, updatedBy: userId })
    .onConflictDoUpdate({
      target: [planSections.planId, planSections.kind, planSections.language],
      set: { content: chat, updatedAt: new Date(), updatedBy: userId },
    });
}
