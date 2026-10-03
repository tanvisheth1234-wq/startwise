// src/features/account/server/plans.ts   OWNER: T1
import "server-only";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { plans } from "@/db/schema";

export type PlanSummary = { id: string; title: string; status: string; updatedAt: Date };

/** The user's most recently updated plans. Only ever called with the logged-in user's id. */
export async function listPlans(userId: string, limit?: number): Promise<PlanSummary[]> {
  const q = db
    .select({ id: plans.id, title: plans.title, status: plans.status, updatedAt: plans.updatedAt })
    .from(plans)
    .where(eq(plans.userId, userId))
    .orderBy(desc(plans.updatedAt));
  return limit ? q.limit(limit) : q;
}
