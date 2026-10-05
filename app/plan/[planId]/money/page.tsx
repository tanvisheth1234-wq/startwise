// app/plan/[planId]/money/page.tsx — "Will I make money?" Money Lab (#26–#31)
import { getTranslations } from "next-intl/server";
import { MoneyLab } from "@/features/money/components/MoneyLab";
import { ensureMoneyDefaults, loadCostLines, loadInputs } from "@/features/money/server/store";
import { requirePlan } from "@/lib/auth";
import { roadmap } from "@/features/roadmap/api";
import { StepDone } from "@/features/roadmap/components/StepDone";

export default async function MoneyPage({ params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params;
  const plan = await requirePlan(planId);
  const t = await getTranslations("money");
  const type = plan.profile?.businessType ?? "other";
  if (plan.profile) await ensureMoneyDefaults(plan.id, plan.profile, plan.language, plan.userId);
  const ts = await getTranslations("roadmap.stepDone");
  const [lines, inputs, tasks] = await Promise.all([loadCostLines(plan.id), loadInputs(plan.id, type), roadmap.getRoadmap(plan.id, plan.language).catch(() => [])]);
  const stepDone = tasks.some((x) => x.key === "prepare.costs" && x.status === "done");
  // Season 2: once she has sold, the same page holds her first-month check.
  const month = tasks.find((x) => x.key === "improve.review_month");
  const sold = tasks.some((x) => x.key === "pilot.first_orders" && x.status === "done");

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
      <StepDone
        planId={plan.id}
        step="costs"
        initiallyDone={stepDone}
        label={ts("costs.label")}
        doneLabel={ts("costs.done")}
        hint={ts("costs.hint")}
        undo={ts("undo")}
        cheer={ts("costs.cheer")}
      />
      {month && sold && (
        <StepDone
          planId={plan.id}
          step="month"
          initiallyDone={month.status === "done"}
          label={ts("month.label")}
          doneLabel={ts("month.done")}
          hint={ts("month.hint")}
          undo={ts("undo")}
          cheer={ts("month.cheer")}
        />
      )}
    </div>
  );
}
