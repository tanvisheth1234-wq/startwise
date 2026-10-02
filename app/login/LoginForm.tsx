"use client";
// app/login/LoginForm.tsx   OWNER: T1
import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Button, Card, cn } from "@/components/ui";
import { signIn, signUp, type AuthState } from "./actions";

export function LoginForm({ next, linkError }: { next: string; linkError: boolean }) {
  const t = useTranslations("account.login");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [inState, inAction, inPending] = useActionState<AuthState, FormData>(signIn, {});
  const [upState, upAction, upPending] = useActionState<AuthState, FormData>(signUp, {});

  const state = mode === "signin" ? inState : upState;
  const pending = inPending || upPending;

  if (mode === "signup" && upState.checkEmail) {
    return (
      <Card className="space-y-2">
        <h2 className="text-lg font-semibold text-forest">{t("checkEmailTitle")}</h2>
        <p className="text-sm text-muted">{t("checkEmailBody")}</p>
      </Card>
    );
  }

  return (
    <Card className="space-y-4">
      <div role="tablist" className="grid grid-cols-2 gap-1 rounded-xl bg-mint p-1">
        {(["signin", "signup"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={cn("min-h-11 rounded-lg text-sm font-semibold", mode === m ? "bg-white text-forest shadow-sm" : "text-muted")}
          >
            {t(m === "signin" ? "signInTab" : "signUpTab")}
          </button>
        ))}
      </div>

      <form action={mode === "signin" ? inAction : upAction} className="space-y-3">
        <input type="hidden" name="next" value={next} />
        <label className="block space-y-1">
          <span className="text-sm font-medium">{t("email")}</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            className="min-h-11 w-full rounded-xl border border-line px-3 text-base"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium">{t("password")}</span>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            className="min-h-11 w-full rounded-xl border border-line px-3 text-base"
          />
          {mode === "signup" && <span className="text-xs text-muted">{t("passwordHint")}</span>}
        </label>

        {(state.error || linkError) && (
          <p role="alert" className="rounded-lg bg-danger/10 p-2 text-sm text-danger">
            {t(`errors.${state.error ?? "link"}`)}
          </p>
        )}

        <Button type="submit" block size="lg" disabled={pending}>
          {pending ? t("wait") : t(mode === "signin" ? "signIn" : "signUp")}
        </Button>
      </form>
    </Card>
  );
}
