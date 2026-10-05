// app/plan/[planId]/marketing/page.tsx — Grow: Marketing Buddy, name ideas and the WhatsApp price card
import { getLocale, getTranslations } from "next-intl/server";
import { loadMarketing, loadNames, type CaptionLang } from "@/features/marketing/actions";
import { MarketingBuddy } from "@/features/marketing/components/MarketingBuddy";
import { NameIdeasCard } from "@/features/marketing/components/NameIdeas";
import { PhotoToProduct } from "@/features/marketing/components/PhotoToProduct";
import { PriceCard } from "@/features/marketing/components/PriceCard";
import { loadInputs } from "@/features/money/server/store";
import { requirePlan } from "@/lib/auth";

const DEFAULT_CAPTION: Record<string, CaptionLang> = { en: "hinglish", hi: "hindi", mr: "marathi" };
const CAPTION_LANG_TEXT: Record<CaptionLang, string> = {
  english: "simple English",
  hinglish: "Hinglish (Hindi in Roman letters mixed with English)",
  hindi: "Hindi (Devanagari script)",
  marathi: "Marathi (Devanagari script)",
};

export default async function MarketingPage({ params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params;
  const plan = await requirePlan(planId);
  const t = await getTranslations("marketing");
  const locale = await getLocale();
  const [state, names, inputs] = await Promise.all([
    loadMarketing(planId),
    loadNames(planId),
    loadInputs(planId, plan.profile?.businessType ?? "other"),
  ]);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-extrabold text-forest">{t("title")}</h1>
        <p className="text-muted">{t("subtitle")}</p>
      </header>
      <PhotoToProduct planId={planId} captionLang={CAPTION_LANG_TEXT[DEFAULT_CAPTION[locale] ?? "english"]} />
      <MarketingBuddy planId={planId} initial={state} defaultLang={DEFAULT_CAPTION[locale] ?? "english"} />
      <PriceCard product={plan.profile?.product ?? plan.title} area={[plan.profile?.locality, plan.profile?.city].filter(Boolean).join(", ")} price={inputs.price} names={names} />
      <NameIdeasCard planId={planId} initial={names} />
    </div>
  );
}
