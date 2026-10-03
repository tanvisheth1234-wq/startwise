// src/lib/ai/schemas.ts   OWNER: T1
// zod schemas for what the model returns (lenient on input, strict on output).
// Section shapes for ai.draft live in @/contracts/sections (DRAFT_SCHEMAS).
import { z } from "zod";

/** Accepts 30000, "30000", "30,000", "₹30k"-style already-converted numbers; "" / null → null. */
const looseNumber = z.preprocess((v) => {
  if (v === undefined || v === null || v === "") return null;
  if (typeof v === "string") {
    const cleaned = v.replace(/[^\d.]/g, "");
    return cleaned === "" ? null : Number(cleaned);
  }
  return v;
}, z.number().nonnegative().nullable());

const looseString = z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? null : v), z.string().nullable());

/** What parseIdea's prompt asks for. Every field may be null = "not mentioned". */
export const ExtractedProfile = z.object({
  stage: z.enum(["new_idea", "existing"]).nullish(),
  businessType: z.enum(["home_food", "tailoring_boutique", "online_reselling", "other"]).nullish(),
  product: looseString.optional(),
  city: looseString.optional(),
  locality: looseString.optional(),
  premises: z.enum(["home", "shop"]).nullish(),
  sellsOnline: z.boolean().nullish(),
  targetCustomer: looseString.optional(),
  budgetInr: looseNumber.optional(),
  hoursPerDay: looseNumber.optional(),
  expectedMonthlySalesInr: looseNumber.optional(),
});
export type ExtractedProfile = z.infer<typeof ExtractedProfile>;

export const FollowUpQuestion = z.object({ question: z.string().min(1) });

export const Explanation = z.object({ text: z.string().min(1) });

export const SourceAnswer = z.object({
  answer: z.string().nullable(),
  sourceKeys: z.array(z.string()).default([]),
});
