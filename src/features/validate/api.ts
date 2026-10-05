// src/features/validate/api.ts   OWNER: T1
import "server-only";
import type { ValidateApi } from "@/contracts/validate";
import { requirePlan } from "@/lib/auth";
import { sprintState } from "./server/results";

export const validate: ValidateApi = {
  async getValidationStatus(planId) {
    const plan = await requirePlan(planId);
    const s = await sprintState(planId, plan.language);
    return { sprintStarted: Boolean(s.startDate), verdict: s.verdict.verdict, enquiries: s.totals.enquiries, orders: s.totals.orders };
  },
};
