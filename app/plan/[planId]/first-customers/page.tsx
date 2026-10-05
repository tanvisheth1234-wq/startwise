// app/plan/[planId]/first-customers/page.tsx — First-Customer mode (#39): diary, customer list, starter kit
import { getTranslations } from "next-intl/server";
import { ExternalLink, MapPin, QrCode, Store } from "lucide-react";
import { GuidanceFooter } from "@/components/ui";
import { loadDiary } from "@/features/first-customers/actions";
import { SalesDiary } from "@/features/first-customers/components/SalesDiary";
import { requirePlan } from "@/lib/auth";
import { itemWord } from "@/features/money/server/store";

const KIT = [
  { key: "whatsapp", icon: Store, url: "https://business.whatsapp.com/products/business-app", tone: "bg-sage-light text-sage" },
  { key: "upi", icon: QrCode, url: "https://www.npci.org.in/what-we-do/upi/product-overview", tone: "bg-sky-light text-sky" },
  { key: "google", icon: MapPin, url: "https://business.google.com", tone: "bg-sun-light text-[#8a5a00]" },
] as const;

export default async function FirstCustomersPage({ params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params;
  const plan = await requirePlan(planId);
  const t = await getTranslations("firstCustomers");
  const [diary, item] = await Promise.all([loadDiary(planId), itemWord(planId, plan.profile?.businessType ?? "other", plan.language)]);

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-extrabold text-forest">{t("title")}</h1>
        <p className="text-muted">{t("subtitle")}</p>
      </header>

      <SalesDiary planId={planId} initial={diary} item={item} />

      <section className="space-y-3">
        <h2 className="font-display text-xl font-bold text-forest">{t("kit.title")}</h2>
        <ul className="stagger space-y-2">
          {KIT.map(({ key, icon: Icon, url, tone }) => (
            <li key={key} className="space-y-2 rounded-3xl border border-line/70 bg-white p-4 shadow-soft">
              <p className="flex items-center gap-3">
                <span className={`grid size-10 place-items-center rounded-2xl ${tone}`}><Icon className="size-5" aria-hidden /></span>
                <span className="font-display text-lg font-bold text-forest">{t(`kit.${key}.title`)}</span>
              </p>
              <ol className="list-inside list-decimal space-y-1 text-sm text-ink">
                {[1, 2, 3].map((n) => <li key={n}>{t(`kit.${key}.s${n}`)}</li>)}
              </ol>
              <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-coral-600 hover:underline">
                {t("kit.official")}
                <ExternalLink className="size-3.5" aria-hidden />
              </a>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted">{t("kit.privacy")}</p>
      </section>
      <GuidanceFooter />
    </div>
  );
}
