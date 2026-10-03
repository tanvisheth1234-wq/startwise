// app/page.tsx   OWNER: T1 — Screen 1: Start
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui";
import { listPlans } from "@/features/account/server/plans";
import { StartForm } from "@/features/intake/components/StartForm";
import { getUser } from "@/lib/auth";

export default async function StartPage() {
  const t = await getTranslations("start");
  const user = await getUser();
  const plans = user ? await listPlans(user.id, 3) : [];

  return (
    <main className="mx-auto max-w-md space-y-5 px-4 py-5">
      <section className="space-y-1">
        <h1 className="text-2xl font-bold leading-tight text-forest">{t("tagline")}</h1>
        <p className="text-muted">{t("whatYouGet")}</p>
      </section>

      <StartForm />

      {plans.length > 0 && (
        <section className="space-y-2 pt-2">
          <h2 className="text-lg font-semibold text-forest">{t("yourPlans")}</h2>
          <ul className="space-y-2">
            {plans.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/plan/${p.id}`}
                  className="flex min-h-14 items-center gap-3 rounded-xl border border-line bg-white px-4 hover:bg-mint"
                >
                  <span className="flex-1 truncate font-semibold">{p.title}</span>
                  <Badge tone={p.status === "draft" ? "gold" : "green"}>
                    {t(p.status === "draft" ? "statusDraft" : "statusConfirmed")}
                  </Badge>
                  <ChevronRight className="size-5 text-muted" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
