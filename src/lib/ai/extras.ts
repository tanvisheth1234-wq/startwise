// src/lib/ai/extras.ts — AI drafts for the workspace features: notebook shaping, worry box,
// marketing plan, name ideas and the voice sales diary. Same guardrails as every other call:
// strict JSON checked by zod, one retry, base rules, and the AI never decides a number or a rule.
import "server-only";
import { z } from "zod";
import type { BusinessProfile, Lang } from "@/contracts/profile";
import { callJson } from "./callJson";
import { baseRules, json } from "./prompts/base";
import { getProvider } from "./provider";
import { redact } from "./redact";

const ask = <S extends z.ZodType>(schema: S, task: string, user: string, lang: Lang, temperature = 0.5, fast = false) =>
  callJson(schema, { system: `${baseRules(lang)}\n\n${task}`, user: redact(user) }, { temperature, provider: getProvider(), fast });

const brief = (p: BusinessProfile) =>
  json({ businessType: p.businessType, product: p.product, city: p.city, locality: p.locality, premises: p.premises, targetCustomer: p.targetCustomer, sellsOnline: p.sellsOnline });

// ---------------------------------------------------------------- notebook
export const NOTE_GROUPS = ["customers", "product", "money", "worries", "ideas"] as const;
export const ShapedNotes = z.object({
  summary: z.string(),
  groups: z.array(z.object({ key: z.enum(NOTE_GROUPS), insight: z.string(), noteIds: z.array(z.string()) })),
  actions: z.array(z.string()).max(3),
});
export type ShapedNotes = z.infer<typeof ShapedNotes>;

export function shapeNotes(notes: { id: string; text: string }[], profile: BusinessProfile, lang: Lang) {
  return ask(
    ShapedNotes,
    [
      "The founder keeps a messy notebook of thoughts about their business. Give their thoughts a shape.",
      `Put every note id into exactly one group key: ${NOTE_GROUPS.join(", ")}. Omit empty groups.`,
      "For each group write one short, warm insight (max 20 words) that connects the notes.",
      "summary: one encouraging sentence about where their thinking is heading (max 25 words).",
      "actions: up to 3 small, concrete next actions (max 12 words each) that come from the notes.",
      'Shape: {"summary":"","groups":[{"key":"customers","insight":"","noteIds":["n1"]}],"actions":[""]}',
    ].join("\n"),
    `Business:\n${brief(profile)}\n\nNotes:\n${json(notes)}`,
    lang,
    0.4,
  );
}

// ---------------------------------------------------------------- worry box
export const WorryReply = z.object({ comfort: z.string(), reality: z.string(), smallStep: z.string() });
export type WorryReply = z.infer<typeof WorryReply>;

export function answerWorry(worry: string, profile: BusinessProfile, lang: Lang) {
  return ask(
    WorryReply,
    [
      "The founder shares a fear about their business. Answer like a calm, kind mentor who has seen many home businesses start.",
      "comfort: one sentence that shows you understood the feeling (max 20 words).",
      "reality: two short sentences on how common this is and how founders usually handle it. No made-up statistics.",
      "smallStep: ONE tiny action they can do today, under 30 minutes, free (max 18 words).",
      "If the worry is about legal rules or money limits, say they can check the Papers or Money screens; do not state rules.",
      'Shape: {"comfort":"","reality":"","smallStep":""}',
    ].join("\n"),
    `Business:\n${brief(profile)}\n\nWorry: ${worry.slice(0, 600)}`,
    lang,
    0.6,
    true, // fast: a worried founder shouldn't wait
  );
}

// ---------------------------------------------------------------- marketing buddy
export const MarketingPlan = z.object({
  posts: z.array(z.object({
    day: z.enum(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]),
    time: z.string().regex(/^\d{2}:\d{2}$/),
    channel: z.enum(["whatsapp_status", "instagram_post", "instagram_story", "instagram_reel", "whatsapp_broadcast"]),
    idea: z.string(),
    caption: z.string(),
    photoTip: z.string(),
  })).min(4).max(7),
  festivalTip: z.string().nullable(),
  partnerships: z.array(z.object({ who: z.string(), why: z.string(), message: z.string() })).min(2).max(4),
});
export type MarketingPlan = z.infer<typeof MarketingPlan>;

