// src/lib/ai/provider.ts   OWNER: T1
// The ONLY file that talks to an LLM vendor. Switching providers is a change here only.
// Plain fetch (no SDK) for both Gemini and OpenAI.
import type { Lang } from "@/contracts/profile";

export type ChatOptions = { system: string; user: string; temperature: number; json: boolean };

export interface Provider {
  readonly name: "gemini" | "openai";
  chat(opts: ChatOptions): Promise<string>;
  /** One vector of exactly EMBED_DIMS numbers per text. */
  embed(texts: string[]): Promise<number[][]>;
  transcribe(audio: Blob, lang: Lang): Promise<string>;
}

export type ProviderConfig = {
  name: "gemini" | "openai";
  apiKey: string;
  model?: string;
  embedModel?: string;
  timeoutMs?: number;
};

export const EMBED_DIMS = 768;

export class AiProviderError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "AiProviderError";
  }
}

const LANG_NAME: Record<Lang, string> = { en: "English", hi: "Hindi", mr: "Marathi" };

async function postJson(url: string, body: unknown, headers: Record<string, string>, timeoutMs: number) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) {
    const detail = (await res.text()).slice(0, 300);
    throw new AiProviderError(`AI provider error ${res.status}: ${detail}`, res.status);
  }
  return res.json();
}

async function blobToBase64(blob: Blob): Promise<string> {
  return Buffer.from(await blob.arrayBuffer()).toString("base64");
}

function checkDims(vectors: number[][]): number[][] {
  for (const v of vectors) {
    if (v.length !== EMBED_DIMS) throw new AiProviderError(`Embedding has ${v.length} numbers, expected ${EMBED_DIMS}`);
  }
  return vectors;
}

/** Truncated embeddings must be re-normalised for cosine search to behave. */
function normalise(v: number[]): number[] {
  const n = Math.hypot(...v) || 1;
  return v.map((x) => x / n);
}

// ---------------------------------------------------------------- Gemini
function gemini(cfg: ProviderConfig): Provider {
  const base = "https://generativelanguage.googleapis.com/v1beta";
  const model = cfg.model || "gemini-2.5-flash";
  const embedModel = cfg.embedModel || "gemini-embedding-001";
  const headers = { "x-goog-api-key": cfg.apiKey };
  const timeout = cfg.timeoutMs ?? 30_000;

  type GenResponse = { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const textOf = (r: GenResponse) => (r.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("");

  return {
    name: "gemini",
    async chat({ system, user, temperature, json }) {
      const r: GenResponse = await postJson(
        `${base}/models/${model}:generateContent`,
        {
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts: [{ text: user }] }],
          generationConfig: { temperature, ...(json ? { responseMimeType: "application/json" } : {}) },
        },
        headers,
        timeout,
      );
      return textOf(r);
    },
    async embed(texts) {
      if (texts.length === 0) return [];
      const r: { embeddings?: { values: number[] }[] } = await postJson(
        `${base}/models/${embedModel}:batchEmbedContents`,
        {
          requests: texts.map((text) => ({
            model: `models/${embedModel}`,
            content: { parts: [{ text }] },
            outputDimensionality: EMBED_DIMS,
          })),
        },
        headers,
        timeout,
      );
      return checkDims((r.embeddings ?? []).map((e) => normalise(e.values)));
    },
    async transcribe(audio, lang) {
      const r: GenResponse = await postJson(
        `${base}/models/${model}:generateContent`,
        {
          contents: [{
            role: "user",
            parts: [
              { inlineData: { mimeType: audio.type || "audio/webm", data: await blobToBase64(audio) } },
              { text: `Transcribe this audio exactly as spoken. The speaker most likely uses ${LANG_NAME[lang]} (possibly mixed with English). Write Hindi and Marathi in Devanagari script. Return only the transcript, nothing else. If nothing is said, return an empty string.` },
            ],
          }],
          generationConfig: { temperature: 0 },
        },
        headers,
        60_000,
      );
      return textOf(r).trim();
    },
  };
}

// ---------------------------------------------------------------- OpenAI
function openai(cfg: ProviderConfig): Provider {
  const base = "https://api.openai.com/v1";
  const model = cfg.model || "gpt-4o-mini";
  const embedModel = cfg.embedModel || "text-embedding-3-small";
  const headers = { authorization: `Bearer ${cfg.apiKey}` };
  const timeout = cfg.timeoutMs ?? 30_000;

  return {
    name: "openai",
    async chat({ system, user, temperature, json }) {
      const r: { choices?: { message?: { content?: string } }[] } = await postJson(
        `${base}/chat/completions`,
        {
          model,
          temperature,
          messages: [{ role: "system", content: system }, { role: "user", content: user }],
          ...(json ? { response_format: { type: "json_object" } } : {}),
        },
        headers,
        timeout,
      );
      return r.choices?.[0]?.message?.content ?? "";
    },
    async embed(texts) {
      if (texts.length === 0) return [];
      const r: { data?: { embedding: number[] }[] } = await postJson(
        `${base}/embeddings`,
        { model: embedModel, input: texts, dimensions: EMBED_DIMS },
        headers,
        timeout,
      );
      return checkDims((r.data ?? []).map((d) => d.embedding));
    },
    async transcribe(audio, lang) {
      const form = new FormData();
      form.append("file", audio, "audio.webm");
      form.append("model", "whisper-1");
      form.append("language", lang);
      const res = await fetch(`${base}/audio/transcriptions`, {
        method: "POST",
        headers,
        body: form,
        signal: AbortSignal.timeout(60_000),
      });
      if (!res.ok) throw new AiProviderError(`AI provider error ${res.status}: ${(await res.text()).slice(0, 300)}`, res.status);
      const r: { text?: string } = await res.json();
      return (r.text ?? "").trim();
    },
  };
}

export function createProvider(cfg: ProviderConfig): Provider {
  if (!cfg.apiKey) throw new AiProviderError(`No API key for AI provider "${cfg.name}" (set AI_API_KEY)`);
  return cfg.name === "openai" ? openai(cfg) : gemini(cfg);
}

let cached: Provider | null = null;

/** The provider configured by AI_PROVIDER / AI_API_KEY / AI_MODEL / AI_EMBED_MODEL. */
export function getProvider(): Provider {
  if (!cached) {
    cached = createProvider({
      name: process.env.AI_PROVIDER === "openai" ? "openai" : "gemini",
      apiKey: process.env.AI_API_KEY ?? "",
      model: process.env.AI_MODEL || undefined,
      embedModel: process.env.AI_EMBED_MODEL || undefined,
    });
  }
  return cached;
}
