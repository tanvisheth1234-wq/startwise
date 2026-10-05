// app/login/page.tsx   OWNER: T1 — sign up / sign in
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getUser } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string; mode?: string }> }) {
  const { next: rawNext, error, mode } = await searchParams;
  const saving = mode === "save";
  const next = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";
  const user = await getUser();
  if (user && !user.isGuest) redirect(next); // guests come here to save their plan

  const t = await getTranslations("account.login");
  return (
    <main className="mx-auto max-w-md space-y-4 px-4 py-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-extrabold text-forest">{saving ? t("saveTitle") : t("title")}</h1>
        <p className="text-muted">{saving ? t("saveSubtitle") : t("subtitle")}</p>
      </div>
      <LoginForm next={next} linkError={error === "link"} />
    </main>
  );
}
