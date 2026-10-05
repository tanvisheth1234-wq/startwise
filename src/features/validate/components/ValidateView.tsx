"use client";
// OWNER: T1 — Screen 5 (idea check). Assumptions draft first; risk, test plan and templates build on them.
import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, Lightbulb } from "lucide-react";
import type { Assumptions, RiskSnapshot, Templates, TestPlan } from "@/contracts/sections";
import type { Section } from "../server/sections";
import { AssumptionsSection } from "./AssumptionsSection";
import { RiskSection } from "./RiskSection";
import { TemplatesSection } from "./TemplatesSection";
import { TestPlanSection } from "./TestPlanSection";

export type ValidateInitial = {
  assumptions: Section<Assumptions> | null;
  risk: Section<RiskSnapshot> | null;
  testPlan: Section<TestPlan> | null;
  templates: Section<Templates> | null;
};

export function ValidateView({ planId, initial }: { planId: string; initial: ValidateInitial }) {
  // Drafts run one after another (assumptions → risk) to stay inside the AI rate limit.
  const [assumptionsReady, setAssumptionsReady] = useState(Boolean(initial.assumptions));
  const onReady = useCallback(() => setAssumptionsReady(true), []);

  const t = useTranslations("validate");
  // The action first (test + messages); the thinking behind it stays one tap away.
  return (
    <div className="space-y-4">
      <TestPlanSection planId={planId} initial={initial.testPlan} ready={assumptionsReady} />
      <TemplatesSection planId={planId} initial={initial.templates} ready={assumptionsReady} />
      <details className="group rounded-3xl border border-line/70 bg-white/80 shadow-soft">
        <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 font-display text-lg font-bold text-forest">
          <Lightbulb className="size-5 text-[#b07800]" aria-hidden />
          <span className="flex-1">{t("whyTitle")}</span>
          <ChevronDown className="size-5 text-muted transition-transform group-open:rotate-180" aria-hidden />
        </summary>
        <div className="space-y-4 p-2 pt-0">
          <AssumptionsSection planId={planId} initial={initial.assumptions} onReady={onReady} />
          <RiskSection planId={planId} initial={initial.risk} ready={assumptionsReady} />
        </div>
      </details>
    </div>
  );
}
