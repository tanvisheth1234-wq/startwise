import { describe, expect, it } from "vitest";
import type { TestPlan } from "@/contracts/sections";
import { hasSevenDays, normalise, scaleToCap, SPRINT_CAP_INR, todayInIndia, totalCost, withDefaultTargets } from "./testPlan";

const plan = (costs: number[]): TestPlan => ({
  days: costs.map((c, i) => ({ day: (i + 1) as 1, experiment: "interviews" as const, action: `Day ${i + 1}`, costInr: c })),
  targets: { enquiries: 25, orders: 8 },
});

describe("7-day test plan rules (code, not AI)", () => {
  it("adds up the cost", () => {
    expect(totalCost(plan([0, 50, 100, 0, 0, 150, 0]))).toBe(300);
  });

  it("requires exactly days 1–7", () => {
    expect(hasSevenDays(plan([0, 0, 0, 0, 0, 0, 0]))).toBe(true);
    expect(hasSevenDays(plan([0, 0, 0, 0, 0, 0]))).toBe(false);
    const dup = plan([0, 0, 0, 0, 0, 0, 0]);
    dup.days[6] = { ...dup.days[6], day: 6 };
    expect(hasSevenDays(dup)).toBe(false);
  });

  it("scales an over-budget plan down to ≤ ₹500 and leaves a cheap one alone", () => {
    const scaled = scaleToCap(plan([300, 200, 200, 100, 0, 0, 0]));
    expect(totalCost(scaled)).toBeLessThanOrEqual(SPRINT_CAP_INR);
    expect(scaled.days[0].costInr).toBe(187);
    const cheap = plan([0, 50, 0, 0, 0, 0, 0]);
    expect(scaleToCap(cheap)).toBe(cheap);
  });

  it("normalises order and rounding", () => {
    const p = plan([10.6, 0, 0, 0, 0, 0, 0]);
    p.days.reverse();
    const n = normalise(p);
    expect(n.days.map((d) => d.day)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(n.days[0].costInr).toBe(11);
  });

  it("starts from the product default targets (10 enquiries / 3 orders)", () => {
    expect(withDefaultTargets(plan([0, 0, 0, 0, 0, 0, 0])).targets).toEqual({ enquiries: 10, orders: 3 });
  });

  it("dates the sprint in Indian time (00:30 IST is still the next day in UTC terms)", () => {
    expect(todayInIndia(new Date("2026-10-03T19:00:00Z"))).toBe("2026-10-04");
    expect(todayInIndia(new Date("2026-10-03T10:00:00Z"))).toBe("2026-10-03");
  });
});
