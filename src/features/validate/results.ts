"use server";
// src/features/validate/results.ts — log the test sprint day by day; code decides GO / NO-GO (#13).
import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { TestPlan } from "@/contracts/sections";
import { db } from "@/db/client";
import { testResults } from "@/db/schema";
import { requirePlan, requireUser } from "@/lib/auth";
import { roadmap } from "@/features/roadmap/api";
import { todayInIndia } from "./lib/testPlan";
import { getSection, saveSection } from "./server/sections";
import { sprintState } from "./server/results";

const Entry = z.object({
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  enquiries: z.number().int().min(0).max(10_000),
  orders: z.number().int().min(0).max(10_000),
  note: z.string().max(300).optional(),
});

/** Adds to the day's totals (so "+1 enquiry" taps add up), then re-checks the verdict. */
export async function logResult(planId: string, entry: { enquiries: number; orders: number; note?: string; day?: string }) {
  const user = await requireUser();
  const plan = await requirePlan(planId);
  const e = Entry.parse({ ...entry, day: entry.day ?? todayInIndia() });
  const [row] = await db.select().from(testResults).where(and(eq(testResults.planId, planId), eq(testResults.day, e.day))).limit(1);
  if (row) {
    await db.update(testResults).set({
      enquiries: sql`${testResults.enquiries} + ${e.enquiries}`, orders: sql`${testResults.orders} + ${e.orders}`,
      note: e.note ? [row.note, e.note].filter(Boolean).join(" · ").slice(0, 600) : row.note, updatedAt: new Date(), updatedBy: user.id,
    }).where(eq(testResults.id, row.id));
  } else {
    await db.insert(testResults).values({ planId, day: e.day, enquiries: e.enquiries, orders: e.orders, note: e.note ?? null, updatedBy: user.id });
  }
  const s = await sprintState(planId, plan.language);
  if (s.verdict.verdict === "go") await roadmap.markTaskDoneByKey(planId, "validate.test_sprint");
  revalidatePath(`/plan/${planId}`, "layout");
  return s;
}

/** "Adjust and test again": a fresh 7 days from today. Old results stay but no longer count. */
export async function restartSprint(planId: string) {
  const user = await requireUser();
  const plan = await requirePlan(planId);
  const section = await getSection<TestPlan>(planId, "test_plan", plan.language);
  if (!section) return;
  await saveSection(planId, "test_plan", plan.language, { ...section.content, startDate: todayInIndia() }, true, user.id);
  revalidatePath(`/plan/${planId}`, "layout");
}
