"use client";
// Read-aloud (#8): the browser reads the text in Hindi, Marathi or English. If the phone has no
// voice for that language, the button is hidden rather than reading badly.
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Square, Volume2 } from "lucide-react";
import type { Lang } from "@/contracts/profile";
import { cn } from "@/components/ui";
import { forSpeech } from "@/features/talk/hooks/useSpeaker";

export type ReadAloudProps = { text: string; lang: Lang; className?: string };

const PREFIX: Record<Lang, string> = { en: "en", hi: "hi", mr: "mr" };

function pickVoice(lang: Lang): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  const want = PREFIX[lang];
  return (
    voices.find((v) => v.lang.toLowerCase() === `${want}-in`) ??
    voices.find((v) => v.lang.toLowerCase().startsWith(want)) ??
    null
  );
}

export function ReadAloud({ text, lang, className }: ReadAloudProps) {
  const t = useTranslations("common");
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const update = () => setVoice(pickVoice(lang));
    update();
    window.speechSynthesis.addEventListener("voiceschanged", update);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", update);
      window.speechSynthesis.cancel();
    };
  }, [lang]);

  if (!voice || !text.trim()) return null;

  const toggle = () => {
    const synth = window.speechSynthesis;
    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }
    synth.cancel();
    const u = new SpeechSynthesisUtterance(forSpeech(text));
    u.voice = voice;
    u.lang = voice.lang;
    u.rate = 0.95;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    synth.speak(u);
    setSpeaking(true);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={speaking}
      className={cn(
        "inline-flex min-h-10 items-center gap-1.5 rounded-full border-2 px-3 text-sm font-semibold transition-colors",
        speaking ? "border-coral bg-coral text-white" : "border-line bg-white text-forest hover:border-coral/50",
        className,
      )}
    >
      {speaking ? <Square className="size-3.5 fill-current" aria-hidden /> : <Volume2 className="size-4" aria-hidden />}
      {speaking ? t("readAloud.stop") : t("readAloud.listen")}
    </button>
  );
}
