"use client";
// "Help me do this" for one day of the 7-day test: the app does the hard part with her.
//   Talk to people → 5 questions to ask (+ practise first)
//   WhatsApp status / landing page / flyers → her picture, made and shared in one tap
//   Pre-orders → her ready message and price card
//   Pilot offer → a ready first-customer offer
import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Drama, ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui";
import type { TestPlan, Templates } from "@/contracts/sections";
import { shareCardImage } from "@/features/dashboard/components/ShareCard";
import { fieldClass } from "./SectionShell";
import { ShareRow } from "./TemplatesSection";

type Day = TestPlan["days"][number];
export type PosterInfo = { product: string; by: string; cta: string; made: string };

// A day that asks her to make or print something gets the picture maker too.
const MAKES_SOMETHING = /poster|flyer|pamphlet|leaflet|print|paper|menu image|image|photo|status|card|पोस्टर|पर्चा|पर्चे|प्रिंट|फ़ोटो|फोटो|स्टेटस|पत्रक|चित्र/i;

export function DayHelp({ planId, day, templates, poster }: { planId: string; day: Day; templates: Templates | null; poster: PosterInfo }) {
  const t = useTranslations("validate.help");
  const kind = day.experiment;
  const picture = kind === "whatsapp_status" || kind === "landing_page" || MAKES_SOMETHING.test(day.action);
  const questions = (t.raw("questions") as string[]).map((q) => q.replace("{product}", poster.product.toLowerCase()));

  return (
    <div className="space-y-5">
      <p className="rounded-2xl bg-mint p-3 text-sm text-ink">{day.action}</p>

      {kind === "interviews" && (
        <section className="space-y-2">
          <h3 className="font-display font-bold text-forest">{t("questionsTitle")}</h3>
          <ol className="list-decimal space-y-1.5 pl-5 text-sm text-ink">
            {questions.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ol>
          <ShareRow text={questions.map((q, i) => `${i + 1}. ${q}`).join("\n")} />
          <Link href={`/plan/${planId}/practice`} className="flex min-h-11 items-center gap-2 text-sm font-semibold text-coral-600 hover:underline">
            <Drama className="size-4" aria-hidden />
            {t("practice")}
          </Link>
        </section>
      )}

      {kind === "pre_orders" && (
        <section className="space-y-2">
          <h3 className="font-display font-bold text-forest">{t("messagesTitle")}</h3>
          {templates ? (
            <>
              <p className="whitespace-pre-wrap rounded-2xl border border-line bg-white p-3 text-sm">{templates.whatsappMessage}</p>
              <ShareRow text={templates.whatsappMessage} />
              <p className="whitespace-pre-wrap rounded-2xl border border-line bg-white p-3 text-sm">{templates.priceCard}</p>
              <ShareRow text={templates.priceCard} />
            </>
          ) : (
            <p className="text-sm text-muted">{t("noMessages")}</p>
          )}
        </section>
      )}

      {kind === "pilot_offer" && (
        <section className="space-y-2">
          <h3 className="font-display font-bold text-forest">{t("offerTitle")}</h3>
          <p className="rounded-2xl border border-line bg-white p-3 text-sm">{t("offer", { product: poster.product.toLowerCase() })}</p>
          <ShareRow text={t("offer", { product: poster.product.toLowerCase() })} />
        </section>
      )}

      {picture && <PictureMaker poster={poster} />}
    </div>
  );
}

/** Her status picture / flyer: the StartWise card with "Taking orders this week", her price and number. */
function PictureMaker({ poster }: { poster: PosterInfo }) {
  const t = useTranslations("validate.help");
  const [price, setPrice] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  const make = async () => {
    setBusy(true);
    try {
      await shareCardImage(
        {
          soon: t("posterSoon"),
          product: poster.product,
          by: poster.by,
          facts: [price.trim() && { label: t("priceLabel"), value: price.trim().startsWith("₹") ? price.trim() : `₹${price.trim()}` }, phone.trim() && { label: t("orderOn"), value: phone.trim() }].filter(Boolean) as { label: string; value: string }[],
          cta: poster.cta,
          made: poster.made,
          leaves: [true, false, false, false],
          bloom: false,
          text: `${poster.product}: ${t("posterSoon")}`,
        },
        poster.product.replace(/[^\p{L}\p{N}]+/gu, "-").slice(0, 40) || "my-business",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-2">
      <h3 className="font-display font-bold text-forest">{t("posterTitle")}</h3>
      <p className="text-sm text-muted">{t("posterHint")}</p>
      <label className="block space-y-1 text-sm font-semibold text-forest">
        {t("price")}
        <input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="text" maxLength={40} placeholder="₹120" className={fieldClass} />
      </label>
      <label className="block space-y-1 text-sm font-semibold text-forest">
        {t("phone")}
        <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" maxLength={20} placeholder="98xxxxxx10" className={fieldClass} />
      </label>
      <Button block onClick={make} disabled={busy}>
        {busy ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <ImageIcon className="size-5" aria-hidden />}
        {t("make")}
      </Button>
    </section>
  );
}
