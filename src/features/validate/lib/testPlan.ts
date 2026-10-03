// src/features/validate/lib/testPlan.ts   OWNER: T1 — pure, unit-tested.
// Code (not the AI) enforces the 7-day shape and the ₹500 cap.
import type { TestPlan } from "@/contracts/sections";

export const SPRINT_CAP_INR = 500;
export const DEFAULT_TARGETS = { enquiries: 10, orders: 3 } as const;

export function totalCost(plan: Pick<TestPlan, "days">): number {
  return plan.days.reduce((sum, d) => sum + Math.max(0, d.costInr), 0);
}

/** Exactly one entry for each day 1–7. */
export function hasSevenDays(plan: Pick<TestPlan, "days">): boolean {
  const days = plan.days.map((d) => d.day).sort((a, b) => a - b);
  return days.length === 7 && days.every((d, i) => d === i + 1);
}

/** Sorts by day and rounds costs to whole rupees. */
export function normalise(plan: TestPlan): TestPlan {
  return {
    ...plan,
    days: [...plan.days].sort((a, b) => a.day - b.day).map((d) => ({ ...d, costInr: Math.max(0, Math.round(d.costInr)) })),
  };
}

/** Scales every day's cost down proportionally (rounding down) so the total fits the cap. */
export function scaleToCap(plan: TestPlan, cap = SPRINT_CAP_INR): TestPlan {
  const total = totalCost(plan);
  if (total <= cap) return plan;
  const factor = cap / total;
  return { ...plan, days: plan.days.map((d) => ({ ...d, costInr: Math.floor(d.costInr * factor) })) };
}

/** The product default targets, so the founder's GO line starts at 10 enquiries / 3 orders. */
export function withDefaultTargets(plan: TestPlan): TestPlan {
  return { ...plan, targets: { ...DEFAULT_TARGETS } };
}

/** Today's date (YYYY-MM-DD) in India, whatever timezone the server runs in. */
export function todayInIndia(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
