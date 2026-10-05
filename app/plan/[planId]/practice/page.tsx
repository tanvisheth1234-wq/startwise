// app/plan/[planId]/practice/page.tsx — Practice room: rehearse real conversations out loud
import { getTranslations } from "next-intl/server";
import { PracticeRoom } from "@/features/practice/components/PracticeRoom";
import { requirePlan } from "@/lib/auth";

export default async function PracticePage({ params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params;
  await requirePlan(planId);
  const t = await getTranslations("practice");
  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-extrabold text-forest">{t("title")}</h1>
        <p className="text-muted">{t("subtitle")}</p>
      </header>
      <PracticeRoom planId={planId} />
    </div>
  );
}
