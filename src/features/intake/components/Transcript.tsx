"use client";
// OWNER: T1 — the transcript is always an editable box; nothing is analysed until Confirm.
import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui";
import type { Lang } from "@/contracts/profile";
import { useSpeech } from "../hooks/useSpeech";
import { MicButton, SpeechErrorNote } from "./MicButton";

export function Transcript({
  initialText,
  autoListen,
  pending,
  onConfirm,
}: {
  initialText: string;
  autoListen: boolean;
  pending: boolean;
  onConfirm: (text: string) => void;
}) {
  const t = useTranslations("intake");
  const lang = useLocale() as Lang;
  const [text, setText] = useState(initialText);
  const speech = useSpeech(lang, setText);
  const listening = speech.status === "listening" || speech.status === "recording";

  // /new?mode=voice: start listening as soon as we know the browser can.
  const autoStarted = useRef(false);
  const { mode, start } = speech;
  useEffect(() => {
    if (autoListen && !autoStarted.current && mode !== "none") {
      autoStarted.current = true;
      start(initialText);
    }
  }, [autoListen, mode, start, initialText]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-2 py-2">
        <MicButton status={speech.status} onStart={() => speech.start(text)} onStop={speech.stop} disabled={pending} />
        <p className="text-sm font-medium text-muted" aria-live="polite">
          {speech.status === "listening" ? t("voice.listening")
            : speech.status === "recording" ? t("voice.recording")
            : speech.status === "transcribing" ? t("voice.transcribing")
            : t("voice.hint")}
        </p>
      </div>

      <SpeechErrorNote error={speech.error} />

      <label className="block space-y-1">
        <span className="text-sm font-semibold text-forest">{t("transcriptLabel")}</span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          maxLength={1000}
          placeholder={t("transcriptPlaceholder")}
          className="w-full resize-none rounded-xl border border-line bg-white p-3 text-base"
        />
      </label>
      <p className="text-xs text-muted">{t("privacyNote")}</p>

      <Button
        block
        size="lg"
        disabled={!text.trim() || pending || listening}
        onClick={() => onConfirm(text.trim())}
      >
        {pending ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Check className="size-5" aria-hidden />}
        {pending ? t("understanding") : t("confirm")}
      </Button>
    </div>
  );
}
