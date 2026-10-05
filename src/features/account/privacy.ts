"use server";
// src/features/account/privacy.ts — delete one plan, or everything (#47 privacy by design).
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db/client";
import { plans, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";

export async function deletePlan(planId: string) {
  const user = await requireUser();
  await db.delete(plans).where(and(eq(plans.id, z.string().uuid().parse(planId)), eq(plans.userId, user.id)));
  revalidatePath("/account");
  revalidatePath("/");
}

/** Deletes every plan (cascades to tasks, notes, costs…), the users row and the login itself. */
export async function deleteMyData(confirmText: string): Promise<{ ok: false } | never> {
  if (confirmText.trim().toUpperCase() !== "DELETE") return { ok: false };
  const user = await requireUser();
  await db.delete(plans).where(eq(plans.userId, user.id));
  await db.delete(users).where(eq(users.id, user.id));
  try {
    await createSupabaseAdminClient().auth.admin.deleteUser(user.id);
  } catch (e) {
    console.error("[privacy] could not delete auth user", e);
  }
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/?deleted=1");
}
