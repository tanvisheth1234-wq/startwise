// src/features/money/server/store.ts — cost lines and the founder's price/volume guess for a plan.
import "server-only";
import { and, asc, eq } from "drizzle-orm";
import type { BusinessProfile, Lang } from "@/contracts/profile";
import { db } from "@/db/client";
import { costItems, scenarios } from "@/db/schema";
import { COST_TEMPLATES, DEFAULT_PRICE } from "@/knowledge/data";
import { suggestCosts } from "@/lib/ai/extras";
import type { CostLine, MoneyInputs } from "../lib/calc";

/** What one "item" is for her business and where the starting numbers came from. */
export type MoneyMeta = { unit: string | null; source: "ai" | "template" | "user" };

type Starting = { lines: { label: string; kind: CostLine["kind"]; amountInr: number }[]; price: number; units: number; unit: string | null; source: MoneyMeta["source"] };

/** Reviewed bakery/tailoring/reselling templates: the fallback, and the demo's fixed numbers. */
function fromTemplates(businessType: string, lang: Lang): Starting {
  const lines = COST_TEMPLATES.filter((c) => c.businessType === businessType);
  const pick = lines.length ? lines : COST_TEMPLATES.filter((c) => c.businessType === "home_food");
  const d = DEFAULT_PRICE[businessType] ?? DEFAULT_PRICE.other;
  return { lines: pick.map((c) => ({ label: c.label[lang], kind: c.kind, amountInr: c.amountInr })), price: d.price, units: d.units, unit: null, source: "template" };
}

/**
 * AI starting estimates for HER business (a tiffin service gets tiffin costs, not oven and moulds).
 * Code sanity-checks them; she edits them. Falls back to the templates if the AI is unavailable.
 */
async function startingFor(profile: BusinessProfile, lang: Lang): Promise<Starting> {
  try {
    const s = await suggestCosts(profile, lang);
    const lines = s.lines.map((l) => ({ label: l.label.trim().slice(0, 60), kind: l.kind, amountInr: Math.round(l.amountInr) })).filter((l) => l.label);
    const perUnit = lines.filter((l) => l.kind === "per_unit").reduce((a, l) => a + l.amountInr, 0);
    // A starting price that loses money on every sale would be a bad first impression: lift it above cost.
    const price = Math.max(Math.round(s.price), Math.round(perUnit * 1.3) || 1);
    const unit = s.unit.trim().slice(0, 30);
    const isTime = /^(month|monthly|day|week|year|hour|महीना|मासिक|दिन|हफ़्ता|महिना|दिवस|आठवडा)$/i.test(unit);
    return { lines, price, units: Math.round(s.unitsPerMonth), unit: unit && !isTime ? unit : null, source: "ai" };
  } catch {
    return fromTemplates(profile.businessType, lang);
  }
}

async function writeStarting(planId: string, s: Starting, userId: string) {
  await db.insert(costItems).values(s.lines.map((l) => ({ planId, label: l.label, kind: l.kind, amountInr: l.amountInr, updatedBy: userId })));
  const inputs = { price: s.price, unitsPerMonth: s.units, unit: s.unit, source: s.source };
  const updated = await db.update(scenarios).set({ inputs, updatedAt: new Date(), updatedBy: userId })
    .where(and(eq(scenarios.planId, planId), eq(scenarios.name, "likely"))).returning({ id: scenarios.id });
  if (updated.length === 0) await db.insert(scenarios).values({ planId, name: "likely", inputs, results: {}, updatedBy: userId });
}

/** First time only: starting estimates for her business, in the plan's language. */
export async function ensureMoneyDefaults(planId: string, profile: BusinessProfile, lang: Lang, userId: string, opts: { ai?: boolean } = {}) {
  const [any] = await db.select({ id: costItems.id }).from(costItems).where(eq(costItems.planId, planId)).limit(1);
  if (any) return;
  const s = opts.ai === false ? fromTemplates(profile.businessType, lang) : await startingFor(profile, lang);
  await writeStarting(planId, s, userId);
}

/** "Suggest costs for my business again": replaces all cost lines with fresh estimates. */
export async function replaceWithEstimates(planId: string, profile: BusinessProfile, lang: Lang, userId: string) {
  const s = await startingFor(profile, lang);
  await db.delete(costItems).where(eq(costItems.planId, planId));
  await writeStarting(planId, s, userId);
}

export async function loadCostLines(planId: string): Promise<CostLine[]> {
  const rows = await db.select().from(costItems).where(eq(costItems.planId, planId)).orderBy(asc(costItems.createdAt));
  return rows.map((r) => ({ id: r.id, label: r.label, kind: r.kind as CostLine["kind"], amountInr: r.amountInr }));
}

export async function loadInputs(planId: string, businessType: string): Promise<MoneyInputs & MoneyMeta> {
  const [s] = await db.select().from(scenarios).where(and(eq(scenarios.planId, planId), eq(scenarios.name, "likely"))).limit(1);
  const d = DEFAULT_PRICE[businessType] ?? DEFAULT_PRICE.other;
  const i = (s?.inputs ?? {}) as Partial<MoneyInputs & MoneyMeta>;
  return { price: i.price ?? d.price, unitsPerMonth: i.unitsPerMonth ?? d.units, unit: i.unit ?? null, source: i.source ?? "template" };
}

/** Her product word for examples ("2 tiffins", "2 classes"); null if not known yet. */
export async function itemWord(planId: string, businessType: string, lang: Lang): Promise<string | null> {
  const { unit } = await loadInputs(planId, businessType).catch(() => ({ unit: null }));
  if (!unit) return null;
  if (lang !== "en") return unit;
  return /s$/i.test(unit) ? unit : /(ch|sh|x)$/i.test(unit) ? `${unit}es` : `${unit}s`;
}
