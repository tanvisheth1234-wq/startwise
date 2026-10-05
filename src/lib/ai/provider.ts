// src/lib/ai/provider.ts   OWNER: T1
// The ONLY file that talks to an LLM vendor. Switching providers is a change here only.
// Plain fetch (no SDK) for both Gemini and OpenAI.
import type { Lang } from "@/contracts/profile";

/** fast: small extraction jobs go to the quicker lite model first. */
export type ChatOptions = { system: string; user: string; temperature: number; json: boolean; fast?: boolean; image?: { mime: string; data: string } };

export interface Provider {
  readonly name: "gemini" | "openai";
  chat(opts: ChatOptions): Promise<string>;
  /** One vector of exactly EMBED_DIMS numbers per text. */
  embed(texts: string[]): Promise<number[][]>;
  transcribe(audio: Blob, lang: Lang): Promise<string>;
  /** Text → spoken audio (WAV), for phones without a Hindi/Marathi voice. */
  speak?(text: string, lang: Lang): Promise<Buffer>;
}

export type ProviderConfig = {
  name: "gemini" | "openai";
  apiKey: string;
  /** Extra keys (other free-tier projects), tried in turn when one is rate-limited. */
  backupKeys?: string[];
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

function transcribePrompt(lang: Lang): string {
  const script = lang === "en"
    ? "If the speaker mixes Hindi or Marathi with English (Hinglish), write it in Roman letters the way people type on WhatsApp, e.g. \"mujhe Pune mein home bakery start karni hai\"."
    : `Write ${LANG_NAME[lang]} words in Devanagari script. Keep English words the speaker uses (like bakery, online, Instagram) in English.`;
  return [
    `Transcribe this voice note exactly as spoken. The speaker is most likely an Indian small-business founder speaking ${LANG_NAME[lang]}, possibly mixed with English.`,
    script,
    "Fix only obvious recognition slips; do not summarise, translate or add anything.",
    "Write amounts like ₹5000 with digits. Keep place names (Pune, Kothrud, Baner) as said.",
    "Return only the transcript. If nothing is said, return an empty string.",
  ].join(" ");
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
const GEMINI_FALLBACKS = ["gemini-flash-lite-latest"];

/** Rate-limited, overloaded or a retired model: worth trying another model. */
const isRetryable = (status?: number) => status === 429 || status === 404 || (status !== undefined && status >= 500);

function gemini(cfg: ProviderConfig): Provider {
  const base = "https://generativelanguage.googleapis.com/v1beta";
  const model = cfg.model || "gemini-flash-latest"; // alias: always the current Flash model
  // Free-tier quota is per model, and models get overloaded: on 429/5xx try the next one.
  const models = [...new Set([model, ...GEMINI_FALLBACKS])];
  const embedModel = cfg.embedModel || "gemini-embedding-001";
  const keys = [...new Set([cfg.apiKey, ...(cfg.backupKeys ?? [])].filter(Boolean))];
  const timeout = cfg.timeoutMs ?? 30_000;
  // Start with the key that last worked, so a rate-limited key is not hammered on every call.
  let preferred = 0;
  const keyOrder = () => keys.map((_, i) => (preferred + i) % keys.length);

  /** Same request with each key in turn; moves on only on rate limits and outages. */
  async function withKeys<T>(call: (headers: Record<string, string>) => Promise<T>): Promise<T> {
    let lastError: unknown;
    for (const i of keyOrder()) {
      try {
        const r = await call({ "x-goog-api-key": keys[i] });
        preferred = i;
        return r;
      } catch (e) {
        lastError = e;
        if (!(e instanceof AiProviderError && isRetryable(e.status))) throw e;
      }
    }
    throw lastError;
  }

  type GenResponse = { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const textOf = (r: GenResponse) => (r.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("");

  async function generate(body: unknown, timeoutMs: number, fast = false): Promise<GenResponse> {
    let lastError: unknown;
    for (const m of fast ? [...models].reverse() : models) {
      try {
        return await withKeys((headers) => postJson(`${base}/models/${m}:generateContent`, body, headers, timeoutMs));
      } catch (e) {
        lastError = e;
        if (!(e instanceof AiProviderError && isRetryable(e.status))) throw e;
      }
    }
    throw lastError;
  }

  return {
    name: "gemini",
    async chat({ system, user, temperature, json, fast, image }) {
      const r = await generate(
        {
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts: [...(image ? [{ inlineData: { mimeType: image.mime, data: image.data } }] : []), { text: user }] }],
          generationConfig: { temperature, ...(json ? { responseMimeType: "application/json" } : {}) },
        },
        timeout,
        fast,
      );
      return textOf(r);
    },
    async embed(texts) {
      if (texts.length === 0) return [];
      const r: { embeddings?: { values: number[] }[] } = await withKeys((headers) => postJson(
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
      ));
      return checkDims((r.embeddings ?? []).map((e) => normalise(e.values)));
    },
    async transcribe(audio, lang) {
      const r = await generate(
        {
          contents: [{
            role: "user",
            parts: [
              { inlineData: { mimeType: audio.type || "audio/webm", data: await blobToBase64(audio) } },
              { text: transcribePrompt(lang) },
            ],
          }],
          generationConfig: { temperature: 0 },
        },
        60_000,
      );
      return textOf(r).trim();
    },
    async speak(text, _lang) {
      const body = {
        // Only the words: TTS models read any instruction text out loud too.
        contents: [{ parts: [{ text }] }],
        generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } } } },
      };
      let lastError: unknown;
      for (const m of TTS_MODELS) {
        try {
          const r: { candidates?: { content?: { parts?: { inlineData?: { mimeType: string; data: string } }[] } }[] } =
            await withKeys((headers) => postJson(`${base}/models/${m}:generateContent`, body, headers, 30_000));
          const audio = r.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData;
          if (!audio) throw new AiProviderError("No audio returned", 502);
          const bytes = Buffer.from(audio.data, "base64");
          if (audio.mimeType.includes("wav")) return bytes;
          const rate = Number(/rate=(\d+)/.exec(audio.mimeType)?.[1] ?? 24000);
          return pcmToWav(bytes, rate);
        } catch (e) {
          lastError = e;
          if (!(e instanceof AiProviderError && (isRetryable(e.status) || e.status === 502))) throw e;
        }
      }
      throw lastError;
    },
  };
}

/** Raw 16-bit PCM (mono) → a playable WAV file. */
export function pcmToWav(pcm: Buffer, sampleRate = 24000): Buffer {
  const h = Buffer.alloc(44);
  h.write("RIFF", 0); h.writeUInt32LE(36 + pcm.length, 4); h.write("WAVE", 8);
  h.write("fmt ", 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(sampleRate, 24); h.writeUInt32LE(sampleRate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
  h.write("data", 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

// Fastest first; all on the free tier.
const TTS_MODELS = ["gemini-3.8-flash-lite-tts", "gemini-3.8-flash-tts", "gemini-2.5-flash-preview-tts"];

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
      backupKeys: [process.env.AI_API_KEY_2, process.env.AI_API_KEY_3].filter((k): k is string => Boolean(k)),
      model: process.env.AI_MODEL || undefined,
      embedModel: process.env.AI_EMBED_MODEL || undefined,
    });
  }
  return cached;
}
