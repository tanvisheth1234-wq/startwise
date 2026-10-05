"use server";
// src/features/marketing/photo.ts — Photo → product: the AI looks at a product photo and writes the
// name, description and caption. The price comes from the founder's own costs (code), never the AI.
// Photos are only analysed, never stored.
import { z } from "zod";
import { requirePlan } from "@/lib/auth";
import { callJson } from "@/lib/ai/callJson";
import { baseRules } from "@/lib/ai/prompts/base";
import { getProvider } from "@/lib/ai/provider";
import { loadCostLines, loadInputs } from "@/features/money/server/store";
import { suggestedPriceRange, totals } from "@/features/money/lib/calc";
import { PRICE_RANGES } from "@/knowledge/data";

const Seen = z.object({
  isProduct: z.boolean(),
  name: z.string(),
  description: z.string(),
  caption: z.string(),
  hashtags: z.array(z.string()).max(8),
  photoTips: z.array(z.string()).max(3),
  matchesItem: z.string().nullable(),
});

export type ProductCard = z.infer<typeof Seen> & {
  price: { yours: number; low: number; high: number; localLow: number | null; localHigh: number | null; costPerItem: number };
};

const MAX_BYTES = 1_500_000;

export async function analyzeProductPhoto(planId: string, dataUrl: string, captionLang: string): Promise<{ ok: true; card: ProductCard } | { ok: false; error: "notImage" | "notProduct" | "ai" }> {
  const plan = await requirePlan(planId);
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!m || m[2].length > MAX_BYTES * 1.4) return { ok: false, error: "notImage" };
  const lang = plan.language;
  const items = PRICE_RANGES.filter((p) => p.businessType === plan.profile?.businessType);

  try {
    const seen = await callJson(
      Seen,
      {
        system: [
          baseRules(lang),
          "You see a photo a small home-business founder took of something they sell.",
          "isProduct: false if the photo shows a person's face, an ID card, a document or nothing sellable.",
          "name: an appetising, specific product name (max 6 words, e.g. 'Chocolate Truffle Birthday Cake').",
          "description: 1–2 sentences for a WhatsApp catalogue, describing only what is visible. Never claim ingredients, weight or health benefits you can't see.",
          `caption: a ready-to-post Instagram/WhatsApp caption in ${captionLang}, warm, 2–3 short lines, 2–3 emojis, ending with how to order on WhatsApp. Write ₹___ where a price goes.`,
          "hashtags: 5–8 relevant hashtags, include #Pune and the area if known.",
          "photoTips: up to 3 short tips to make THIS photo look better (light, background, angle).",
          `matchesItem: which of these items it is closest to, exactly as written, or null: ${JSON.stringify(items.map((i) => i.item.en))}.`,
          'Return JSON: {"isProduct":true,"name":"","description":"","caption":"","hashtags":[],"photoTips":[],"matchesItem":null}',
        ].join("\n"),
        user: `Business: ${plan.profile?.product ?? ""} in ${[plan.profile?.locality, plan.profile?.city].filter(Boolean).join(", ")}.`,
        image: { mime: m[1], data: m[2] },
      },
      { temperature: 0.6, provider: getProvider(), fast: true },
    );
    if (!seen.isProduct) return { ok: false, error: "notProduct" };

    const lines = await loadCostLines(planId);
    const inputs = await loadInputs(planId, plan.profile?.businessType ?? "other");
    const range = suggestedPriceRange(lines);
    const local = items.find((i) => i.item.en === seen.matchesItem) ?? null;
    return {
      ok: true,
      card: {
        ...seen,
        price: { yours: inputs.price, low: range.low, high: range.high, localLow: local?.lowInr ?? null, localHigh: local?.highInr ?? null, costPerItem: totals(lines).unitCost },
      },
    };
  } catch {
    return { ok: false, error: "ai" };
  }
}
