// OWNER: T1 — "Your next step" banner (data from T2's roadmap.getNextStep)
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowRight, PartyPopper } from "lucide-react";
import type { Lang } from "@/contracts/profile";
import { resolvePlanHref } from "../lib/summaries";
import { getNextStep, settle } from "../server/data";
import { taskHref } from "@/features/roadmap/api";
import { growGoals, planFocus } from "./Home";

export async function NextStepBanner({ planId, lang }: { planId: string; lang: Lang }) {
  const t = await getTranslations("dashboard.nextStep");
  const tj = await getTranslations("dashboard.journey");
  const [r, f] = await Promise.all([settle(getNextStep(planId, lang)), planFocus(planId, lang).catch(() => null)]);
  const stations = f?.stations ?? [];
  // Follow the plant: the next task of the step that is pulsing; otherwise the roadmap's own next step.
  const step = f?.next ? { title: f.next.title, href: taskHref(f.next.key) } : r.ok ? r.value : null;

  if (!r.ok) {
    return <p className="rounded-2xl bg-white p-4 text-sm text-danger">{t("error")}</p>;
  }
  // Season 2: after her first sale there is no dead end; the bar points at the next growth goal.
  if (f && f.currentIdx === -1) {
    const tg = await getTranslations("dashboard.grow");
    const goals = await growGoals(planId, lang);
    const goal = goals.find((g) => !g.done);
    if (!goal) {
      return (
        <div className="flex items-center gap-3 rounded-3xl bg-gradient-to-br from-sage to-teal-600 p-4 text-white shadow-soft">
          <PartyPopper className="size-6 shrink-0 text-sun" aria-hidden />
          <p className="font-semibold">{tg("allDone")}</p>
        </div>
      );
    }
    return (
      <Link href={goal.href} className="group flex min-h-20 animate-pop items-center gap-3 rounded-3xl bg-gradient-to-br from-sage via-teal-600 to-sky p-4 text-white shadow-lift">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-widest text-white/80">{tg("seasonDone")}</p>
          <p className="font-display text-xl font-bold leading-snug">{tg("next", { goal: tg(`goals.${goal.key}`) })}</p>
          <p className="mt-1 text-sm font-semibold text-white/85">{tg("title")}</p>
        </div>
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-white text-sage transition-transform group-hover:translate-x-0.5">
          <ArrowRight className="size-5" aria-hidden />
        </span>
      </Link>
    );
  }

  if (!step) {
    return (
      <div className="flex items-center gap-3 rounded-3xl bg-gradient-to-br from-sage to-teal-600 p-4 text-white shadow-soft">
        <PartyPopper className="size-6 shrink-0 text-sun" aria-hidden />
        <p className="font-semibold">{t("allDone")}</p>
      </div>
    );
  }
  // Tie the banner to the plant: "Step 2 of 5 on your plant: Costs".
  const href = resolvePlanHref(planId, step.href);
  const at = f?.next ? f.currentIdx : stations.findIndex((s) => href.split(/[?#]/)[0] === s.href && !s.done);
  return (
    <Link
      href={href}
      className="group flex min-h-20 animate-pop items-center gap-3 rounded-3xl bg-gradient-to-br from-coral via-coral-600 to-berry p-4 text-white shadow-lift"
    >
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold uppercase tracking-widest text-white/80">{t("label")}</p>
        <p className="font-display text-xl font-bold leading-snug">{step.title}</p>
        {at >= 0 && <p className="mt-1 text-sm font-semibold text-white/85">{t("onPlant", { n: at + 1, total: stations.length, station: tj(`stations.${stations[at].key}`) })}</p>}
      </div>
      <span className="grid size-12 shrink-0 place-items-center rounded-full bg-white text-coral-600 transition-transform group-hover:translate-x-0.5">
        <ArrowRight className="size-5" aria-hidden />
      </span>
    </Link>
  );
}
