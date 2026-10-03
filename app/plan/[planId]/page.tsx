// app/plan/[planId]/page.tsx   OWNER: T1 — Screen 4: plan dashboard
import { Suspense } from "react";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Pencil } from "lucide-react";
import { Skeleton } from "@/components/ui";
import { Lang } from "@/contracts/profile";
import { DueSoonStrip } from "@/features/dashboard/components/DueSoon";
import { ModuleCards } from "@/features/dashboard/components/ModuleCards";
import { NextStepBanner } from "@/features/dashboard/components/NextStep";
import { ReadinessCard } from "@/features/dashboard/components/Readiness";
import { requirePlan } from "@/lib/auth";

export default async function DashboardPage({ params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params;
  const plan = await requirePlan(planId);
  const parsed = Lang.safeParse(await getLocale());
  const lang = parsed.success ? parsed.data : plan.language;
  const t = await getTranslations("dashboard");

  return (
    <div className="space-y-4">
      {/* One clear next step, first thing on the screen. */}
      <Suspense fallback={<Skeleton className="h-20 w-full rounded-2xl" />}>
        <NextStepBanner planId={plan.id} lang={lang} />
      </Suspense>

      <Suspense fallback={<Skeleton className="h-32 w-full rounded-2xl" />}>
        <ReadinessCard planId={plan.id} lang={lang} />
      </Suspense>

      <Suspense fallback={null}>
        <DueSoonStrip planId={plan.id} lang={lang} />
      </Suspense>

      <div className="flex items-center justify-between pt-1">
        <h2 className="text-lg font-semibold text-forest">{t("modulesTitle")}</h2>
        <Link href={`/plan/${plan.id}/profile`} className="flex min-h-11 items-center gap-1 text-sm font-semibold text-teal hover:underline">
          <Pencil className="size-4" aria-hidden />
          {t("editProfile")}
        </Link>
      </div>
      <ModuleCards planId={plan.id} lang={lang} />
    </div>
  );
}
