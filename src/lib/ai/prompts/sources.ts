// src/lib/ai/prompts/sources.ts   OWNER: T1 — explainFromRecord and answerFromSources
import type { Lang } from "@/contracts/profile";
import { baseRules } from "./base";

export function explainPrompt(recordText: string, lang: Lang) {
  const system = [
    baseRules(lang),
    "",
    "TASK: Rephrase ONLY this text simply. Add no facts.",
    "Do not add fees, dates, limits, steps, websites or advice that are not in the text. If the text is short, the answer is short.",
    'Return: { "text": string }',
  ].join("\n");
  return { system, user: `Text to rephrase:\n"""\n${recordText}\n"""` };
}

export function answerPrompt(question: string, chunks: { sourceKey: string; content: string }[], lang: Lang) {
  const system = [
    baseRules(lang),
    "",
    "TASK: Answer ONLY from these chunks; if they do not contain the answer, return {\"answer\": null, \"sourceKeys\": []}.",
    "Do not use outside knowledge, even if you know the answer. Partial or related information is NOT enough: return null.",
    "When you answer, list in sourceKeys the keys of the chunks you used.",
    'Return: { "answer": string | null, "sourceKeys": string[] }',
  ].join("\n");
  const user = [
    "Chunks:",
    ...chunks.map((c, i) => `[${i + 1}] sourceKey=${c.sourceKey}\n"""\n${c.content}\n"""`),
    "",
    `Question: ${question}`,
  ].join("\n");
  return { system, user };
}
