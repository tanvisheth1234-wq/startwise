// src/features/funding/api.ts   OWNER: T2 (stub written by T1 in Phase 0)
import "server-only";
import type { FundingApi } from "@/contracts/funding";
import { FIXTURE_SCHEMES } from "@/fixtures/home-bakery";

export const funding: FundingApi = {
  async matchSchemes(_planId, _lang) { return FIXTURE_SCHEMES; }, // TODO(T2): real scheme matcher
};
