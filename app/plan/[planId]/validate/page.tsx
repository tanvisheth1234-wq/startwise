// app/plan/[planId]/validate/page.tsx   OWNER: T1 — Screen 5: Validate
import { getLocale, getTranslations } from "next-intl/server";
import { GuidanceFooter } from "@/components/ui";
import { Lang } from "@/contracts/profile";
import type { Assumptions, RiskSnapshot, Templates, TestPlan } from "@/contracts/sections";
import { SprintTracker } from "@/features/validate/components/SprintTracker";
import { ValidateView } from "@/features/validate/components/ValidateView";
import { sprintState } from "@/features/validate/server/results";
import { getSection, getSectionAnyLang } from "@/features/validate/server/sections";
import { requirePlan } from "@/lib/auth";

export default async function ValidatePage({ params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params;
  const plan = await requirePlan(planId);
  const parsed = Lang.safeParse(await getLocale());
  const lang = parsed.success ? parsed.data : plan.language;
  const t = await getTranslations("validate");
  const ts = await getTranslations("dashboard.share");

  const [sprint, assumptions, risk, testPlan, templates] = await Promise.all([
    sprintState(plan.id, lang), // same language as the plan shown below, so the GO line matches
    getSectionAnyLang<Assumptions>(plan.id, "assumptions", lang).then((x) => x?.section ?? null),
    getSectionAnyLang<RiskSnapshot>(plan.id, "risk", lang).then((x) => x?.section ?? null),
    getSectionAnyLang<TestPlan>(plan.id, "test_plan", lang).then((x) => x?.section ?? null),
    getSectionAnyLang<Templates>(plan.id, "templates", lang).then((x) => x?.section ?? null),
  ]);
  // For the "Help me do this" status picture / flyer.
  const founder = await getSection<{ name: string }>(plan.id, "founder", "en").catch(() => null);
  const raw = plan.profile?.product || plan.title;
  const poster = {
    product: raw.charAt(0).toUpperCase() + raw.slice(1),
    by: founder?.content.name ? ts("by", { name: founder.content.name }) : "",
    cta: ts("cta"),
    made: ts("made"),
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-extrabold text-forest">{t("title")}</h1>
        <p className="text-muted">{t("subtitle")}</p>
      </div>
      <SprintTracker key={sprint.startDate ?? "not-started"} planId={plan.id} initial={sprint} />
      {/* key: a language switch shows that language's drafts */}
      <ValidateView key={lang} planId={plan.id} initial={{ assumptions, risk, testPlan, templates }} poster={poster} />
      <GuidanceFooter />
    </div>
  );
}
