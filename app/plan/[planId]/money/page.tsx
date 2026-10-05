// app/plan/[planId]/money/page.tsx — "Will I make money?" Money Lab (#26–#31)
import { getTranslations } from "next-intl/server";
import { MoneyLab } from "@/features/money/components/MoneyLab";
import { ensureMoneyDefaults, loadCostLines, loadInputs } from "@/features/money/server/store";
import { requirePlan } from "@/lib/auth";

export default async function MoneyPage({ params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params;
  const plan = await requirePlan(planId);
  const t = await getTranslations("money");
  const type = plan.profile?.businessType ?? "other";
  if (plan.profile) await ensureMoneyDefaults(plan.id, plan.profile, plan.language, plan.userId);
  const [lines, inputs] = await Promise.all([loadCostLines(plan.id), loadInputs(plan.id, type)]);

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-extrabold text-forest">{t("title")}</h1>
        <p className="text-muted">{t("subtitle")}</p>
      </header>
      <MoneyLab
        planId={plan.id}
        initialLines={lines}
        initialPrice={inputs.price}
        initialUnits={inputs.unitsPerMonth}
        budget={plan.profile?.budgetInr ?? null}
        unit={inputs.unit}
        source={inputs.source}
      />
    </div>
  );
}
