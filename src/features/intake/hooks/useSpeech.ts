"use client";
// src/features/intake/hooks/useSpeech.ts   OWNER: T1 — #1 voice-to-text
// The final words always come from Gemini, which handles Hindi, Marathi and Hinglish far better
// than the browser. On desktop the browser's Web Speech shows words live while Gemini listens to
// a recording of the same speech; on phones (where the two fight over the mic) we only record and
// show a live sound level instead. Typing always works without any of this.
import { useCallback, useEffect, useRef, useState } from "react";
import type { Lang } from "@/contracts/profile";

export type SpeechError = "denied" | "offline" | "nothing" | "noMic" | "unsupported" | "failed";
export type SpeechStatus = "idle" | "listening" | "recording" | "transcribing";

const BCP47: Record<Lang, string> = { en: "en-IN", hi: "hi-IN", mr: "mr-IN" };
const MAX_RECORD_MS = 90_000;

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

const canRecord = () =>
  typeof MediaRecorder !== "undefined" && typeof navigator !== "undefined" && typeof navigator.mediaDevices?.getUserMedia === "function";

const isPhone = () => typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

function mapError(code: string): SpeechError {
  if (code === "not-allowed" || code === "service-not-allowed" || code === "NotAllowedError" || code === "SecurityError") return "denied";
  if (code === "network") return "offline";
  if (code === "no-speech") return "nothing";
  if (code === "audio-capture" || code === "NotFoundError") return "noMic";
  return "failed";
}

async function transcribe(audio: Blob, lang: Lang): Promise<string> {
  if (!navigator.onLine) throw new Error("offline");
  const body = new FormData();
  body.append("audio", audio, "idea.webm");
  body.append("lang", lang);
  const res = await fetch("/api/voice/transcribe", { method: "POST", body });
  if (!res.ok) throw new Error(String(res.status));
  const { text } = (await res.json()) as { text: string };
  return text.trim();
}

/**
 * onText receives the full text each time it changes: what was in the box before you
 * pressed the mic, plus everything heard since. `level` (0–1) drives the sound-level animation.
 */
export function useSpeech(lang: Lang, onText: (text: string) => void) {
  const [status, setStatus] = useState<SpeechStatus>("idle");
  const [error, setError] = useState<SpeechError | null>(null);
  const [mode, setMode] = useState<"live" | "record" | "none">("none");
  const [level, setLevel] = useState(0);

  const recognition = useRef<Recognition | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const raf = useRef<number | null>(null);
  const audioCtx = useRef<AudioContext | null>(null);
  const liveText = useRef("");
  const onTextRef = useRef(onText);
  useEffect(() => {
    onTextRef.current = onText;
  }, [onText]);

  useEffect(() => {
    // Decided after mount so server and client render the same markup.
    const id = setTimeout(() => {
      if (getRecognition() && !isPhone()) setMode("live");
      else if (canRecord()) setMode("record");
      else if (getRecognition()) setMode("live");
    }, 0);
    return () => clearTimeout(id);
  }, []);

  const stopMeter = useCallback(() => {
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = null;
    void audioCtx.current?.close().catch(() => {});
    audioCtx.current = null;
    setLevel(0);
  }, []);

  /** Feeds `level` from the mic so the user can see they are being heard. */
  const startMeter = useCallback((stream: MediaStream) => {
    try {
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const data = new Uint8Array(analyser.fftSize);
      audioCtx.current = ctx;
      const tick = () => {
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (const v of data) sum += (v - 128) ** 2;
        setLevel(Math.min(1, Math.sqrt(sum / data.length) / 40));
        raf.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      // No Web Audio: the animation simply stays calm.
    }
  }, []);

  const stop = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    recognition.current?.stop();
    if (recorder.current?.state === "recording") recorder.current.stop();
  }, []);

  useEffect(() => () => {
    recognition.current?.abort();
    if (recorder.current?.state === "recording") recorder.current.stop();
    stopMeter();
  }, [stopMeter]);

  /** Records the mic; on stop, Gemini's transcript replaces whatever the browser heard live. */
  const startRecorder = useCallback(async (prefix: string, withLive: boolean): Promise<boolean> => {
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch (e) {
      if (!withLive) setError(mapError((e as DOMException).name));
      return false;
    }
    const chunks: Blob[] = [];
    const rec = new MediaRecorder(stream);
    rec.ondataavailable = (ev) => ev.data.size > 0 && chunks.push(ev.data);
    rec.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      stopMeter();
      recorder.current = null;
      recognition.current?.stop();
      const audio = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
      if (audio.size < 2000) {
        setStatus("idle");
        if (!liveText.current) setError("nothing");
        return;
      }
      setStatus("transcribing");
      try {
        const text = await transcribe(audio, lang);
        if (text) onTextRef.current((prefix + text).trim());
        else if (!liveText.current) setError("nothing");
      } catch (e) {
        // Keep what the browser heard live, if anything; otherwise say so kindly.
        if (!liveText.current) setError((e as Error).message === "offline" ? "offline" : "failed");
      } finally {
        setStatus("idle");
      }
    };
    recorder.current = rec;
    rec.start();
    startMeter(stream);
    timer.current = setTimeout(() => rec.state === "recording" && rec.stop(), MAX_RECORD_MS);
    return true;
  }, [lang, startMeter, stopMeter]);

  const startLive = useCallback(async (prefix: string) => {
    const Ctor = getRecognition()!;
    const rec = new Ctor();
    rec.lang = BCP47[lang];
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = (e) => {
      let heard = "";
      for (let i = 0; i < e.results.length; i++) heard += e.results[i][0].transcript;
      liveText.current = heard.trim();
      if (liveText.current) onTextRef.current((prefix + liveText.current).trim());
    };
    rec.onerror = (e) => {
      if (e.error === "aborted" || e.error === "no-speech") return;
      // If the recorder is running, Gemini still gets the audio, so only report hard failures.
      if (!recorder.current || e.error === "not-allowed") setError(mapError(e.error));
    };
    rec.onend = () => {
      recognition.current = null;
      // Browser stopped (silence or error): stop the recording too, which sends it to Gemini.
      if (recorder.current?.state === "recording") recorder.current.stop();
      else {
        setStatus((s) => (s === "transcribing" ? s : "idle"));
        // With a recorder, Gemini may still find words the browser missed, so wait for it.
        if (!liveText.current && !canRecord()) setError((prev) => prev ?? "nothing");
      }
    };
    recognition.current = rec;
    rec.start();
    setStatus("listening");
    if (canRecord()) await startRecorder(prefix, true);
  }, [lang, startRecorder]);

  const start = useCallback((base: string) => {
    setError(null);
    liveText.current = "";
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setError("offline");
      return;
    }
    const prefix = base.trim() ? base.trim() + " " : "";
    try {
      if (mode === "live") void startLive(prefix);
      else if (mode === "record") {
        setStatus("recording");
        void startRecorder(prefix, false).then((ok) => !ok && setStatus("idle"));
      } else setError("unsupported");
    } catch {
      setError("failed");
      setStatus("idle");
    }
  }, [mode, startLive, startRecorder]);

  return { status, error, mode, level, start, stop, clearError: () => setError(null) };
}
