// app/login/callback/route.ts   OWNER: T1 — email-confirmation link lands here
import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { Lang } from "@/contracts/profile";
import { LOCALE_COOKIE } from "@/i18n/request";
import { ensureUserRow } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const nextParam = url.searchParams.get("next") ?? "/";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/";

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      const cookieStore = await cookies();
      const current = Lang.safeParse(cookieStore.get(LOCALE_COOKIE)?.value);
      const lang = await ensureUserRow({ id: data.user.id, email: data.user.email ?? "" }, current.success ? current.data : "en");
      cookieStore.set(LOCALE_COOKIE, lang, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
      return NextResponse.redirect(new URL(next, url.origin));
    }
  }
  return NextResponse.redirect(new URL("/login?error=link", url.origin));
}
