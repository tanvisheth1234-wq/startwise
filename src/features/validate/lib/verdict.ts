// src/features/validate/lib/verdict.ts — pure GO / NO-GO verdict (#13). Code decides, never the AI.
import { differenceInCalendarDays, parseISO } from "date-fns";

export type DayResult = { day: string; enquiries: number; orders: number };
export type Targets = { enquiries: number; orders: number };
export type Verdict =
  | { verdict: "pending"; daysLeft: number | null }
  | { verdict: "go" }
  | { verdict: "no_go"; reason: "interest_not_buying" | "low_interest" };

export function resultTotals(results: DayResult[], since?: string | null) {
  const counted = since ? results.filter((r) => r.day >= since) : results;
  return counted.reduce((t, r) => ({ enquiries: t.enquiries + r.enquiries, orders: t.orders + r.orders }), { enquiries: 0, orders: 0 });
}

/**
 * GO as soon as the order target is met. Otherwise wait for the 7 days to finish, then:
 * enough enquiries but few orders → people like it but the offer or price is off;
 * few enquiries → the idea needs a sharper niche or a different area.
 */
export function decideVerdict(startDate: string | null | undefined, targets: Targets, results: DayResult[], today: string): Verdict {
  if (!startDate) return { verdict: "pending", daysLeft: null };
  const { enquiries, orders } = resultTotals(results, startDate);
  if (orders >= Math.max(1, targets.orders)) return { verdict: "go" };
  const elapsed = differenceInCalendarDays(parseISO(today), parseISO(startDate));
  if (elapsed < 7) return { verdict: "pending", daysLeft: 7 - elapsed };
  return enquiries >= targets.enquiries
    ? { verdict: "no_go", reason: "interest_not_buying" }
    : { verdict: "no_go", reason: "low_interest" };
}
