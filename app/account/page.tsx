// app/account/page.tsx — Account: saved plans, language, privacy and delete-my-data (#46, #47)
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { CloudUpload, ShieldCheck } from "lucide-react";
import { LanguageSwitch, buttonClasses } from "@/components/ui";
import { DeleteMyData, PlansList } from "@/features/account/components/AccountControls";
import { listPlans } from "@/features/account/server/plans";
import { requireUser } from "@/lib/auth";

export default async function AccountPage() {
  const user = await requireUser("/account");
  const t = await getTranslations("account.page");
  const plans = await listPlans(user.id);

  return (
    <main className="mx-auto max-w-md space-y-6 px-4 py-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-extrabold text-forest">{t("title")}</h1>
        <p className="text-muted">{user.isGuest ? t("guest") : t("signedInAs", { email: user.email })}</p>
      </header>

      {user.isGuest && (
        <Link href="/login?mode=save" className={buttonClasses("primary", "lg", "w-full")}>
          <CloudUpload className="size-5" aria-hidden />
          {t("saveCta")}
        </Link>
      )}

      <section className="space-y-2">
        <h2 className="font-display text-lg font-bold text-forest">{t("plans")}</h2>
        <PlansList plans={plans.map((p) => ({ id: p.id, title: p.title, status: p.status }))} />
      </section>

      <section className="flex items-center justify-between gap-2 rounded-3xl border border-line/70 bg-white p-4 shadow-soft">
        <span className="font-semibold text-forest">{t("language")}</span>
        <LanguageSwitch />
      </section>

      <section className="space-y-3 rounded-3xl bg-sage-light/70 p-4">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold text-sage">
          <ShieldCheck className="size-5" aria-hidden />
          {t("privacyTitle")}
        </h2>
        <ul className="list-inside list-disc space-y-1 text-sm text-ink">
          <li>{t("privacy1")}</li>
          <li>{t("privacy2")}</li>
          <li>{t("privacy3")}</li>
        </ul>
        <DeleteMyData />
      </section>
    </main>
  );
}
