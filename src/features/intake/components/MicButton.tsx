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
  level = 0,
  disabled,
}: {
  status: SpeechStatus;
  onStart: () => void;
  onStop: () => void;
  size?: "lg" | "sm";
  /** 0–1 sound level: the rings grow with the voice so people can see they are heard. */
  level?: number;
  disabled?: boolean;
}) {
  const t = useTranslations("intake.voice");
  const active = status === "listening" || status === "recording";
  const busy = status === "transcribing";
  const label = busy ? t("transcribing") : active ? t("stop") : t("start");
  const big = size === "lg";

  return (
    <span className={cn("relative inline-grid place-items-center", big ? "size-40" : "size-11")}>
      {big && active && (
        <>
          <span
            className="absolute inset-0 rounded-full bg-coral/15 transition-transform duration-100"
            style={{ transform: `scale(${0.75 + level * 0.5})` }}
            aria-hidden
          />
          <span
            className="absolute inset-4 rounded-full bg-coral/25 transition-transform duration-100"
            style={{ transform: `scale(${0.85 + level * 0.35})` }}
            aria-hidden
          />
        </>
      )}
      <button
        type="button"
        onClick={active ? onStop : onStart}
        disabled={disabled || busy}
        aria-pressed={active}
        aria-label={label}
        className={cn(
          "relative grid shrink-0 place-items-center rounded-full text-white transition-all disabled:opacity-70",
          big ? "size-28 shadow-lift" : "size-11 shadow-soft",
          active ? "bg-gradient-to-br from-berry to-coral-600" : "bg-gradient-to-br from-sun to-coral hover:brightness-105",
          big && !active && !busy && !disabled && "animate-breathe",
        )}
      >
        {busy ? (
          <Loader2 className={cn("animate-spin", big ? "size-10" : "size-5")} aria-hidden />
        ) : active ? (
          <Square className={big ? "size-9 fill-white" : "size-4 fill-white"} aria-hidden />
        ) : (
          <Mic className={big ? "size-12" : "size-5"} aria-hidden />
        )}
      </button>
    </span>
  );
}

/** Plain message for each voice problem; always points back to typing. */
export function SpeechErrorNote({ error }: { error: SpeechError | null }) {
  const t = useTranslations("intake.voice.errors");
  if (!error) return null;
  return (
    <p role="alert" className="animate-rise rounded-2xl bg-sun-light p-3 text-sm text-ink">
      {t(error)}
    </p>
  );
}
