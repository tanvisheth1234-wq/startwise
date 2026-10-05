"use client";
// Bank loan pitch (#35): a one-page pitch from the founder's own numbers, ready to read to a bank officer.
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Check, Copy, Landmark, Loader2 } from "lucide-react";
import { Button, GrowingWait } from "@/components/ui";
import type { LoanPitch } from "@/contracts/sections";
import { makeLoanPitch } from "../actions";

export function LoanPitchCard({ planId, initial }: { planId: string; initial: LoanPitch | null }) {
  const t = useTranslations("funding.pitch");
  const [pitch, setPitch] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  const text = pitch ? [pitch.summary, ...pitch.keyPoints.map((k) => `• ${k}`), pitch.askText].join("\n\n") : "";

  return (
    <section className="space-y-3 rounded-[2rem] bg-gradient-to-br from-sky-light to-mint p-4">
      <h2 className="flex items-center gap-2 font-display text-xl font-bold text-forest">
        <Landmark className="size-6 text-sky" aria-hidden />
        {t("title")}
      </h2>
      <p className="text-sm text-forest-700">{t("subtitle")}</p>
      {pitch && (
        <div className="animate-rise space-y-3 rounded-3xl bg-white p-4 shadow-soft">
          <p className="text-ink">{pitch.summary}</p>
          <ul className="space-y-1.5">
            {pitch.keyPoints.map((k) => (
              <li key={k} className="flex gap-2 text-sm text-ink">
                <Check className="mt-0.5 size-4 shrink-0 text-sage" aria-hidden />
                {k}
              </li>
            ))}
          </ul>
          <p className="rounded-2xl bg-mint p-3 font-semibold text-forest">{pitch.askText}</p>
          <button
            type="button"
            onClick={async () => {
              await navigator.clipboard.writeText(text).catch(() => {});
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border-2 border-line font-semibold text-forest"
          >
            {copied ? <Check className="size-4 text-sage" aria-hidden /> : <Copy className="size-4" aria-hidden />}
            {copied ? t("copied") : t("copy")}
          </button>
          <p className="text-xs text-muted">{t("note")}</p>
        </div>
      )}
      <Button
        block
        variant={pitch ? "secondary" : "primary"}
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError(null);
            const r = await makeLoanPitch(planId);
            if (r.ok) setPitch(r.pitch);
            else setError(t(`errors.${r.error}`));
          })
        }
      >
        {pending && <Loader2 className="size-5 animate-spin" aria-hidden />}
        {pending ? t("making") : pitch ? t("remake") : t("make")}
      </Button>
      {pending && <GrowingWait message={t("making")} />}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </section>
  );
}
