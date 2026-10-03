"use client";
// OWNER: T1
import { useTranslations } from "next-intl";
import { Loader2, Mic, Square } from "lucide-react";
import { cn } from "@/components/ui";
import type { SpeechError, SpeechStatus } from "../hooks/useSpeech";

export function MicButton({
  status,
  onStart,
  onStop,
  size = "lg",
  disabled,
}: {
  status: SpeechStatus;
  onStart: () => void;
  onStop: () => void;
  size?: "lg" | "sm";
  disabled?: boolean;
}) {
  const t = useTranslations("intake.voice");
  const active = status === "listening" || status === "recording";
  const busy = status === "transcribing";
  const label = busy ? t("transcribing") : active ? t("stop") : t("start");

  return (
    <button
      type="button"
      onClick={active ? onStop : onStart}
      disabled={disabled || busy}
      aria-pressed={active}
      aria-label={label}
      className={cn(
        "relative grid shrink-0 place-items-center rounded-full font-semibold text-white shadow-md transition-colors disabled:opacity-60",
        size === "lg" ? "size-20" : "size-11",
        active ? "bg-danger" : "bg-gold hover:bg-gold/90",
      )}
    >
      {active && <span className="absolute inset-0 animate-ping rounded-full bg-danger/40" aria-hidden />}
      {busy ? (
        <Loader2 className={cn("animate-spin", size === "lg" ? "size-8" : "size-5")} aria-hidden />
      ) : active ? (
        <Square className={size === "lg" ? "size-7" : "size-4"} aria-hidden />
      ) : (
        <Mic className={size === "lg" ? "size-9" : "size-5"} aria-hidden />
      )}
    </button>
  );
}

/** Plain message for each voice problem; always points back to typing. */
export function SpeechErrorNote({ error }: { error: SpeechError | null }) {
  const t = useTranslations("intake.voice.errors");
  if (!error) return null;
  return (
    <p role="alert" className="rounded-lg bg-gold-light/40 p-2 text-sm text-ink">
      {t(error)}
    </p>
  );
}
