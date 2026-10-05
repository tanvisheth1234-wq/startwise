"use server";
// src/features/admin/actions.ts — team-only: close flagged items after re-checking the official page.
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { z } from "zod";
import { db } from "@/db/client";
import { flags } from "@/db/schema";
import { isAdmin, requireUser } from "@/lib/auth";

export async function reviewFlag(flagId: string, status: "fixed" | "rejected") {
  if (!(await isAdmin())) notFound();
  const user = await requireUser();
  await db
    .update(flags)
    .set({ status: z.enum(["fixed", "rejected"]).parse(status), reviewedBy: user.id, reviewedAt: new Date().toISOString().slice(0, 10), updatedAt: new Date() })
    .where(eq(flags.id, z.string().uuid().parse(flagId)));
  revalidatePath("/admin");
}
