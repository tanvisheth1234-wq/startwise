// app/plan/[planId]/funding/page.tsx — "Can I get money help?" scheme matcher (#32–#34)
import { getLocale, getTranslations } from "next-intl/server";
import { ExternalLink, FileText, Heart, Sparkles } from "lucide-react";
import { Badge, GuidanceFooter } from "@/components/ui";
import { Lang } from "@/contracts/profile";
import { funding, getFundingAnswers } from "@/features/funding/api";
import { loadLoanPitch } from "@/features/funding/actions";
import { FundingQuestions } from "@/features/funding/components/FundingQuestions";
import { LoanPitchCard } from "@/features/funding/components/LoanPitchCard";
import { money } from "@/features/money/api";
import { requirePlan } from "@/lib/auth";

const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

export default async function FundingPage({ params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params;
  const plan = await requirePlan(planId);
  const parsed = Lang.safeParse(await getLocale());
  const lang = parsed.success ? parsed.data : plan.language;
  const t = await getTranslations("funding");
  const [matches, answers, summary, pitch] = await Promise.all([
    funding.matchSchemes(planId, lang),
    getFundingAnswers(planId),
    money.getMoneySummary(planId).catch(() => null),
    loadLoanPitch(planId),
  ]);

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-extrabold text-forest">{t("title")}</h1>
        <p className="text-muted">{t("subtitle")}</p>
      </header>

      {summary && (
        <p className={`rounded-3xl p-4 font-semibold ${summary.loanNeed > 0 ? "bg-sun-light text-[#8a5a00]" : "bg-sage-light text-sage"}`}>
          {summary.loanNeed > 0 ? t("needLoan", { amount: inr(summary.loanNeed) }) : t("noLoan")}
        </p>
      )}

      <FundingQuestions planId={planId} answers={answers} />

      <ul className="stagger space-y-3">
        {matches.map((m) => (
          <li
            key={m.schemeKey}
            className={`space-y-3 rounded-3xl border bg-white p-4 shadow-soft ${m.womenFocused ? "border-berry/40 ring-2 ring-berry/15" : "border-line/70"}`}
          >
            <div className="flex flex-wrap items-center gap-1.5">
              {m.womenFocused && (
                <Badge tone="berry">
                  <Heart className="size-3" aria-hidden />
                  {t("forWomen")}
                </Badge>
              )}
              <Badge tone={m.applies === "yes" ? "green" : "sun"}>{m.applies === "yes" ? t("goodMatch") : t("mayMatch")}</Badge>
            </div>
            <div>
              <h2 className="font-display text-lg font-bold leading-snug text-forest">{m.name}</h2>
              <p className="text-xs text-muted">{m.provider}</p>
            </div>
            <p className="font-display text-xl font-bold text-coral-600">{m.benefit}</p>
            <p className="flex gap-2 rounded-2xl bg-mint/70 p-3 text-sm text-forest-700">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-coral" aria-hidden />
              <span>
                <span className="font-semibold">{t("why")} </span>
                {m.whyMatched}
              </span>
            </p>
            <details>
              <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-forest">
                <FileText className="size-4 text-coral" aria-hidden />
                {t("documents", { count: m.documents.length })}
              </summary>
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-ink">
                {m.documents.map((d) => <li key={d}>{d}</li>)}
              </ul>
            </details>
            <a href={m.officialUrl} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center justify-center gap-2 rounded-2xl border-2 border-forest px-4 font-semibold text-forest hover:bg-forest hover:text-white">
              {t("official")}
              <ExternalLink className="size-4" aria-hidden />
            </a>
            <p className="text-center text-xs text-muted">{t("checkLocally")}</p>
          </li>
        ))}
      </ul>
      {matches.length === 0 && <p className="rounded-3xl bg-white p-6 text-center text-muted">{t("none")}</p>}

      <LoanPitchCard planId={planId} initial={pitch} />

      <GuidanceFooter />
    </div>
  );
}
