// src/features/compliance/api.ts — the licence checklist for a plan, from the reviewed rule data.
import "server-only";
import type { ChecklistItem, ComplianceApi } from "@/contracts/compliance";
import type { SourceRef } from "@/contracts/common";
import { mergeProfile } from "@/lib/ai/profile";
import { requirePlan } from "@/lib/auth";
import { SOURCES, type RuleRecord } from "@/knowledge/data";
import type { Lang } from "@/contracts/profile";
import { selectRules } from "./engine";

export function sourceRef(key: string): SourceRef | null {
  const s = SOURCES.find((x) => x.key === key);
  return s ? { key: s.key, title: s.title, url: s.url, lastVerified: s.lastVerified, status: s.status } : null;
}

/** Plain-language name for a rule, used by the checklist and the roadmap. */
export function ruleTitle(rule: RuleRecord, lang: Lang): string {
  return rule.plainName[lang];
}

export const compliance: ComplianceApi = {
  async getChecklist(planId, lang) {
    const plan = await requirePlan(planId);
    const profile = plan.profile ?? mergeProfile(undefined, {}, plan.language);
    return selectRules(profile, lang).map(({ rule, applies, reason }): ChecklistItem => ({
      ruleKey: rule.key,
      name: rule.plainName[lang],
      authority: `${rule.name} · ${rule.authority}`,
      whyNeeded: rule.whyNeeded[lang],
      explanation: rule.explanation[lang],
      costText: rule.costText?.[lang] ?? null,
      timeText: rule.timeText?.[lang] ?? null,
      documents: rule.documents.map((d) => d[lang]),
      phase: rule.phase,
      dependsOn: rule.dependsOn,
      officialUrl: rule.officialUrl,
      source: sourceRef(rule.sourceKey),
      status: applies === "maybe" ? "check_locally" : rule.status,
      lastVerified: rule.lastVerified,
      applies,
      reason,
    }));
  },
};
