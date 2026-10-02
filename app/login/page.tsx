// app/login/page.tsx   OWNER: T1 — sign up / sign in
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getUser } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next: rawNext, error } = await searchParams;
  const next = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";
  if (await getUser()) redirect(next);

  const t = await getTranslations("account.login");
  return (
    <main className="mx-auto max-w-md space-y-4 px-4 py-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-forest">{t("title")}</h1>
        <p className="text-muted">{t("subtitle")}</p>
      </div>
      <LoginForm next={next} linkError={error === "link"} />
    </main>
  );
}
