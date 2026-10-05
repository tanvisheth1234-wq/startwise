// app/plan/[planId]/market/page.tsx — Market check (#14, #15): who sells nearby and the usual prices
import { getLocale, getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui";
import { Lang } from "@/contracts/profile";
import type { Nearby } from "@/features/market/actions";
import { MarketView } from "@/features/market/components/MarketView";
import { getSection } from "@/features/validate/server/sections";
import { PRICE_RANGES } from "@/knowledge/data";
import { marketKind } from "@/features/market/lib/category";
import { requirePlan } from "@/lib/auth";

const inr = (n: number) => "₹" + n.toLocaleString("en-IN");

export default async function MarketPage({ params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params;
  const plan = await requirePlan(planId);
  const parsed = Lang.safeParse(await getLocale());
  const lang = parsed.success ? parsed.data : plan.language;
  const t = await getTranslations("market");
  const area = [plan.profile?.locality, plan.profile?.city].filter(Boolean).join(", ");
  const cached = await getSection<Nearby>(planId, "market", "en");
  // Only reviewed prices for HER kind of business; otherwise no table (never made-up prices).
  const kind = plan.profile ? marketKind(plan.profile) : null;
  const prices = kind ? PRICE_RANGES.filter((p) => p.kind === kind) : [];

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-extrabold text-forest">{t("title")}</h1>
        <p className="text-muted">{t("subtitle")}</p>
      </header>

      <MarketView planId={planId} initial={cached && cached.content.area === area && cached.content.kind === kind ? cached.content : null} />

      {prices.length > 0 && (
        <section className="space-y-2 rounded-3xl border border-line/70 bg-white p-4 shadow-soft">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-lg font-bold text-forest">{t("pricesTitle")}</h2>
            <Badge tone="sun">{t("estimate")}</Badge>
          </div>
          <ul className="divide-y divide-line/60">
            {prices.map((p) => (
              <li key={p.item.en} className="flex items-center justify-between py-2">
                <span className="text-ink">{p.item[lang]}</span>
                <span className="font-display font-bold text-coral-600">{inr(p.lowInr)}–{inr(p.highInr)}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted">{t("pricesNote")}</p>
        </section>
      )}
    </div>
  );
}
