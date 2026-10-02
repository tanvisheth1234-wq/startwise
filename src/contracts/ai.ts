// src/contracts/ai.ts   (SHARED, frozen) — T1 implements in src/lib/ai/index.ts (server only)
import type { BusinessProfile, Lang } from "./profile";

export type DraftKind = "assumptions" | "risk" | "test_plan" | "templates" | "niches" | "health"
  | "first_customers" | "plan_starter" | "loan_pitch" | "competition_notes";

export interface AiApi {
  parseIdea(text: string, lang: Lang, previous?: Partial<BusinessProfile>): Promise<BusinessProfile>;
  nextFollowUp(profile: BusinessProfile, lang: Lang): Promise<{ field: string; question: string } | null>;
  explainFromRecord(recordText: string, lang: Lang): Promise<string>; // only rephrases the given text
  answerFromSources(question: string, chunks: { sourceKey: string; content: string }[], lang: Lang)
    : Promise<{ answer: string; sourceKeys: string[] } | { answer: null }>; // null → "Check locally"
  draft<T>(kind: DraftKind, context: unknown, lang: Lang): Promise<T>; // returns zod-checked JSON
  embed(texts: string[]): Promise<number[][]>; // 768 numbers each
  transcribe(audio: Blob, lang: Lang): Promise<string>; // voice fallback
}
