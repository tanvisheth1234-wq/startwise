// app/api/voice/transcribe/route.ts   OWNER: T1 — fallback when the browser has no Web Speech (e.g. Firefox)
import { NextResponse, type NextRequest } from "next/server";
import { Lang } from "@/contracts/profile";
import { getUser } from "@/lib/auth";
import { ai } from "@/lib/ai";

const MAX_BYTES = 8 * 1024 * 1024; // ~60 s of compressed audio is far below this

export async function POST(request: NextRequest) {
  if (!(await getUser())) return NextResponse.json({ error: "login" }, { status: 401 });

  const form = await request.formData().catch(() => null);
  const audio = form?.get("audio");
  const lang = Lang.safeParse(form?.get("lang"));
  if (!(audio instanceof Blob) || audio.size === 0 || !lang.success) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (audio.size > MAX_BYTES) return NextResponse.json({ error: "too_long" }, { status: 413 });
  if (!audio.type.startsWith("audio/")) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  try {
    const text = await ai.transcribe(audio, lang.data);
    return NextResponse.json({ text });
  } catch {
    return NextResponse.json({ error: "ai" }, { status: 502 });
  }
}
