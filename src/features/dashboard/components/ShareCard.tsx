"use client";
// "Share my business": draws her launching-soon card in the browser (so Hindi and Marathi letters join
// correctly), then opens the phone's share sheet for WhatsApp. On a laptop it downloads the picture instead.
import { useState } from "react";
import { motion } from "motion/react";
import { Loader2, Share2 } from "lucide-react";

export type ShareCardData = {
  soon: string;
  product: string;
  by: string;
  facts: { label: string; value: string }[];
  cta: string;
  made: string;
  leaves: boolean[];
  bloom: boolean;
  text: string;
};

const W = 1080;
const H = 1350;
const C = { cream: "#fffaf4", cocoa: "#4a2c22", muted: "#7d665b", coral: "#ec6a3c", coralDark: "#d9562a", sun: "#ffc24b", sage: "#3f8a68", line: "#e6cdb9", peach: "#fff0e3" };

export function ShareCard({ data, label, savedLabel, fileName }: { data: ShareCardData; label: string; savedLabel: string; fileName: string }) {
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const share = async () => {
    setBusy(true);
    try {
      const blob = await drawCard(data);
      const file = new File([blob], `${fileName}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: data.text }).catch(() => {});
      } else {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(a.href);
        setSaved(true);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-1.5">
      <motion.button
        type="button"
        onClick={share}
        disabled={busy}
        whileTap={{ scale: 0.97 }}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full border-2 border-coral/30 bg-white font-semibold text-coral-600 shadow-soft hover:border-coral disabled:opacity-70"
      >
        {busy ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Share2 className="size-5" aria-hidden />}
        {label}
      </motion.button>
      {saved && (
        <p role="status" className="text-center text-xs font-semibold text-sage">
          {savedLabel}
        </p>
      )}
    </div>
  );
}

/** Paint the card on a canvas with the app's own fonts and return it as a PNG. */
async function drawCard(d: ShareCardData): Promise<Blob> {
  const family = getComputedStyle(document.documentElement).getPropertyValue("--font-baloo").trim() || "sans-serif";
  const all = [d.soon, d.product, d.by, d.cta, d.made, ...d.facts.flatMap((f) => [f.label, f.value])].join(" ");
  await Promise.all([document.fonts.load(`800 60px ${family}`, all), document.fonts.load(`500 40px ${family}`, all)]).catch(() => {});

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const font = (weight: number, size: number) => (ctx.font = `${weight} ${size}px ${family}`);

  // background and soft circles
  ctx.fillStyle = C.cream;
  ctx.fillRect(0, 0, W, H);
  circle(ctx, 930, 150, 350, "rgba(255,194,75,0.25)");
  circle(ctx, 160, 1150, 380, "rgba(236,106,60,0.14)");

  // brand
  const grad = ctx.createLinearGradient(80, 80, 144, 144);
  grad.addColorStop(0, C.sun);
  grad.addColorStop(1, C.coral);
  roundRect(ctx, 80, 80, 64, 64, 18, grad);
  font(800, 40);
  ctx.fillStyle = C.cocoa;
  ctx.textBaseline = "middle";
  ctx.fillText("StartWise", 162, 114);

  // launching soon + her business
  ctx.textBaseline = "alphabetic";
  font(800, 40);
  ctx.fillStyle = C.coralDark;
  ctx.fillText(d.soon.toUpperCase(), 80, 262);
  let size = 104;
  font(800, size);
  let lines = wrap(ctx, d.product, 920);
  if (lines.length > 2) {
    size = 78;
    font(800, size);
    lines = wrap(ctx, d.product, 920).slice(0, 3);
  }
  ctx.fillStyle = C.cocoa;
  let y = 262 + size + 10;
  for (const l of lines) {
    ctx.fillText(l, 80, y);
    y += size * 1.08;
  }
  if (d.by) {
    font(500, 44);
    ctx.fillStyle = C.muted;
    ctx.fillText(d.by, 80, y + 10);
    y += 60;
  }

  // facts on the left, her plant on the right
  let fy = Math.max(y + 70, 640);
  for (const f of d.facts) {
    roundRect(ctx, 80, fy, 550, 134, 32, C.peach);
    font(500, 28);
    ctx.fillStyle = C.muted;
    ctx.fillText(f.label, 110, fy + 52);
    font(800, 40);
    ctx.fillStyle = C.cocoa;
    ctx.fillText(wrap(ctx, f.value, 490)[0], 110, fy + 102);
    fy += 154;
  }
  drawPlant(ctx, 835, fy - 40, d.leaves, d.bloom);

  // call to action
  font(800, 44);
  const ctaW = Math.min(ctx.measureText(d.cta).width + 88, 640);
  const g2 = ctx.createLinearGradient(80, 1150, 80 + ctaW, 1270);
  g2.addColorStop(0, C.coral);
  g2.addColorStop(1, C.coralDark);
  roundRect(ctx, 80, 1152, ctaW, 118, 59, g2);
  ctx.fillStyle = "#fff";
  ctx.textBaseline = "middle";
  ctx.fillText(d.cta, 124, 1213);
  font(500, 28);
  ctx.fillStyle = C.muted;
  ctx.textAlign = "right";
  ctx.fillText(d.made, 1000, 1213);

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b!), "image/png"));
}

function drawPlant(ctx: CanvasRenderingContext2D, x: number, base: number, leaves: boolean[], bloom: boolean) {
  const top = base - 360;
  ctx.lineCap = "round";
  ctx.strokeStyle = C.sage;
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(x, base);
  ctx.lineTo(x, top + 20);
  ctx.stroke();
  leaves.forEach((done, i) => {
    const y = base - 60 - i * 70;
    const side = i % 2 === 0 ? -1 : 1;
    ctx.strokeStyle = done ? C.sage : C.line;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + side * 40, y - 4, x + side * 85, y - 32);
    ctx.stroke();
    ctx.save();
    ctx.translate(x + side * 102, y - 40);
    ctx.rotate(((side > 0 ? -25 : 25) * Math.PI) / 180);
    ctx.fillStyle = done ? C.sage : C.line;
    ctx.beginPath();
    ctx.ellipse(0, 0, 26, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
  if (bloom) {
    for (let k = 0; k < 7; k++) circle(ctx, x + Math.cos((k / 7) * Math.PI * 2) * 22, top + Math.sin((k / 7) * Math.PI * 2) * 22, 17, C.coral);
    circle(ctx, x, top, 15, C.sun);
  } else {
    circle(ctx, x, top + 4, 16, C.coral);
  }
  // pot
  ctx.fillStyle = C.coral;
  ctx.beginPath();
  ctx.moveTo(x - 65, base + 8);
  ctx.lineTo(x + 65, base + 8);
  ctx.lineTo(x + 51, base + 60);
  ctx.lineTo(x - 51, base + 60);
  ctx.closePath();
  ctx.fill();
  roundRect(ctx, x - 75, base - 8, 150, 22, 10, C.coralDark);
}

function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: string | CanvasGradient) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}

function wrap(ctx: CanvasRenderingContext2D, text: string, max: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (ctx.measureText(next).width > max && line) {
      lines.push(line);
      line = w;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}
