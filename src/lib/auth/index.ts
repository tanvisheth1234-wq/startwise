// src/lib/auth/index.ts   (SHARED) — requireUser(), requirePlan(), isAdmin()
import "server-only";
import { cache } from "react";
import { and, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { db } from "@/db/client";
import { plans, users } from "@/db/schema";
import type { Lang } from "@/contracts/profile";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** isGuest: a Supabase anonymous session, so people can start without an account. */
export type SessionUser = { id: string; email: string; isGuest?: boolean; name?: string };
export type Plan = typeof plans.$inferSelect;

/** Current user or null. Verified with the Supabase auth server. Cached per request. */
export const getUser = cache(async (): Promise<SessionUser | null> => {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return null;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const meta = (data.user.user_metadata ?? {}) as { full_name?: string; name?: string; given_name?: string };
  // First name from Google ("Twissha Shah" → "Twissha"); email sign-ups have none.
  const name = (meta.given_name || meta.full_name || meta.name || "").trim().split(/\s+/)[0] || undefined;
  return { id: data.user.id, email: data.user.email ?? "", isGuest: Boolean(data.user.is_anonymous), name };
});

/** Guests never go through login, so their users row is created the first time they need it. */
const ensureGuestRow = cache(async (user: SessionUser) => {
  await db.insert(users).values({ id: user.id, email: "" }).onConflictDoNothing();
});

/** Current user, or redirect to /login. */
export async function requireUser(next?: string): Promise<SessionUser> {
  const user = await getUser();
  if (!user) redirect(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  if (user.isGuest) await ensureGuestRow(user);
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

/** Moves a guest's plans to the account they just logged into or created, then removes the guest row. */
export async function claimGuestPlans(guestId: string, userId: string): Promise<void> {
  if (!guestId || guestId === userId) return;
  await db.update(plans).set({ userId, updatedAt: new Date(), updatedBy: userId }).where(eq(plans.userId, guestId));
  await db.delete(users).where(eq(users.id, guestId));
}

/** Creates the users row on first login (idempotent) and returns the stored language. */
export async function ensureUserRow(user: SessionUser, language: Lang): Promise<Lang> {
  await db
    .insert(users)
    .values({ id: user.id, email: user.email, preferredLanguage: language })
    .onConflictDoUpdate({ target: users.id, set: { email: user.email } });
  const [row] = await db.select({ lang: users.preferredLanguage }).from(users).where(eq(users.id, user.id)).limit(1);
  return row?.lang ?? language;
}