export function draftMarketingPlan(profile: BusinessProfile, lang: Lang, todayIso: string, captionLang: string) {
  return ask(
    MarketingPlan,
    [
      "Make a one-week social media plan for a home business that sells on WhatsApp and Instagram.",
      "5–6 posts across Mon–Sun. Mix channels: WhatsApp status, Instagram post, story (polls, behind the scenes) and one reel.",
      "time: 24-hour HH:MM when their customers are most likely on their phones (e.g. 07:30, 13:00, 19:30, 21:00).",
      "idea: what to post (max 12 words). photoTip: how to take the photo with a phone (max 15 words).",
      `caption: ready to paste, warm, 1–3 short lines, 1–3 emojis, written in ${captionLang}. Never invent prices; write ₹___ if a price is needed.`,
      `festivalTip: if an Indian festival relevant to Pune (Diwali, Ganesh Chaturthi, Navratri, Raksha Bandhan, Christmas, Holi, Gudi Padwa) falls within ~5 weeks of ${todayIso}, one tip to prepare for it; else null. Do not state exact festival dates.`,
      "partnerships: 2–4 local tie-up ideas (e.g. cafés, party planners, schools, gyms, offices, housing societies) with why (max 15 words) and a short ready-to-send WhatsApp message.",
      "Write idea, photoTip, festivalTip, who, why and message in the user's language as instructed above.",
      'Shape: {"posts":[{"day":"Tue","time":"19:30","channel":"whatsapp_status","idea":"","caption":"","photoTip":""}],"festivalTip":null,"partnerships":[{"who":"","why":"","message":""}]}',
    ].join("\n"),
    `Business:\n${brief(profile)}`,
    lang,
    0.8,
    true, // fast: a week of posts in seconds, not half a minute
  );
}

// ---------------------------------------------------------------- names
export const NameIdeas = z.object({ names: z.array(z.object({ name: z.string(), tagline: z.string(), why: z.string() })).min(3).max(6) });
export type NameIdeas = z.infer<typeof NameIdeas>;

export function suggestNames(profile: BusinessProfile, lang: Lang) {
  return ask(
    NameIdeas,
    [
      "Suggest 5 warm, easy-to-say brand names for this small business, with a short tagline each.",
      "Names can mix English with Hindi or Marathi words (written in Roman letters) the way Pune shops do. Avoid real famous brands.",
      "why: one short line on why it fits (in the user's language). tagline in English or Hinglish, max 6 words.",
      'Shape: {"names":[{"name":"","tagline":"","why":""}]}',
    ].join("\n"),
    `Business:\n${brief(profile)}`,
    lang,
    0.9,
    true,
  );
}

// ---------------------------------------------------------------- starting cost estimates
export const CostSuggestion = z.object({
  unit: z.string().min(1).max(30), // what she sells one of: "tiffin", "cake", "class", "blouse"
  price: z.number().min(1).max(10_000_000),
  unitsPerMonth: z.number().min(1).max(1_000_000),
  lines: z.array(z.object({
    label: z.string().min(1).max(60),
    kind: z.enum(["one_time", "monthly", "per_unit"]),
    amountInr: z.number().min(0).max(100_000_000),
  })).min(3).max(10),
});
export type CostSuggestion = z.infer<typeof CostSuggestion>;

/** Rough starting estimates for HER kind of business. Shown as "AI estimate: change to your real cost". */
export function suggestCosts(profile: BusinessProfile, lang: Lang) {
  return ask(
    CostSuggestion,
    [
      "Suggest realistic STARTING cost estimates in Indian rupees for this small business in its city, so a first-time founder has something to edit. She will correct them.",
      "unit: ONE thing a customer pays for, a short singular noun in her language: tiffin, cake, blouse, candle, or student (for tuition, priced per student per month). NEVER a time period like month or day.",
      "price: a typical local price for ONE unit. unitsPerMonth: how many units she sells in a month at a modest one-person start (e.g. 10 students, 60 tiffins).",
      "lines: 5–8 cost lines specific to THIS business (never generic bakery items unless it is a bakery): one_time = things to buy to start; monthly = fixed running costs that do not grow with sales (gas cylinder, phone, rent, helper salary); per_unit = materials/ingredients/packing for ONE unit. Ingredients and raw materials are ALWAYS per_unit, never monthly. Give 2–3 per_unit lines.",
      "Keep one_time costs within her budget if a budget is given. Labels short, in her language.",
      'Return JSON: {"unit":"","price":0,"unitsPerMonth":0,"lines":[{"label":"","kind":"one_time","amountInr":0}]}',
    ].join("\n"),
    `Business:\n${brief(profile)}\nBudget: ${profile.budgetInr ?? "unknown"}`,
    lang,
    0.3,
    true,
  );
}

// ---------------------------------------------------------------- voice sales diary
export const SaleEntry = z.object({
  kind: z.enum(["sale", "expense", "enquiry", "unclear"]),
  item: z.string().nullable(),
  quantity: z.number().nullable(),
  amountInr: z.number().nullable(), // total amount as SAID by the founder; null if not said
  customer: z.string().nullable(),
});
export type SaleEntry = z.infer<typeof SaleEntry>;

export function parseDiaryEntry(text: string, lang: Lang) {
  return ask(
    SaleEntry,
    [
      "Turn one spoken diary line from a small seller into a record. Only use numbers the founder actually said.",
      "kind: sale (they sold something), expense (they spent money), enquiry (someone asked), unclear.",
      "amountInr: the TOTAL rupees for this line. If they said a per-item price and a quantity, multiply. If no amount was said, null.",
      "customer: a first name or description if said, else null. item: what was sold or bought, short.",
      'Shape: {"kind":"sale","item":"chocolate cake","quantity":2,"amountInr":900,"customer":"Priya"}',
    ].join("\n"),
    text.slice(0, 400),
    lang,
    0.1,
    true,
  );
}
