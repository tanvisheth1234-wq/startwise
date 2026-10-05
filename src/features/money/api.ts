// src/features/money/api.ts — the plan's money summary, from editable estimates and plain formulas.
import "server-only";
import type { MoneyApi } from "@/contracts/money";
import { requirePlan } from "@/lib/auth";
import { summarise } from "./lib/calc";
import { loadCostLines, loadInputs } from "./server/store";

export const money: MoneyApi = {
  async getMoneySummary(planId) {
    const plan = await requirePlan(planId);
    const lines = await loadCostLines(planId);
    if (lines.length === 0) return null;
    const type = plan.profile?.businessType ?? "other";
    return summarise(lines, await loadInputs(planId, type), plan.profile?.budgetInr ?? null);
  },
};
