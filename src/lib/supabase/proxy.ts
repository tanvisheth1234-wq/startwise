// src/lib/supabase/proxy.ts   (SHARED) — session refresh used by /proxy.ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIXES = ["/plan", "/account", "/admin", "/new"];
// These start a guest session automatically, so nobody has to log in before trying the app.
const GUEST_PREFIXES = ["/plan", "/new", "/demo"];

export async function updateSession(request: NextRequest) {
  // Pass the path to server components (the plan layout uses it to avoid redirect loops).
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);

  let response = NextResponse.next({ request: { headers: requestHeaders } });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return response; // not configured yet: let pages render their placeholders

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request: { headers: requestHeaders } });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers ?? {}).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });

  // Do not run code between createServerClient and getClaims (Supabase guidance).
  const { data } = await supabase.auth.getClaims();
  let signedIn = Boolean(data?.claims?.sub);

  const path = request.nextUrl.pathname;
  const matches = (list: string[]) => list.some((p) => path === p || path.startsWith(p + "/"));
  if (!signedIn && matches(GUEST_PREFIXES)) {
    // Anonymous sign-in sets the session cookies through setAll above.
    const { error } = await supabase.auth.signInAnonymously();
    signedIn = !error;
  }

  if (!signedIn && matches(PROTECTED_PREFIXES)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    loginUrl.searchParams.set("next", path + request.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}
