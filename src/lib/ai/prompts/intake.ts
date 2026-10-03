// src/lib/ai/prompts/intake.ts   OWNER: T1 — parseIdea and nextFollowUp
import type { BusinessProfile, Lang } from "@/contracts/profile";
import { baseRules, json } from "./base";

export function parseIdeaPrompt(text: string, lang: Lang, previous?: Partial<BusinessProfile>) {
  const system = [
    baseRules(lang),
    "",
    "TASK: Extract a business profile from what the founder said. The message may be English, Hindi, Marathi or a mix (Hinglish), in any script.",
    "Return this JSON object. Use null for anything the message does not clearly say. Do NOT guess.",
    "{",
    '  "stage": "new_idea" | "existing" | null,      // "existing" only if they already run it',
    '  "businessType": "home_food" | "tailoring_boutique" | "online_reselling" | "other" | null,',
    '  "product": string | null,                     // what they sell, short, e.g. "custom cakes and cookies"; if only the kind of business is said, use its natural name, e.g. "home bakery" / "होम बेकरी"',
    '  "city": string | null,                         // ENGLISH spelling, e.g. "Pune"',
    '  "locality": string | null,                     // ENGLISH spelling, e.g. "Kothrud"',
    '  "premises": "home" | "shop" | null,',
    '  "sellsOnline": boolean | null,',
    '  "targetCustomer": string | null,',
    '  "budgetInr": number | null,                    // rupees as a plain number',
    '  "hoursPerDay": number | null,',
    '  "expectedMonthlySalesInr": number | null',
    "}",
    "",
    "Rules:",
    "- businessType: cakes, baking, tiffin, snacks, sweets, pickles, any food made at home → home_food.",
    "  Stitching, tailoring, blouses, alterations, boutique → tailoring_boutique.",
    "  Buying products and reselling them online (Meesho, Instagram, WhatsApp shop) → online_reselling.",
    "  Anything else → other.",
    "- premises: 'from home', 'home bakery', 'home kitchen', 'ghar se', 'घर से', 'घरून', 'घरातून', 'घरगुती' → home. A rented or owned shop/outlet → shop.",
    "- Numbers: '30k' = 30000, '30 हजार' / '30 hazaar' = 30000, '1 lakh' / '1 लाख' = 100000. Hours: '4 ghante' = 4.",
    "- city and locality must be in English (Latin script) so they are identical whatever language the founder used.",
    `- product and targetCustomer: write in ${lang === "en" ? "English" : lang === "hi" ? "Hindi" : "Marathi"}.`,
  ].join("\n");

  const user = previous
    ? [
        "We already know this profile so far:",
        json(previous),
        "",
        "The founder now answered a follow-up question. Extract ONLY what this new message says (null for the rest):",
        text,
      ].join("\n")
    : `Founder's idea:\n${text}`;

  return { system, user };
}

/** Plain-English description of each field the follow-up may ask about. */
export const FIELD_DESCRIPTION: Record<string, string> = {
  premises: "whether they will work from home or from a shop",
  locality: "which area or locality of the city they will work in",
  budgetInr: "how much money (in rupees) they can spend to start",
  hoursPerDay: "how many hours a day they can give to the business",
  sellsOnline: "whether they want to sell online (WhatsApp, Instagram, Swiggy/Zomato, Meesho)",
  targetCustomer: "who their main customers will be",
  expectedMonthlySalesInr: "roughly how much they hope to sell per month, in rupees",
};

export function followUpPrompt(profile: BusinessProfile, field: string, lang: Lang) {
  const system = [
    baseRules(lang),
    "",
    "TASK: Ask the founder ONE short, warm question (max 15 words) to learn the missing detail below.",
    "Mention their business naturally if it helps. Do not ask about anything else.",
    'Return: { "question": string }',
  ].join("\n");
  const user = [
    `Missing detail: ${FIELD_DESCRIPTION[field] ?? field}`,
    "What we know:",
    json({ product: profile.product, city: profile.city, locality: profile.locality, premises: profile.premises }),
  ].join("\n");
  return { system, user };
}
