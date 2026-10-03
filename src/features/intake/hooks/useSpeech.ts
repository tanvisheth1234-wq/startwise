"use client";
// src/features/intake/hooks/useSpeech.ts   OWNER: T1 — #1 voice-to-text
// Primary: Web Speech API (live words). Fallback: record with MediaRecorder (max 60 s)
// and POST to /api/voice/transcribe. Typing always works without any of this.
import { useCallback, useEffect, useRef, useState } from "react";
import type { Lang } from "@/contracts/profile";

export type SpeechError = "denied" | "offline" | "nothing" | "noMic" | "unsupported" | "failed";
export type SpeechStatus = "idle" | "listening" | "recording" | "transcribing";

const BCP47: Record<Lang, string> = { en: "en-IN", hi: "hi-IN", mr: "mr-IN" };
const MAX_RECORD_MS = 60_000;

// Minimal Web Speech types (not in TypeScript's DOM lib).
type RecognitionResult = { isFinal: boolean; 0: { transcript: string } };
type RecognitionEvent = { results: ArrayLike<RecognitionResult> };
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};
type RecognitionCtor = new () => Recognition;

function getRecognition(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function mapError(code: string): SpeechError {
  if (code === "not-allowed" || code === "service-not-allowed" || code === "NotAllowedError" || code === "SecurityError") return "denied";
  if (code === "network") return "offline";
  if (code === "no-speech") return "nothing";
  if (code === "audio-capture" || code === "NotFoundError") return "noMic";
  return "failed";
}

/**
 * onText receives the full text each time it changes: what was in the box before you
 * pressed the mic, plus everything heard since (final + live interim words).
 */
export function useSpeech(lang: Lang, onText: (text: string) => void) {
  const [status, setStatus] = useState<SpeechStatus>("idle");
  const [error, setError] = useState<SpeechError | null>(null);
  const [mode, setMode] = useState<"live" | "record" | "none">("none");

  const recognition = useRef<Recognition | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heardSomething = useRef(false);
  const onTextRef = useRef(onText);
  useEffect(() => {
    onTextRef.current = onText;
  }, [onText]);

  useEffect(() => {
    // Decided after mount so server and client render the same markup.
    const id = setTimeout(() => {
      if (getRecognition()) setMode("live");
      else if (typeof MediaRecorder !== "undefined" && typeof navigator.mediaDevices?.getUserMedia === "function") setMode("record");
    }, 0);
    return () => clearTimeout(id);
  }, []);

  const stop = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    recognition.current?.stop();
    if (recorder.current?.state === "recording") recorder.current.stop();
  }, []);

  useEffect(() => () => {
    recognition.current?.abort();
    if (recorder.current?.state === "recording") recorder.current.stop();
  }, []);

  const startLive = useCallback((base: string) => {
    const Ctor = getRecognition()!;
    const rec = new Ctor();
    rec.lang = BCP47[lang];
    rec.continuous = true;
    rec.interimResults = true;
    heardSomething.current = false;
    const prefix = base.trim() ? base.trim() + " " : "";

    rec.onresult = (e) => {
      let finalText = "";
      let interim = "";
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interim += r[0].transcript;
      }
      const heard = (finalText + interim).trim();
      if (heard) heardSomething.current = true;
      onTextRef.current((prefix + heard).trim());
    };
    rec.onerror = (e) => {
      if (e.error !== "aborted") setError(mapError(e.error));
    };
    rec.onend = () => {
      setStatus("idle");
      recognition.current = null;
      if (!heardSomething.current) setError((prev) => prev ?? "nothing");
    };
    recognition.current = rec;
    rec.start();
    setStatus("listening");
  }, [lang]);

  const startRecording = useCallback(async (base: string) => {
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      setError(mapError((e as DOMException).name));
      return;
    }
    const chunks: Blob[] = [];
    const rec = new MediaRecorder(stream);
    rec.ondataavailable = (ev) => ev.data.size > 0 && chunks.push(ev.data);
    rec.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      recorder.current = null;
      const audio = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
      if (audio.size === 0) {
        setStatus("idle");
        setError("nothing");
        return;
      }
      setStatus("transcribing");
      try {
        if (!navigator.onLine) throw new Error("offline");
        const body = new FormData();
        body.append("audio", audio, "idea.webm");
        body.append("lang", lang);
        const res = await fetch("/api/voice/transcribe", { method: "POST", body });
        if (!res.ok) throw new Error(String(res.status));
        const { text } = (await res.json()) as { text: string };
        if (!text.trim()) setError("nothing");
        else onTextRef.current([base.trim(), text.trim()].filter(Boolean).join(" "));
      } catch (e) {
        setError((e as Error).message === "offline" ? "offline" : "failed");
      } finally {
        setStatus("idle");
      }
    };
    recorder.current = rec;
    rec.start();
    setStatus("recording");
    timer.current = setTimeout(() => rec.state === "recording" && rec.stop(), MAX_RECORD_MS);
  }, [lang]);

  const start = useCallback((base: string) => {
    setError(null);
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setError("offline");
      return;
    }
    try {
      if (mode === "live") startLive(base);
      else if (mode === "record") void startRecording(base);
      else setError("unsupported");
    } catch {
      setError("failed");
      setStatus("idle");
    }
  }, [mode, startLive, startRecording]);

  return { status, error, mode, start, stop, clearError: () => setError(null) };
}
