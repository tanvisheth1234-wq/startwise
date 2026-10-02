"use server";
// app/login/actions.ts   OWNER: T1 — email + password sign-in / sign-up (#46)
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Lang } from "@/contracts/profile";
import { LOCALE_COOKIE } from "@/i18n/request";
import { ensureUserRow } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AuthState = { error?: "invalid" | "credentials" | "exists" | "weak" | "unknown"; checkEmail?: boolean };

const Credentials = z.object({
  email: z.email(),
  password: z.string().min(8),
});

/** Only allow same-site relative redirects. */
function safeNext(next: FormDataEntryValue | null): string {
  const n = typeof next === "string" ? next : "";
  return n.startsWith("/") && !n.startsWith("//") ? n : "/";
}

async function currentLang(): Promise<Lang> {
  const c = (await cookies()).get(LOCALE_COOKIE)?.value;
  const parsed = Lang.safeParse(c);
  return parsed.success ? parsed.data : "en";
}

/** After login: create the users row once, then restore the saved language. */
async function finishLogin(user: { id: string; email?: string }) {
  const lang = await ensureUserRow({ id: user.id, email: user.email ?? "" }, await currentLang());
  (await cookies()).set(LOCALE_COOKIE, lang, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = Credentials.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: "invalid" };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) return { error: "credentials" };

  await finishLogin(data.user);
  redirect(safeNext(formData.get("next")));
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = Credentials.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: parsed.error.issues.some((i) => i.path[0] === "password") ? "weak" : "invalid" };

  const next = safeNext(formData.get("next"));
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    ...parsed.data,
    options: { emailRedirectTo: `${appUrl}/login/callback?next=${encodeURIComponent(next)}` },
  });
  if (error) return { error: error.code === "user_already_exists" ? "exists" : error.code === "weak_password" ? "weak" : "unknown" };

  // Email confirmation on: no session yet, the user must click the link.
  if (!data.session || !data.user) return { checkEmail: true };

  await finishLogin(data.user);
  redirect(next);
}
