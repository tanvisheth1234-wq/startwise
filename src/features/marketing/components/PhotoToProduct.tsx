"use client";
// 📸 Photo → product: snap what you sell; get a name, catalogue description, caption, hashtags and
// photo tips, a price from your own costs, and your real photo on the WhatsApp price card.
import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Camera, Check, Copy, ImagePlus, Loader2, MessageCircle, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui";
import { analyzeProductPhoto, type ProductCard } from "../photo";

const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

/** Shrinks the photo on the phone first (max 1024 px, JPEG) so it uploads fast on mobile data. */
async function shrink(file: File): Promise<string> {
  const img = await createImageBitmap(file);
  const scale = Math.min(1, 1024 / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * scale);
  c.height = Math.round(img.height * scale);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.85);
}

export function PhotoToProduct({ planId, captionLang }: { planId: string; captionLang: string }) {
  const t = useTranslations("marketing.photo");
  const input = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [card, setCard] = useState<ProductCard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setCard(null);
    const dataUrl = await shrink(file);
    setPhoto(dataUrl);
    start(async () => {
      const r = await analyzeProductPhoto(planId, dataUrl, captionLang);
      if (r.ok) setCard(r.card);
      else setError(t(`errors.${r.error}`));
    });
  };

  const fullCaption = card ? `${card.caption}\n\n${card.hashtags.join(" ")}` : "";

  return (
    <section className="space-y-3 overflow-hidden rounded-[2rem] bg-gradient-to-br from-sun-light via-mint to-berry-light p-4">
      <h2 className="flex items-center gap-2 font-display text-xl font-bold text-forest">
        <Camera className="size-6 text-coral" aria-hidden />
        {t("title")}
      </h2>
      <p className="text-sm text-forest-700">{t("subtitle")}</p>

      <input ref={input} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => void pick(e.target.files?.[0])} />

      {!photo && (
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="flex min-h-40 w-full flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-coral/40 bg-white/70 font-display text-lg font-bold text-coral-600"
        >
          <ImagePlus className="size-10" aria-hidden />
          {t("snap")}
          <span className="text-xs font-semibold text-muted">{t("privacy")}</span>
        </button>
      )}

      {photo && (
        <div className="space-y-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- a local data URL preview */}
          <img src={photo} alt={card?.name ?? t("yourPhoto")} className="aspect-square w-full rounded-3xl object-cover shadow-lift" />
          {pending && (
            <p className="flex items-center justify-center gap-2 rounded-2xl bg-white/80 p-3 font-semibold text-forest">
              <Loader2 className="size-5 animate-spin" aria-hidden />
              {t("looking")}
            </p>
          )}
          {error && <p role="alert" className="rounded-2xl bg-white p-3 text-sm text-danger">{error}</p>}

          {card && (
            <div className="animate-rise space-y-3 rounded-3xl bg-white p-4 shadow-soft">
              <p className="flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-coral-600">
                <Sparkles className="size-3.5" aria-hidden />
                {t("found")}
              </p>
              <h3 className="font-display text-2xl font-extrabold leading-tight text-forest">{card.name}</h3>
              <p className="text-ink">{card.description}</p>

              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="rounded-2xl bg-sage-light p-2">
                  <p className="text-[11px] font-semibold text-sage">{t("yourPrice")}</p>
                  <p className="font-display text-xl font-extrabold text-forest">{inr(card.price.yours)}</p>
                  <p className="text-[10px] text-muted">{t("costIs", { cost: inr(card.price.costPerItem) })}</p>
                </div>
                <div className="rounded-2xl bg-sun-light p-2">
                  <p className="text-[11px] font-semibold text-[#8a5a00]">{card.price.localLow ? t("localPrice") : t("suggested")}</p>
                  <p className="font-display text-xl font-extrabold text-forest">
                    {card.price.localLow ? `${inr(card.price.localLow)}–${inr(card.price.localHigh!)}` : `${inr(card.price.low)}–${inr(card.price.high)}`}
                  </p>
                  <p className="text-[10px] text-muted">{t("estimate")}</p>
                </div>
              </div>

              <p className="whitespace-pre-wrap rounded-2xl bg-mint/70 p-3 text-sm text-ink">{fullCaption}</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(fullCaption.replace("₹___", inr(card.price.yours))).catch(() => {});
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                  className="flex min-h-11 items-center justify-center gap-1 rounded-2xl border-2 border-line text-sm font-semibold text-forest"
                >
                  {copied ? <Check className="size-4 text-sage" aria-hidden /> : <Copy className="size-4" aria-hidden />}
                  {copied ? t("copied") : t("copy")}
                </button>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(fullCaption.replace("₹___", inr(card.price.yours)))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-11 items-center justify-center gap-1 rounded-2xl bg-sage text-sm font-semibold text-white"
                >
                  <MessageCircle className="size-4" aria-hidden />
                  WhatsApp
                </a>
              </div>

              {card.photoTips.length > 0 && (
                <div className="rounded-2xl bg-sky-light/60 p-3">
                  <p className="text-sm font-bold text-forest">{t("tipsTitle")}</p>
                  <ul className="mt-1 list-inside list-disc text-sm text-ink">
                    {card.photoTips.map((tip) => <li key={tip}>{tip}</li>)}
                  </ul>
                </div>
              )}

              <Button
                block
                onClick={() => window.dispatchEvent(new CustomEvent("sw:photo", { detail: { photo, name: card.name, price: card.price.yours } }))}
              >
                <Sparkles className="size-5" aria-hidden />
                {t("toCard")}
              </Button>
            </div>
          )}

          <button type="button" onClick={() => input.current?.click()} disabled={pending} className="flex min-h-11 w-full items-center justify-center gap-2 text-sm font-semibold text-forest-700">
            <RefreshCw className="size-4" aria-hidden />
            {t("another")}
          </button>
        </div>
      )}
    </section>
  );
}
