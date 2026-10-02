// src/features/money/api.ts   OWNER: T2 (stub written by T1 in Phase 0)
import "server-only";
import type { MoneyApi } from "@/contracts/money";
import { FIXTURE_MONEY } from "@/fixtures/home-bakery";

export const money: MoneyApi = {
  async getMoneySummary(_planId) { return FIXTURE_MONEY; }, // TODO(T2): real money formulas
};
