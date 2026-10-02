// src/features/validate/api.ts   OWNER: T1
import "server-only";
import type { ValidateApi } from "@/contracts/validate";
import { FIXTURE_VALIDATION } from "@/fixtures/home-bakery";

export const validate: ValidateApi = {
  async getValidationStatus(_planId) { return FIXTURE_VALIDATION; }, // TODO(T1): real verdict from test_results
};
