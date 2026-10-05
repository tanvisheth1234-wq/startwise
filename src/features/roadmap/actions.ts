"use server";
// src/features/roadmap/actions.ts — tick tasks off, mark them blocked, add notes and evidence (#37).
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db/client";
import { planTasks } from "@/db/schema";
import { requirePlan, requireUser } from "@/lib/auth";

const Status = z.enum(["pending", "blocked", "done"]);

export async function setTaskStatus(planId: string, taskId: string, status: "pending" | "blocked" | "done", blockedReason?: string) {
  const user = await requireUser();
  await requirePlan(planId);
  await db
    .update(planTasks)
    .set({
      status: Status.parse(status),
      blockedReason: status === "blocked" ? (blockedReason ?? "").slice(0, 200) || null : null,
      updatedAt: new Date(),
      updatedBy: user.id,
    })
    .where(and(eq(planTasks.id, z.string().uuid().parse(taskId)), eq(planTasks.planId, planId)));
  revalidatePath(`/plan/${planId}`, "layout");
}

export async function saveTaskNote(planId: string, taskId: string, notes: string, evidenceUrl: string) {
  const user = await requireUser();
  await requirePlan(planId);
  const url = evidenceUrl.trim();
  await db
    .update(planTasks)
    .set({
      notes: notes.trim().slice(0, 1000) || null,
      evidenceUrl: url && /^https?:\/\//.test(url) ? url.slice(0, 500) : null,
      updatedAt: new Date(),
      updatedBy: user.id,
    })
    .where(and(eq(planTasks.id, z.string().uuid().parse(taskId)), eq(planTasks.planId, planId)));
  revalidatePath(`/plan/${planId}`, "layout");
}
