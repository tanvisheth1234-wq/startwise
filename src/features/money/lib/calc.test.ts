import { describe, expect, it } from "vitest";
import { breakEvenUnits, monthlyProfit, scenarios, summarise, type CostLine } from "./calc";

const lines: CostLine[] = [
  { label: "Oven", kind: "one_time", amountInr: 10000 },
  { label: "Gas", kind: "monthly", amountInr: 1500 },
  { label: "Ingredients", kind: "per_unit", amountInr: 200 },
];

describe("money formulas", () => {
  it("profit = units × (price − unit cost) − monthly costs", () => {
    expect(monthlyProfit(lines, 450, 40)).toBe(40 * 250 - 1500);
  });

  it("break-even rounds up to whole items", () => {
    expect(breakEvenUnits(lines, 450)).toBe(6); // 1500 / 250 = 6
    expect(breakEvenUnits(lines, 460)).toBe(6); // 5.77 → 6
  });

  it("no break-even when each sale loses money", () => {
    expect(breakEvenUnits(lines, 150)).toBeNull();
  });

  it("loan need = start-up + two months of costs − own money, never negative", () => {
    expect(summarise(lines, { price: 450, unitsPerMonth: 40 }, 5000).loanNeed).toBe(10000 + 3000 - 5000);
    expect(summarise(lines, { price: 450, unitsPerMonth: 40 }, 50000).loanNeed).toBe(0);
  });

  it("scenarios are ordered worst < likely < best", () => {
    const [w, l, b] = scenarios(lines, { price: 450, unitsPerMonth: 40 });
    expect(w.profit).toBeLessThan(l.profit);
    expect(l.profit).toBeLessThan(b.profit);
  });
});
