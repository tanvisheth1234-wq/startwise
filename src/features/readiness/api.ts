// src/features/readiness/api.ts   OWNER: T2 (stub written by T1 in Phase 0)
import "server-only";
import type { ReadinessApi } from "@/contracts/readiness";
import { FIXTURE_READINESS } from "@/fixtures/home-bakery";

export const readiness: ReadinessApi = {
  async getReadiness(_planId, _lang) { return FIXTURE_READINESS; }, // TODO(T2): real readiness score
};
