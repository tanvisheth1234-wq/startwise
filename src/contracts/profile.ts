// src/contracts/profile.ts   (SHARED, frozen)
import { z } from "zod";

export const Lang = z.enum(["en", "hi", "mr"]);
export type Lang = z.infer<typeof Lang>;

export const BusinessType = z.enum(["home_food", "tailoring_boutique", "online_reselling", "other"]);

export const BusinessProfile = z.object({
  stage: z.enum(["new_idea", "existing"]),
  businessType: BusinessType,
  product: z.string(), // "custom cakes and cookies"
  city: z.string(), // "Pune"
  locality: z.string().nullable(), // "Kothrud"
  premises: z.enum(["home", "shop"]).nullable(),
  sellsOnline: z.boolean().nullable(),
  targetCustomer: z.string().nullable(),
  budgetInr: z.number().int().nonnegative().nullable(),
  hoursPerDay: z.number().min(0).max(24).nullable(),
  expectedMonthlySalesInr: z.number().int().nonnegative().nullable(), // needed for scale checks
  language: Lang,
  missingFields: z.array(z.string()), // drives the follow-up questions
});
export type BusinessProfile = z.infer<typeof BusinessProfile>;
