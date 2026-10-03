// app/plan/[planId]/validate/page.tsx   OWNER: T1 — Screen 5: Validate
import { getLocale, getTranslations } from "next-intl/server";
import { GuidanceFooter } from "@/components/ui";
import { Lang } from "@/contracts/profile";
import type { Assumptions, RiskSnapshot, Templates, TestPlan } from "@/contracts/sections";
import { ValidateView } from "@/features/validate/components/ValidateView";
import { getSection } from "@/features/validate/server/sections";
import { requirePlan } from "@/lib/auth";

export default async function ValidatePage({ params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params;
  const plan = await requirePlan(planId);
  const parsed = Lang.safeParse(await getLocale());
  const lang = parsed.success ? parsed.data : plan.language;
  const t = await getTranslations("validate");

  const [assumptions, risk, testPlan, templates] = await Promise.all([
    getSection<Assumptions>(plan.id, "assumptions", lang),
    getSection<RiskSnapshot>(plan.id, "risk", lang),
    getSection<TestPlan>(plan.id, "test_plan", lang),
    getSection<Templates>(plan.id, "templates", lang),
  ]);

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-forest">{t("title")}</h2>
        <p className="text-sm text-muted">{t("subtitle")}</p>
      </div>
      {/* key: a language switch shows that language's drafts */}
      <ValidateView key={lang} planId={plan.id} initial={{ assumptions, risk, testPlan, templates }} />
      <GuidanceFooter />
    </div>
  );
}
