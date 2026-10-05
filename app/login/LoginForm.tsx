"use client";
// app/login/LoginForm.tsx — Log in (default) or Sign up, like most big websites:
// "Continue with Google" first, then email + password, and a switch link at the bottom.
import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { rememberGuest, signIn, signUp, type AuthState } from "./actions";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="size-5" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

export function LoginForm({ next, linkError, initialMode = "signin" }: { next: string; linkError: boolean; initialMode?: "signin" | "signup" }) {
  const t = useTranslations("account.login");
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const [inState, inAction, inPending] = useActionState<AuthState, FormData>(signIn, {});
  const [upState, upAction, upPending] = useActionState<AuthState, FormData>(signUp, {});
  const [google, setGoogle] = useState<"idle" | "busy" | "failed">("idle");

  const state = mode === "signin" ? inState : upState;
  const pending = inPending || upPending;

  const withGoogle = async () => {
    setGoogle("busy");
    try {
      await rememberGuest(); // so the plan she just made moves into her Google account
      const { error } = await createSupabaseBrowserClient().auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/login/callback?next=${encodeURIComponent(next)}` },
      });
      if (error) setGoogle("failed");
    } catch {
      setGoogle("failed");
    }
  };

  if (mode === "signup" && upState.checkEmail) {
    return (
      <Card className="space-y-2">
        <h2 className="text-lg font-bold text-forest">{t("checkEmailTitle")}</h2>
        <p className="text-sm text-muted">{t("checkEmailBody")}</p>
      </Card>
    );
  }

  const input = "min-h-12 w-full rounded-2xl border-2 border-line bg-white px-4 text-base focus:border-coral/60 focus:outline-none";

  return (
    <Card className="space-y-5 p-5">
      <button
        type="button"
        onClick={withGoogle}
        disabled={google === "busy"}
        className="flex min-h-14 w-full items-center justify-center gap-3 rounded-full border-2 border-line bg-white font-semibold text-ink shadow-soft transition-colors hover:bg-mint disabled:opacity-60"
      >
        {google === "busy" ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <GoogleIcon />}
        {t("google")}
      </button>
      {google === "failed" && <p role="alert" className="rounded-2xl bg-sun-light p-3 text-sm">{t("googleFailed")}</p>}

      <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-muted">
        <span className="h-px flex-1 bg-line" />
        {t("orEmail")}
        <span className="h-px flex-1 bg-line" />
      </div>

      <form action={mode === "signin" ? inAction : upAction} className="space-y-3" key={mode}>
        <input type="hidden" name="next" value={next} />
        <label className="block space-y-1">
          <span className="text-sm font-semibold text-forest">{t("email")}</span>
          <input name="email" type="email" required autoComplete="email" inputMode="email" className={input} />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-semibold text-forest">{t("password")}</span>
          <input name="password" type="password" required minLength={8} autoComplete={mode === "signin" ? "current-password" : "new-password"} className={input} />
          {mode === "signup" && <span className="text-xs text-muted">{t("passwordHint")}</span>}
        </label>

        {(state.error || linkError) && (
          <p role="alert" className="rounded-2xl bg-danger/10 p-3 text-sm text-danger">
            {t(`errors.${state.error ?? "link"}`)}
          </p>
        )}

        <Button type="submit" block size="lg" disabled={pending}>
          {pending ? t("wait") : t(mode === "signin" ? "signIn" : "signUp")}
        </Button>
      </form>

      <p className="text-center text-sm text-muted">
        {mode === "signin" ? t("noAccount") : t("haveAccount")}{" "}
        <button type="button" onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="font-bold text-coral-600 underline-offset-2 hover:underline">
          {mode === "signin" ? t("signUpLink") : t("signInLink")}
        </button>
      </p>
    </Card>
  );
}
