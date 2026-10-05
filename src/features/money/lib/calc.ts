// src/features/money/lib/calc.ts — pure money formulas (#26–#31). Same inputs, same numbers, always.
import type { MoneySummary } from "@/contracts/money";

export type CostLine = { id?: string; label: string; kind: "one_time" | "monthly" | "per_unit"; amountInr: number };
export type MoneyInputs = { price: number; unitsPerMonth: number };

export type Scenario = { name: "worst" | "likely" | "best"; price: number; units: number; profit: number };

const sum = (lines: CostLine[], kind: CostLine["kind"]) => lines.filter((l) => l.kind === kind).reduce((s, l) => s + Math.max(0, l.amountInr), 0);

export function totals(lines: CostLine[]) {
  return { startupTotal: sum(lines, "one_time"), monthlyFixed: sum(lines, "monthly"), unitCost: sum(lines, "per_unit") };
}

/** Monthly profit at a price and volume. */
export function monthlyProfit(lines: CostLine[], price: number, units: number): number {
  const { monthlyFixed, unitCost } = totals(lines);
  return Math.round(units * (price - unitCost) - monthlyFixed);
}

/** Units a month needed to cover monthly costs; null when each sale loses money. */
export function breakEvenUnits(lines: CostLine[], price: number): number | null {
  const { monthlyFixed, unitCost } = totals(lines);
  const margin = price - unitCost;
  if (margin <= 0) return null;
  return Math.ceil(monthlyFixed / margin);
}

/** Price range of about 2–3× the per-item cost, the usual home-business markup (a suggestion, never forced). */
export function suggestedPriceRange(lines: CostLine[]): { low: number; high: number } {
  const { unitCost } = totals(lines);
  const round = (n: number) => Math.max(10, Math.round(n / 10) * 10);
  return { low: round(unitCost * 2), high: round(unitCost * 3) };
}

export function summarise(lines: CostLine[], inputs: MoneyInputs, budgetInr: number | null): MoneySummary {
  const { startupTotal, monthlyFixed, unitCost } = totals(lines);
  const margin = inputs.price - unitCost;
  const profit = monthlyProfit(lines, inputs.price, inputs.unitsPerMonth);
  // Loan need: start-up costs plus two months of running costs, minus own money.
  const cushion = startupTotal + 2 * monthlyFixed;
  return {
    startupTotal,
    monthlyFixed,
    unitCost,
    price: inputs.price,
    marginPerUnit: margin,
    breakEvenUnitsPerMonth: breakEvenUnits(lines, inputs.price),
    monthsToRecoverStartup: profit > 0 ? Math.round((startupTotal / profit) * 10) / 10 : null,
    loanNeed: Math.max(0, cushion - (budgetInr ?? 0)),
    isEstimate: true,
  };
}

/** Best / likely / worst side by side: ±20% volume and ±10% price around the founder's guess. */
export function scenarios(lines: CostLine[], inputs: MoneyInputs): Scenario[] {
  const make = (name: Scenario["name"], pf: number, uf: number): Scenario => {
    const price = Math.round(inputs.price * pf);
    const units = Math.max(0, Math.round(inputs.unitsPerMonth * uf));
    return { name, price, units, profit: monthlyProfit(lines, price, units) };
  };
  return [make("worst", 0.9, 0.6), make("likely", 1, 1), make("best", 1.05, 1.4)];
}

/**
 * 90-day cash: day 0 spends the start-up costs; sales ramp up over the first month
 * (40% → 70% → 100% of the monthly guess), and monthly costs are paid each month.
 */
export function cashFlow90(lines: CostLine[], inputs: MoneyInputs, ownMoney: number): { week: number; balance: number }[] {
  const { startupTotal, monthlyFixed, unitCost } = totals(lines);
  const margin = inputs.price - unitCost;
  let balance = ownMoney - startupTotal;
  const points = [{ week: 0, balance: Math.round(balance) }];
  for (let week = 1; week <= 13; week++) {
    const month = Math.min(2, Math.floor((week - 1) / 4.34));
    const ramp = [0.4, 0.7, 1][month];
    balance += ((inputs.unitsPerMonth * ramp) / 4.34) * margin - monthlyFixed / 4.34;
    points.push({ week, balance: Math.round(balance) });
  }
  return points;
}
