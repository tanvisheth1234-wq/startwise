"use client";
// Speaks text out loud: the phone's own voice when it has one for the language (instant),
// otherwise Gemini's voice from /api/voice/speak (a few seconds, but always Hindi/Marathi-capable).
import { useCallback, useEffect, useRef, useState } from "react";
import type { Lang } from "@/contracts/profile";

function browserVoice(lang: Lang): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  return voices.find((v) => v.lang.toLowerCase() === `${lang}-in`) ?? voices.find((v) => v.lang.toLowerCase().startsWith(lang)) ?? null;
}

/** Emojis are for the eyes: the voice would read 🎂 as "birthday cake", so drop them before speaking. */
export function forSpeech(text: string): string {
  return text
    .replace(/[\p{Extended_Pictographic}\p{Regional_Indicator}\u{FE0F}\u{200D}\u{20E3}\u{1F3FB}-\u{1F3FF}]/gu, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** Splits a reply into sentences (English . ! ? and Hindi/Marathi ।), merging very short ones. */
export function sentences(text: string): string[] {
  const parts = text.split(/(?<=[.!?।])\s+/).map((p) => p.trim()).filter(Boolean);
  const out: string[] = [];
  for (const p of parts) {
    if (out.length && out[out.length - 1].length < 25) out[out.length - 1] += " " + p;
    else out.push(p);
  }
  return out.length ? out : [text];
}

export function useSpeaker(lang: Lang) {
  const [speaking, setSpeaking] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);
  const runId = useRef(0);

  useEffect(() => {
    // Some browsers load voices lazily; touching the list starts that.
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.getVoices();
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
      audio.current?.pause();
    };
  }, []);

  const stop = useCallback(() => {
    runId.current++; // cancels any sentences still queued
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    audio.current?.pause();
    setSpeaking(false);
  }, []);

  /** Resolves when speaking ends (or fails), so a hands-free loop can listen again. */
  const speak = useCallback(
    (raw: string) =>
      new Promise<void>((resolve) => {
        const text = forSpeech(raw);
        const done = () => {
          setSpeaking(false);
          resolve();
        };
        setSpeaking(true);
        const voice = browserVoice(lang);
        if (voice) {
          const u = new SpeechSynthesisUtterance(text);
          u.voice = voice;
          u.lang = voice.lang;
          u.rate = 0.98;
          u.onend = done;
          u.onerror = done;
          window.speechSynthesis.cancel();
          window.speechSynthesis.speak(u);
          return;
        }
        // No phone voice for this language: Gemini speaks it. Ask for every sentence at once and play
        // them in order, so the first (short) sentence starts in ~2 s instead of waiting for the whole reply.
        const run = ++runId.current;
        const pieces = sentences(text);
        const clips = pieces.map((piece) =>
          fetch("/api/voice/speak", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: piece, lang }) })
            .then((r) => (r.ok ? r.blob() : null))
            .catch(() => null),
        );
        (async () => {
          for (const clip of clips) {
            const blob = await clip;
            if (run !== runId.current) return; // stopped or replaced by a newer reply
            if (!blob) continue;
            await new Promise<void>((next) => {
              const a = new Audio(URL.createObjectURL(blob));
              audio.current = a;
              a.onended = () => next();
              a.onerror = () => next();
              a.play().catch(() => next());
            });
          }
        })().finally(() => {
          if (run === runId.current) done();
          else resolve();
        });
      }),
    [lang],
  );

  return { speak, stop, speaking };
}
