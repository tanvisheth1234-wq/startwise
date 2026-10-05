"use server";
// src/features/compliance/actions.ts — "this looks outdated" (#24): saved for the team to re-check.
import { z } from "zod";
import { db } from "@/db/client";
import { flags } from "@/db/schema";
import { requirePlan, requireUser } from "@/lib/auth";

export async function flagOutdated(planId: string, targetType: "rule" | "scheme" | "source", targetKey: string, message?: string) {
  const user = await requireUser();
  await requirePlan(planId);
  await db.insert(flags).values({
    userId: user.id,
    targetType: z.enum(["rule", "scheme", "source"]).parse(targetType),
    targetKey: z.string().min(1).max(80).parse(targetKey),
    message: message?.slice(0, 500) ?? null,
  });
}
