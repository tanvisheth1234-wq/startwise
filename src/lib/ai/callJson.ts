// src/lib/ai/callJson.ts   OWNER: T1
// Ask for JSON → parse → zod check → on failure retry ONCE with the error → else AiInvalidOutput.
import { z } from "zod";
import type { Provider } from "./provider";

export class AiInvalidOutput extends Error {
  constructor(readonly issues: string, readonly raw: string) {
    super(`AI returned invalid output: ${issues}`);
    this.name = "AiInvalidOutput";
  }
}

export type JsonPrompt = { system: string; user: string };
export type CallJsonOptions = { temperature: number; provider: Provider };

/** Strips ```json fences and surrounding prose, then parses. Throws on bad JSON. */
export function parseJsonLoose(raw: string): unknown {
  let s = raw.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  if (!/^[[{]/.test(s)) {
    const start = s.search(/[[{]/);
    if (start >= 0) s = s.slice(start);
  }
  return JSON.parse(s);
}

function check<S extends z.ZodType>(schema: S, raw: string): { ok: true; data: z.infer<S> } | { ok: false; issues: string } {
  let parsed: unknown;
  try {
    parsed = parseJsonLoose(raw);
  } catch (e) {
    return { ok: false, issues: `not valid JSON (${(e as Error).message})` };
  }
  const result = schema.safeParse(parsed);
  if (result.success) return { ok: true, data: result.data };
  return {
    ok: false,
    issues: result.error.issues.slice(0, 8).map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`).join("; "),
  };
}

export async function callJson<S extends z.ZodType>(schema: S, prompt: JsonPrompt, opts: CallJsonOptions): Promise<z.infer<S>> {
  const first = await opts.provider.chat({ ...prompt, temperature: opts.temperature, json: true });
  const a = check(schema, first);
  if (a.ok) return a.data;

  const retryUser =
    `${prompt.user}\n\n---\nYour previous answer was rejected: ${a.issues}.\n` +
    `Previous answer:\n${first.slice(0, 2000)}\n\nReturn ONLY corrected JSON with exactly the requested shape.`;
  const second = await opts.provider.chat({ system: prompt.system, user: retryUser, temperature: opts.temperature, json: true });
  const b = check(schema, second);
  if (b.ok) return b.data;

  throw new AiInvalidOutput(b.issues, second);
}
