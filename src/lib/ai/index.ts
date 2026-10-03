// src/lib/ai/index.ts   OWNER: T1 — the AI layer everyone uses (server only).
// import { ai } from "@/lib/ai"
import "server-only";
import type { AiApi } from "@/contracts/ai";
import { createAi } from "./core";
import { getProvider } from "./provider";

export const ai: AiApi = createAi(getProvider);

// Callers catch AiInvalidOutput and let the user fix the field by hand.
export { AiInvalidOutput } from "./callJson";
export { AiProviderError } from "./provider";
export { redact } from "./redact";
