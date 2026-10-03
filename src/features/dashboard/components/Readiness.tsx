// OWNER: T1 — readiness ring + blockers (data from T2's readiness.getReadiness)
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui";
import type { Lang } from "@/contracts/profile";
import { clampScore, resolvePlanHref } from "../lib/summaries";
import { getReadiness, settle } from "../server/data";

function Ring({ score, label }: { score: number; label: string }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 80 80" className="size-24 shrink-0" role="img" aria-label={label}>
      <circle cx="40" cy="40" r={r} fill="none" stroke="var(--color-mint)" strokeWidth="9" />
      <circle
        cx="40" cy="40" r={r} fill="none" stroke="var(--color-gold)" strokeWidth="9" strokeLinecap="round"
        strokeDasharray={`${(score / 100) * c} ${c}`} transform="rotate(-90 40 40)"
      />
      <text x="40" y="45" textAnchor="middle" className="fill-forest text-[18px] font-bold">{score}</text>
    </svg>
  );
}

export async function ReadinessCard({ planId, lang }: { planId: string; lang: Lang }) {
  const t = await getTranslations("dashboard.readiness");
  const r = await settle(getReadiness(planId, lang));
  if (!r.ok) return <Card className="text-sm text-danger">{t("error")}</Card>;

  const score = clampScore(r.value.score);
  const blockers = r.value.blockers.slice(0, 3);
  return (
    <Card className="flex items-start gap-4">
      <Ring score={score} label={t("aria", { score })} />
      <div className="min-w-0 flex-1 space-y-2">
        <h2 className="font-semibold text-forest">{t("title")}</h2>
        {blockers.length === 0 ? (
          <p className="text-sm text-muted">{t("noBlockers")}</p>
        ) : (
          <ul className="space-y-1">
            {blockers.map((b) => (
              <li key={b.label + b.href}>
                <Link href={resolvePlanHref(planId, b.href)} className="flex min-h-11 items-center gap-2 text-sm text-ink hover:text-forest">
                  <AlertTriangle className="size-4 shrink-0 text-gold" aria-hidden />
                  <span className="flex-1">{b.label}</span>
                  <ChevronRight className="size-4 shrink-0 text-muted" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
