// src/contracts/money.ts   (SHARED, frozen) — T2
export type MoneySummary = {
  startupTotal: number; monthlyFixed: number; unitCost: number; price: number | null;
  marginPerUnit: number | null; breakEvenUnitsPerMonth: number | null;
  monthsToRecoverStartup: number | null; loanNeed: number; isEstimate: true;
};

export interface MoneyApi { getMoneySummary(planId: string): Promise<MoneySummary | null>; }
