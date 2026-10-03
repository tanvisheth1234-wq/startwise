// src/lib/ai/core.ts   OWNER: T1
// All AiApi functions, built on a Provider. No "server-only" here so tests can use a fake provider;
// the app imports `ai` from ./index (server only).
import type { AiApi, DraftKind } from "@/contracts/ai";
import type { BusinessProfile, Lang } from "@/contracts/profile";
import { DRAFT_SCHEMAS } from "@/contracts/sections";
import { callJson } from "./callJson";
import { mergeProfile, nextFollowUpField } from "./profile";
import { draftPrompt, DRAFT_TEMPERATURE } from "./prompts/drafts";
import { followUpPrompt, parseIdeaPrompt } from "./prompts/intake";
import { answerPrompt, explainPrompt } from "./prompts/sources";
import type { Provider } from "./provider";
import { redact, redactDeep } from "./redact";
import { Explanation, ExtractedProfile, FollowUpQuestion, SourceAnswer } from "./schemas";

/** Extraction and explanation stay low; friendly drafts use DRAFT_TEMPERATURE. */
export const TEMP_PRECISE = 0.2;

export function createAi(getProvider: () => Provider): AiApi {
  return {
    async parseIdea(text: string, lang: Lang, previous?: Partial<BusinessProfile>) {
      const extracted = await callJson(ExtractedProfile, parseIdeaPrompt(redact(text), lang, previous), {
        temperature: TEMP_PRECISE,
        provider: getProvider(),
      });
      return mergeProfile(previous, extracted, lang);
    },

    async nextFollowUp(profile: BusinessProfile, lang: Lang) {
      const field = nextFollowUpField(profile); // code decides WHAT to ask
      if (!field) return null;
      const { question } = await callJson(FollowUpQuestion, followUpPrompt(profile, field, lang), {
        temperature: TEMP_PRECISE,
        provider: getProvider(),
      });
      return { field, question }; // the AI only decides HOW to ask
    },

    async explainFromRecord(recordText: string, lang: Lang) {
      const { text } = await callJson(Explanation, explainPrompt(recordText, lang), {
        temperature: TEMP_PRECISE,
        provider: getProvider(),
      });
      return text;
    },

    async answerFromSources(question, chunks, lang) {
      if (chunks.length === 0) return { answer: null };
      const r = await callJson(SourceAnswer, answerPrompt(redact(question), chunks, lang), {
        temperature: TEMP_PRECISE,
        provider: getProvider(),
      });
      // Only keys we actually gave it count; an answer without a real source is treated as "Check locally".
      const known = new Set(chunks.map((c) => c.sourceKey));
      const sourceKeys = [...new Set(r.sourceKeys.filter((k) => known.has(k)))];
      if (!r.answer?.trim() || sourceKeys.length === 0) return { answer: null };
      return { answer: r.answer.trim(), sourceKeys };
    },

    async draft<T>(kind: DraftKind, context: unknown, lang: Lang): Promise<T> {
      const data = await callJson(DRAFT_SCHEMAS[kind], draftPrompt(kind, redactDeep(context), lang), {
        temperature: DRAFT_TEMPERATURE[kind],
        provider: getProvider(),
      });
      return data as T;
    },

    async embed(texts: string[]) {
      return getProvider().embed(texts);
    },

    async transcribe(audio: Blob, lang: Lang) {
      return getProvider().transcribe(audio, lang);
    },
  };
}
