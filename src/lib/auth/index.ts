// src/lib/auth/index.ts   (SHARED) — requireUser(), requirePlan(), isAdmin()
import "server-only";
import { cache } from "react";
import { and, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { db } from "@/db/client";
import { plans, users } from "@/db/schema";
import type { Lang } from "@/contracts/profile";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type SessionUser = { id: string; email: string };
export type Plan = typeof plans.$inferSelect;

/** Current user or null. Verified with the Supabase auth server. Cached per request. */
export const getUser = cache(async (): Promise<SessionUser | null> => {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return null;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  return { id: data.user.id, email: data.user.email ?? "" };
});

/** Current user, or redirect to /login. */
export async function requireUser(next?: string): Promise<SessionUser> {
  const user = await getUser();
  if (!user) redirect(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  return user;
}

/**
 * The plan, only if it belongs to the current user (#46 data isolation).
 * Another user's plan (or a bad id) gives a 404, never a 403, so ids cannot be probed.
 */
export const requirePlan = cache(async (planId: string): Promise<Plan> => {
  const user = await requireUser();
  if (!/^[0-9a-f-]{36}$/i.test(planId)) notFound();
  const [plan] = await db
    .select()
    .from(plans)
    .where(and(eq(plans.id, planId), eq(plans.userId, user.id)))
    .limit(1);
  if (!plan) notFound();
  return plan;
});

/** True when the current user's email is in ADMIN_EMAILS. */
export async function isAdmin(): Promise<boolean> {
  const user = await getUser();
  if (!user) return false;
  const admins = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return admins.includes(user.email.toLowerCase());
}

/** Creates the users row on first login (idempotent) and returns the stored language. */
export async function ensureUserRow(user: SessionUser, language: Lang): Promise<Lang> {
  await db.insert(users).values({ id: user.id, email: user.email, preferredLanguage: language }).onConflictDoNothing();
  const [row] = await db.select({ lang: users.preferredLanguage }).from(users).where(eq(users.id, user.id)).limit(1);
  return row?.lang ?? language;
}
