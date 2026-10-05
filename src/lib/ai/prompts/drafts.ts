// src/lib/ai/prompts/drafts.ts   OWNER: T1 — one prompt per DraftKind
import type { DraftKind } from "@/contracts/ai";
import type { Lang } from "@/contracts/profile";
import { baseRules, json } from "./base";

/** Friendly copy gets more variety; analysis stays steady. */
export const DRAFT_TEMPERATURE: Record<DraftKind, number> = {
  assumptions: 0.4,
  risk: 0.4,
  test_plan: 0.4,
  templates: 0.7,
  niches: 0.7,
  health: 0.4,
  first_customers: 0.7,
  plan_starter: 0.4,
  loan_pitch: 0.7,
  competition_notes: 0.2,
};

const TASKS: Record<DraftKind, string[]> = {
  assumptions: [
    "TASK: List 5 to 8 assumptions that must hold for this business to work, specific to its product and locality.",
    'Example of the right level of detail: "People in Kothrud will pre-order custom cakes for birthdays".',
    "kind: must_be_true = the plan fails without it; open_question = something unknown to find out.",
    "howToCheck: one cheap way (₹0–500) to check it in a few days.",
    'Return: { "items": [ { "text": string, "kind": "must_be_true" | "open_question", "howToCheck": string } ] }',
  ],
  risk: [
    "TASK: A short feasibility and risk snapshot for this business.",
    "strengths: 2–4 real advantages. unknowns: 2–4 things not yet known.",
    "risks: 3–6 risks, each with an area and the evidence the founder should collect to reduce it.",
    "Do not give numbers as facts.",
    'Return: { "strengths": string[], "unknowns": string[], "risks": [ { "area": "operations" | "market" | "money" | "execution", "text": string, "evidenceNeeded": string } ] }',
  ],
  test_plan: [
    "TASK: A 7-day test sprint to check real demand cheaply before spending on licences or equipment.",
    "Exactly 7 entries, day 1 to 7, each one concrete action the founder can do in under 2 hours.",
    "Use the assumptions in the context. Total of costInr across all days MUST be 500 or less (₹0 is fine).",
    "experiment is one of: interviews, pre_orders, pilot_offer, landing_page, whatsapp_status.",
    "targets: suggest { enquiries: 10, orders: 3 } unless the context clearly needs different numbers.",
    'Return: { "days": [ { "day": 1, "experiment": string, "action": string, "costInr": number } ], "targets": { "enquiries": number, "orders": number } }',
  ],
  templates: [
    "TASK: Ready-to-send messages for the founder's test sprint.",
    "whatsappMessage: a short friendly message (max 60 words) to send to neighbours and friends, inviting a pre-order or enquiry.",
    "These messages go to CUSTOMERS: never mention a test, trial run, sprint, experiment or validation. Write as a small business that is starting soon (e.g. 'taking first orders this week').",
    "poll: a WhatsApp poll question with 3–4 options to learn what customers want.",
    "priceCard: plain text, 3–5 lines, one item per line. Use prices from the context if given; otherwise write ₹___ as a blank. Never invent prices.",
    'Return: { "whatsappMessage": string, "poll": { "question": string, "options": string[] }, "priceCard": string }',
  ],
  niches: [
    "TASK: Suggest exactly 3 sharper niches for this business in its locality.",
    'Example: "Eggless custom cakes for kids\' birthdays in Kothrud".',
    "Each with the product, the target customer and a one-line reason.",
    'Return: { "items": [ { "product": string, "targetCustomer": string, "reason": string } ] }',
  ],
  health: [
    "TASK: A health snapshot for a business that is already running, using the profile and the money numbers in the context.",
    "working: what is going well. gaps: what is missing. nextActions: exactly 3 next actions.",
    "Only refer to numbers that appear in the context.",
    'Return: { "working": string[], "gaps": string[], "nextActions": string[] }',
  ],
  first_customers: [
    "TASK: Help the founder win her first 10 customers.",
    "approachFirst: 3–5 groups to approach first, why, and exactly what to say (one or two friendly sentences).",
    "experiments: 2–3 short experiments, each with 3–5 steps. Use the pilot/launch tasks in the context if given.",
    'Return: { "approachFirst": [ { "who": string, "why": string, "whatToSay": string } ], "experiments": [ { "title": string, "steps": string[] } ] }',
  ],
  plan_starter: [
    "TASK: A one-page business plan starter.",
    "problem, customer, offer: one or two sentences each. price: use the price from the context, or say it is still to be decided.",
    "channels: 2–4 sales channels. next30Days: 4–6 concrete actions.",
    'Return: { "problem": string, "customer": string, "offer": string, "price": string, "channels": string[], "next30Days": string[] }',
  ],
  loan_pitch: [
    "TASK: A short pitch the founder can read to a bank officer.",
    "Use ONLY the numbers given in the context (they are estimates; say so). Never promise or imply approval.",
    "summary: 3–4 sentences. keyPoints: 3–5 points. askText: what she is asking for and how she plans to repay.",
    'Return: { "summary": string, "keyPoints": string[], "askText": string }',
  ],
  competition_notes: [
    "TASK: Notes on nearby competition, using ONLY the count and names of places in the context.",
    "Do not invent businesses, prices, ratings or facts. Note that small home sellers are often missing from map data.",
    "summary: 1–2 sentences. notes: 2–4 short points on how the founder could stand out.",
    'Return: { "summary": string, "notes": string[] }',
  ],
};

export function draftPrompt(kind: DraftKind, context: unknown, lang: Lang) {
  const system = [
    baseRules(lang),
    "",
    ...TASKS[kind],
    "Keep enum values (like must_be_true, operations, pre_orders) exactly in English; write all other text in the required language.",
  ].join("\n");
  return { system, user: `Context:\n${json(context)}` };
}
