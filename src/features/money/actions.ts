"use server";
// src/features/money/actions.ts — save the founder's edits in the Money Lab.
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db/client";
import { costItems, scenarios } from "@/db/schema";
import { requirePlan, requireUser } from "@/lib/auth";
import { replaceWithEstimates } from "./server/store";

const Inputs = z.object({ price: z.number().int().min(0).max(10_000_000), unitsPerMonth: z.number().int().min(0).max(1_000_000) });

export async function saveMoneyInputs(planId: string, inputs: { price: number; unitsPerMonth: number }) {
  const user = await requireUser();
  await requirePlan(planId);
  const parsed = Inputs.parse({ price: Math.round(inputs.price), unitsPerMonth: Math.round(inputs.unitsPerMonth) });
  const [current] = await db.select({ inputs: scenarios.inputs }).from(scenarios).where(and(eq(scenarios.planId, planId), eq(scenarios.name, "likely"))).limit(1);
  const keep = (current?.inputs ?? {}) as { unit?: string | null; source?: string };
  const updated = await db
    .update(scenarios)
    .set({ inputs: { ...parsed, unit: keep.unit ?? null, source: keep.source ?? "user" }, updatedAt: new Date(), updatedBy: user.id })
    .where(and(eq(scenarios.planId, planId), eq(scenarios.name, "likely")))
    .returning({ id: scenarios.id });
  if (updated.length === 0) await db.insert(scenarios).values({ planId, name: "likely", inputs: parsed, results: {}, updatedBy: user.id });
  revalidatePath(`/plan/${planId}`, "layout");
}

const Line = z.object({
  id: z.string().uuid().optional(),
  label: z.string().trim().min(1).max(80),
  kind: z.enum(["one_time", "monthly", "per_unit"]),
  amountInr: z.number().int().min(0).max(100_000_000),
});

export async function saveCostLine(planId: string, line: { id?: string; label: string; kind: string; amountInr: number }) {
  const user = await requireUser();
  await requirePlan(planId);
  const l = Line.parse({ ...line, amountInr: Math.round(line.amountInr) });
  if (l.id) {
    await db.update(costItems).set({ label: l.label, kind: l.kind, amountInr: l.amountInr, updatedAt: new Date(), updatedBy: user.id })
      .where(and(eq(costItems.id, l.id), eq(costItems.planId, planId)));
  } else {
    await db.insert(costItems).values({ planId, label: l.label, kind: l.kind, amountInr: l.amountInr, updatedBy: user.id });
  }
  revalidatePath(`/plan/${planId}`, "layout");
}

export async function deleteCostLine(planId: string, id: string) {
  await requireUser();
  await requirePlan(planId);
  await db.delete(costItems).where(and(eq(costItems.id, z.string().uuid().parse(id)), eq(costItems.planId, planId)));
  revalidatePath(`/plan/${planId}`, "layout");
}

/** Replaces all cost lines with fresh starting estimates for her business. */
export async function reEstimateCosts(planId: string) {
  const user = await requireUser();
  const plan = await requirePlan(planId);
  if (!plan.profile) return;
  await replaceWithEstimates(planId, plan.profile, plan.language, user.id);
  revalidatePath(`/plan/${planId}`, "layout");
}
