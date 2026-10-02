// src/contracts/validate.ts   (SHARED, frozen) — T1
export type ValidationStatus = {
  sprintStarted: boolean; verdict: "pending" | "go" | "no_go";
  enquiries: number; orders: number;
};

export interface ValidateApi { getValidationStatus(planId: string): Promise<ValidationStatus>; }
