"use client";
// OWNER: T1 — Screen 5 (idea check). Assumptions draft first; risk, test plan and templates build on them.
import { useCallback, useState } from "react";
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

  return (
    <div className="space-y-4">
      <AssumptionsSection planId={planId} initial={initial.assumptions} onReady={onReady} />
      <RiskSection planId={planId} initial={initial.risk} ready={assumptionsReady} />
      <TestPlanSection planId={planId} initial={initial.testPlan} ready={assumptionsReady} />
      <TemplatesSection planId={planId} initial={initial.templates} ready={assumptionsReady} />
    </div>
  );
}
