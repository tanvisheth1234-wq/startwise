// OWNER: T1 — "Your next step" banner (data from T2's roadmap.getNextStep)
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowRight, PartyPopper } from "lucide-react";
import type { Lang } from "@/contracts/profile";
import { resolvePlanHref } from "../lib/summaries";
import { getNextStep, settle } from "../server/data";

export async function NextStepBanner({ planId, lang }: { planId: string; lang: Lang }) {
  const t = await getTranslations("dashboard.nextStep");
  const r = await settle(getNextStep(planId, lang));

  if (!r.ok) {
    return <p className="rounded-2xl bg-white p-4 text-sm text-danger">{t("error")}</p>;
  }
  if (!r.value) {
    return (
      <div className="flex items-center gap-3 rounded-3xl bg-gradient-to-br from-sage to-teal-600 p-4 text-white shadow-soft">
        <PartyPopper className="size-6 shrink-0 text-sun" aria-hidden />
        <p className="font-semibold">{t("allDone")}</p>
      </div>
    );
  }
  return (
    <Link
      href={resolvePlanHref(planId, r.value.href)}
      className="group flex min-h-20 animate-pop items-center gap-3 rounded-3xl bg-gradient-to-br from-coral via-coral-600 to-berry p-4 text-white shadow-lift"
    >
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold uppercase tracking-widest text-white/80">{t("label")}</p>
        <p className="font-display text-xl font-bold leading-snug">{r.value.title}</p>
      </div>
      <span className="grid size-12 shrink-0 place-items-center rounded-full bg-white text-coral-600 transition-transform group-hover:translate-x-0.5">
        <ArrowRight className="size-5" aria-hidden />
      </span>
    </Link>
  );
}
