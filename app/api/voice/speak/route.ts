// app/api/voice/speak/route.ts — text → spoken WAV (Gemini TTS), for phones with no Hindi/Marathi voice.
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { Lang } from "@/contracts/profile";
import { getUser } from "@/lib/auth";
import { getProvider } from "@/lib/ai/provider";

const Body = z.object({ text: z.string().trim().min(1).max(600), lang: Lang });

// Recently spoken lines (greetings, repeated phrases) play instantly the second time.
const cache = new Map<string, Buffer>();
const CACHE_MAX = 200;

export async function POST(request: NextRequest) {
  if (!(await getUser())) return NextResponse.json({ error: "login" }, { status: 401 });
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const provider = getProvider();
  if (!provider.speak) return NextResponse.json({ error: "unsupported" }, { status: 501 });
  try {
    const key = `${parsed.data.lang}|${parsed.data.text}`;
    let wav = cache.get(key);
    if (!wav) {
      wav = await provider.speak(parsed.data.text, parsed.data.lang);
      if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value!);
      cache.set(key, wav);
    }
    return new NextResponse(new Uint8Array(wav), { headers: { "content-type": "audio/wav", "cache-control": "private, max-age=3600" } });
  } catch {
    return NextResponse.json({ error: "ai" }, { status: 502 });
  }
}
