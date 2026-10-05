// app/plan/[planId]/page.tsx — her plan, kept calm: the next step, her journey and today's 3 things.
// Everything else waits under "More tools". The first visit gets a short guided tour.
import { Suspense } from "react";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ChevronDown, LayoutGrid, Pencil } from "lucide-react";
import { FadeUp, Skeleton } from "@/components/ui";
import { Lang } from "@/contracts/profile";
import { ExploreDoors, JourneyPath, TodayThree } from "@/features/dashboard/components/Home";
import { FirstTour } from "@/features/dashboard/components/FirstTour";
import { NextStepBanner } from "@/features/dashboard/components/NextStep";
import { ReadinessCard } from "@/features/dashboard/components/Readiness";
import { getSection } from "@/features/validate/server/sections";
import { requirePlan } from "@/lib/auth";

export default async function DashboardPage({ params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params;
  const plan = await requirePlan(planId);
  const parsed = Lang.safeParse(await getLocale());
  const lang = parsed.success ? parsed.data : plan.language;
  const t = await getTranslations("dashboard");
  const founder = await getSection<{ name: string }>(plan.id, "founder", "en").catch(() => null);
  const name = founder?.content.name;
  const hour = Number(new Intl.DateTimeFormat("en-IN", { hour: "numeric", hour12: false, timeZone: "Asia/Kolkata" }).format(new Date()));
  const greeting = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";

  return (
    <div className="space-y-5">
      <FadeUp className="flex items-end justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-coral-600">{name ? t(`greetingNamed.${greeting}`, { name }) : t(`greeting.${greeting}`)}</p>
          <h1 className="text-2xl font-extrabold leading-tight text-forest first-letter:uppercase">{plan.profile?.product || plan.title}</h1>
        </div>
        <Link href={`/plan/${plan.id}/profile`} className="flex min-h-11 shrink-0 items-center gap-1 rounded-full px-3 text-sm font-semibold text-muted hover:bg-mint">
          <Pencil className="size-4" aria-hidden />
          {t("editProfile")}
        </Link>
      </FadeUp>

      <FadeUp delay={0.08} data-tour="next">
        <Suspense fallback={<Skeleton className="h-20 w-full rounded-3xl" />}>
          <NextStepBanner planId={plan.id} lang={lang} />
        </Suspense>
      </FadeUp>

      <FadeUp delay={0.16} data-tour="journey">
        <Suspense fallback={<Skeleton className="h-28 w-full rounded-3xl" />}>
          <JourneyPath planId={plan.id} lang={lang} />
        </Suspense>
      </FadeUp>

      <FadeUp delay={0.24}>
        <Suspense fallback={<Skeleton className="h-40 w-full rounded-3xl" />}>
          <TodayThree planId={plan.id} lang={lang} />
        </Suspense>
      </FadeUp>

      {/* Everything else, one tap away but out of the way. */}
      <details className="group rounded-3xl border border-line/70 bg-white/70 shadow-soft">
        <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 px-4">
          <span className="grid size-10 place-items-center rounded-2xl bg-mint text-coral-600">
            <LayoutGrid className="size-5" aria-hidden />
          </span>
          <span className="flex-1">
            <span className="block font-display text-lg font-bold text-forest">{t("moreTools")}</span>
            <span className="block text-xs text-muted">{t("moreToolsSub")}</span>
          </span>
          <ChevronDown className="size-5 text-muted transition-transform group-open:rotate-180" aria-hidden />
        </summary>
        <div className="space-y-5 p-3 pt-0">
          <Suspense fallback={<Skeleton className="h-32 w-full rounded-3xl" />}>
            <ReadinessCard planId={plan.id} lang={lang} />
          </Suspense>
          <ExploreDoors planId={plan.id} />
        </div>
      </details>

      <FirstTour planId={plan.id} />
    </div>
  );
}
