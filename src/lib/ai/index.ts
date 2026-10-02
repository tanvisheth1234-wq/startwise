// src/lib/ai/index.ts   OWNER: T1 — Phase 0 stub returning fixed values (T1 fills it on Day 1)
import "server-only";
import type { AiApi } from "@/contracts/ai";
import { FIXTURE_DRAFTS, FIXTURE_PROFILE } from "@/fixtures/home-bakery";

export const ai: AiApi = {
  async parseIdea(_text, lang, previous) {
    return { ...FIXTURE_PROFILE, ...previous, language: lang }; // TODO(T1)
  },
  async nextFollowUp(_profile, _lang) {
    return null; // TODO(T1)
  },
  async explainFromRecord(recordText, _lang) {
    return `${recordText} (FIXTURE)`; // TODO(T1)
  },
  async answerFromSources(_question, _chunks, _lang) {
    return { answer: null }; // TODO(T1)
  },
  async draft<T>(kind: Parameters<AiApi["draft"]>[0], _context: unknown, _lang: Parameters<AiApi["draft"]>[2]): Promise<T> {
    return FIXTURE_DRAFTS[kind] as T; // TODO(T1)
  },
  async embed(texts) {
    return texts.map(() => new Array<number>(768).fill(0)); // TODO(T1)
  },
  async transcribe(_audio, _lang) {
    return "I want to start a home bakery in Pune (FIXTURE)"; // TODO(T1)
  },
};
