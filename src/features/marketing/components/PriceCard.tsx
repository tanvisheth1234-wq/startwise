"use client";
// WhatsApp price card: a pretty 1080×1350 image drawn on a canvas, ready to share or set as status.
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Download, Share2 } from "lucide-react";
import { cn } from "@/components/ui";
import type { NameIdeas } from "@/lib/ai/extras";

const THEMES = [
  { key: "sunset", bg: ["#ffc24b", "#ec6a3c", "#c2477a"], ink: "#ffffff", chip: "rgba(255,255,255,0.22)" },
  { key: "cream", bg: ["#fffaf4", "#ffe6d1", "#ffd3b0"], ink: "#4a2c22", chip: "rgba(236,106,60,0.15)" },
  { key: "mint", bg: ["#e2f2e9", "#bfe3cf", "#3f8a68"], ink: "#1f3a2e", chip: "rgba(255,255,255,0.5)" },
] as const;

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

export function PriceCard({ product, area, price, names }: { product: string; area: string; price: number; names: NameIdeas | null }) {
  const t = useTranslations("marketing.card");
  const canvas = useRef<HTMLCanvasElement>(null);
  const [brand, setBrand] = useState(names?.names[0]?.name ?? "");
  const [title, setTitle] = useState(product.charAt(0).toUpperCase() + product.slice(1));
  const [amount, setAmount] = useState(String(price));
  const [line, setLine] = useState(t("defaultLine"));
  const [theme, setTheme] = useState(0);
  const [canShare, setCanShare] = useState(false);
  const [photo, setPhoto] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    const on = (e: Event) => {
      const d = (e as CustomEvent<{ name: string; tagline: string }>).detail;
      setBrand(d.name);
      setLine(d.tagline);
      canvas.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    };
    const onPhoto = (e: Event) => {
      const d = (e as CustomEvent<{ photo: string; name: string; price: number }>).detail;
      const img = new Image();
      img.onload = () => setPhoto(img);
      img.src = d.photo;
      setTitle(d.name);
      setAmount(String(d.price));
      canvas.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    };
    window.addEventListener("sw:brand", on);
    window.addEventListener("sw:photo", onPhoto);
    const id = setTimeout(() => setCanShare(typeof navigator !== "undefined" && "canShare" in navigator), 0);
    return () => {
      window.removeEventListener("sw:brand", on);
      window.removeEventListener("sw:photo", onPhoto);
      clearTimeout(id);
    };
  }, []);

  useEffect(() => {
    const c = canvas.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    const th = THEMES[theme];
    const W = 1080, H = 1350;
    const g = ctx.createLinearGradient(0, 0, W, H);
    th.bg.forEach((col, i) => g.addColorStop(i / (th.bg.length - 1), col));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // Soft circles for warmth.
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.beginPath(); ctx.arc(W - 120, 160, 260, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(80, H - 120, 220, 0, Math.PI * 2); ctx.fill();

    const font = (w: number, s: number) => `${w} ${s}px "Baloo 2", "Noto Sans Devanagari", system-ui, sans-serif`;
    ctx.fillStyle = th.ink;
    ctx.textAlign = "center";

    if (photo) {
      // Photo layout: the real product on top (cover-cropped, rounded), words and price below.
      const px = 70, py = 70, pw = W - 140, ph = 760;
      const s = Math.max(pw / photo.width, ph / photo.height);
      const sw = pw / s, sh = ph / s;
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(px, py, pw, ph, 56);
      ctx.clip();
      ctx.drawImage(photo, (photo.width - sw) / 2, (photo.height - sh) / 2, sw, sh, px, py, pw, ph);
      ctx.restore();
      if (brand) {
        ctx.fillStyle = "rgba(0,0,0,0.45)";
        ctx.beginPath();
        ctx.roundRect(px + 30, py + 30, Math.min(pw - 60, ctx.measureText(brand).width + 400), 90, 45);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.font = font(800, 52);
        ctx.textAlign = "left";
        ctx.fillText(brand, px + 70, py + 92);
        ctx.textAlign = "center";
      }
      ctx.fillStyle = th.ink;
      ctx.font = font(800, 72);
      const tl = wrap(ctx, title, W - 160).slice(0, 2);
      tl.forEach((l, i) => ctx.fillText(l, W / 2, 920 + i * 82));
      const y = 920 + tl.length * 82 + 40;
      ctx.font = font(800, 110);
      ctx.fillText(`₹${amount || "—"}`, W / 2, y + 60);
      ctx.font = font(600, 40);
      ctx.fillText(`${t("orderLine")}${area ? `  ·  📍 ${area}` : ""}`, W / 2, H - 60);
      return;
    }

    if (brand) {
      ctx.font = font(800, 64);
      ctx.fillText(brand, W / 2, 190);
    }
    ctx.font = font(500, 40);
    ctx.globalAlpha = 0.85;
    ctx.fillText(line, W / 2, brand ? 260 : 200);
    ctx.globalAlpha = 1;

    ctx.font = font(800, 104);
    const lines = wrap(ctx, title, W - 160);
    lines.forEach((l, i) => ctx.fillText(l, W / 2, 520 + i * 116));

    const priceY = 520 + lines.length * 116 + 120;
    ctx.fillStyle = th.chip;
    const pw = 560, ph = 210;
    ctx.beginPath();
    ctx.roundRect((W - pw) / 2, priceY - 150, pw, ph, 60);
    ctx.fill();
    ctx.fillStyle = th.ink;
    ctx.font = font(800, 150);
    ctx.fillText(`₹${amount || "—"}`, W / 2, priceY + 20);

    ctx.font = font(600, 44);
    ctx.fillText(t("orderLine"), W / 2, H - 230);
    if (area) {
      ctx.font = font(500, 38);
      ctx.globalAlpha = 0.85;
      ctx.fillText(`📍 ${area}`, W / 2, H - 160);
      ctx.globalAlpha = 1;
    }
  }, [brand, title, amount, line, theme, area, t, photo]);

  const blob = () => new Promise<Blob | null>((res) => canvas.current?.toBlob(res, "image/png"));
  const download = async () => {
    const b = await blob();
    if (!b) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(b);
    a.download = "price-card.png";
    a.click();
  };
  const share = async () => {
    const b = await blob();
    if (!b) return;
    const file = new File([b], "price-card.png", { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], text: `${title} · ₹${amount}` }).catch(() => {});
    else void download();
  };

  const input = "min-h-11 w-full rounded-2xl border-2 border-line bg-white px-3 text-base focus:border-coral/60 focus:outline-none";
  return (
    <section className="space-y-3 rounded-3xl border border-line/70 bg-white p-4 shadow-soft">
      <h2 className="font-display text-xl font-bold text-forest">{t("title")}</h2>
      <p className="text-sm text-muted">{t("subtitle")}</p>
      <canvas ref={canvas} width={1080} height={1350} className="w-full rounded-2xl shadow-lift" aria-label={t("preview")} />
      <div className="flex gap-2">
        {THEMES.map((th, i) => (
          <button
            key={th.key}
            type="button"
            aria-label={t(`themes.${th.key}`)}
            aria-pressed={theme === i}
            onClick={() => setTheme(i)}
            className={cn("size-10 rounded-full border-4", theme === i ? "border-forest" : "border-white shadow-soft")}
            style={{ background: `linear-gradient(135deg, ${th.bg.join(",")})` }}
          />
        ))}
      </div>
      <div className="grid gap-2">
        <input className={input} value={brand} onChange={(e) => setBrand(e.target.value)} placeholder={t("brand")} aria-label={t("brand")} maxLength={30} />
        <input className={input} value={title} onChange={(e) => setTitle(e.target.value)} aria-label={t("product")} maxLength={50} />
        <div className="grid grid-cols-[1fr_2fr] gap-2">
          <input className={input} value={amount} inputMode="numeric" onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, "").slice(0, 7))} aria-label={t("price")} />
          <input className={input} value={line} onChange={(e) => setLine(e.target.value)} aria-label={t("line")} maxLength={40} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={download} className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border-2 border-forest font-semibold text-forest">
          <Download className="size-5" aria-hidden />
          {t("download")}
        </button>
        <button type="button" onClick={share} className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-sage font-semibold text-white">
          <Share2 className="size-5" aria-hidden />
          {canShare ? t("share") : t("download")}
        </button>
      </div>
    </section>
  );
}
