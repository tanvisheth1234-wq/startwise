// src/features/compliance/api.ts   OWNER: T2 (stub written by T1 in Phase 0)
import "server-only";
import type { ComplianceApi } from "@/contracts/compliance";
import { FIXTURE_CHECKLIST } from "@/fixtures/home-bakery";

export const compliance: ComplianceApi = {
  async getChecklist(_planId, _lang) { return FIXTURE_CHECKLIST; }, // TODO(T2): real rule engine (call requirePlan)
};
