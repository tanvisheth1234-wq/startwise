"use client";
// OWNER: T1 — Screen 1: mic button, idea box and sample chips.
import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowRight, Mic } from "lucide-react";
import { Button } from "@/components/ui";

const SAMPLES = ["bakery", "tailoring", "reselling"] as const;

export function StartForm() {
  const t = useTranslations("start");
  const [text, setText] = useState("");

  return (
    <div className="space-y-4">
      <Link
        href="/new?mode=voice"
        className="flex min-h-16 w-full items-center justify-center gap-3 rounded-2xl bg-gold px-6 text-lg font-bold text-white shadow-md hover:bg-gold/90"
      >
        <span className="grid size-11 place-items-center rounded-full bg-white/20">
          <Mic className="size-6" aria-hidden />
        </span>
        {t("speak")}
      </Link>

      <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-muted">
        <span className="h-px flex-1 bg-line" />
        {t("or")}
        <span className="h-px flex-1 bg-line" />
      </div>

      {/* GET form: /new?text=… — logged-out users are sent to login and come back with the text kept. */}
      <form action="/new" method="get" className="space-y-2">
        <label htmlFor="idea" className="text-sm font-semibold text-forest">
          {t("typeLabel")}
        </label>
        <textarea
          id="idea"
          name="text"
          rows={3}
          required
          maxLength={1000}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("placeholder")}
          className="w-full resize-none rounded-xl border border-line bg-white p-3 text-base"
        />
        <Button type="submit" block size="lg" disabled={!text.trim()}>
          {t("continue")}
          <ArrowRight className="size-5" aria-hidden />
        </Button>
      </form>

      <div className="space-y-2">
        <p className="text-sm text-muted">{t("samplesLabel")}</p>
        <div className="flex flex-wrap gap-2">
          {SAMPLES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setText(t(`samples.${s}.text`))}
              className="min-h-11 rounded-full border border-teal/40 bg-mint px-4 text-sm font-semibold text-teal hover:bg-teal hover:text-white"
            >
              {t(`samples.${s}.chip`)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
