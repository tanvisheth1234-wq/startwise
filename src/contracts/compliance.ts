// src/contracts/compliance.ts   (SHARED, frozen) — implemented by T2 in src/features/compliance/api.ts
import type { Phase, SourceRef, VerifyStatus } from "./common";
import type { Lang } from "./profile";

export type ChecklistItem = {
  ruleKey: string; name: string; authority: string; whyNeeded: string; explanation: string;
  costText: string | null; timeText: string | null; documents: string[];
  phase: Phase; dependsOn: string[]; officialUrl: string; source: SourceRef | null;
  status: VerifyStatus; lastVerified: string | null;
  applies: "yes" | "maybe"; reason: string; // "maybe" = depends on data we don't have → Check locally
};

export type RuleCondition = {
  businessTypes: string[]; cities: string[]; // ["*"] = all
  premises: ("home" | "shop")[]; sellsOnline: boolean | null; // null = either
  minMonthlySalesInr: number | null; maxMonthlySalesInr: number | null; // null = no limit / unknown
};

export interface ComplianceApi { getChecklist(planId: string, lang: Lang): Promise<ChecklistItem[]>; }
