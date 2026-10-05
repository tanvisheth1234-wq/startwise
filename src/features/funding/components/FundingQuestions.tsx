"use client";
// Two optional taps that sharpen the scheme matches. Nothing else is asked.
import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/components/ui";
import type { FundingAnswers } from "@/contracts/funding";
import { saveFundingAnswers } from "../actions";

export function FundingQuestions({ planId, answers }: { planId: string; answers: FundingAnswers }) {
  const t = useTranslations("funding.questions");
  const [pending, start] = useTransition();

  const chip = (on: boolean, label: string, onClick: () => void) => (
    <button
      type="button"
      disabled={pending}
      onClick={onClick}
      aria-pressed={on}
      className={cn(
        "min-h-11 rounded-full border-2 px-4 text-sm font-semibold transition-colors",
        on ? "border-coral bg-coral text-white" : "border-line bg-white text-forest hover:border-coral/50",
      )}
    >
      {label}
    </button>
  );

  return (
    <section className="space-y-3 rounded-3xl border border-line/70 bg-white p-4 shadow-soft">
      <p className="text-sm text-muted">{t("intro")}</p>
      <div className="space-y-2">
        <p className="font-semibold text-forest">{t("woman")}</p>
        <div className="flex flex-wrap gap-2">
          {chip(answers.founderIsWoman === true, t("yes"), () => start(() => saveFundingAnswers(planId, { founderIsWoman: true })))}
          {chip(answers.founderIsWoman === false, t("no"), () => start(() => saveFundingAnswers(planId, { founderIsWoman: false })))}
        </div>
      </div>
      <div className="space-y-2">
        <p className="font-semibold text-forest">{t("age")}</p>
        <div className="flex flex-wrap gap-2">
          {(["18-35", "36-50", "51+"] as const).map((band) =>
            <span key={band}>{chip(answers.ageBand === band, band, () => start(() => saveFundingAnswers(planId, { ageBand: band })))}</span>,
          )}
        </div>
      </div>
    </section>
  );
}
