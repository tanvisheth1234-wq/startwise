// src/features/profile/lib/form.ts   OWNER: T1 — pure, unit-tested.
// Turns the profile card's form fields into a valid BusinessProfile, with per-field error codes.
import { z } from "zod";
import type { BusinessProfile, Lang } from "@/contracts/profile";
import { computeMissingFields } from "@/lib/ai/profile";

export type FieldError = "required" | "number" | "nonNegative" | "hoursRange" | "tooLong" | "supportedType";
export type FieldErrors = Partial<Record<keyof BusinessProfile, FieldError>>;

const text = (max: number) =>
  z.preprocess((v) => (typeof v === "string" ? v.trim() : v), z.string().max(max, "tooLong"));
const optionalText = (max: number) =>
  z.preprocess((v) => (typeof v === "string" && v.trim() ? v.trim() : null), z.string().max(max, "tooLong").nullable());
const optionalNumber = (check: z.ZodNumber) =>
  z.preprocess((v) => {
    if (v === null || v === undefined || (typeof v === "string" && v.trim() === "")) return null;
    const n = Number(String(v).replace(/[,\s₹]/g, ""));
    return Number.isNaN(n) ? v : n;
  }, check.nullable());
const optionalBool = z.preprocess((v) => (v === "true" ? true : v === "false" ? false : null), z.boolean().nullable());

export const ProfileForm = z.object({
  stage: z.enum(["new_idea", "existing"], { error: "required" }),
  businessType: z.enum(["home_food", "tailoring_boutique", "online_reselling"], { error: "supportedType" }),
  product: text(120).pipe(z.string().min(1, "required")),
  city: text(60).pipe(z.string().min(1, "required")),
  locality: optionalText(80),
  premises: z.preprocess((v) => (v === "home" || v === "shop" ? v : null), z.enum(["home", "shop"]).nullable()),
  sellsOnline: optionalBool,
  targetCustomer: optionalText(160),
  budgetInr: optionalNumber(z.number({ error: "number" }).int("number").nonnegative("nonNegative").max(100_000_000, "number")),
  hoursPerDay: optionalNumber(z.number({ error: "number" }).min(0, "hoursRange").max(24, "hoursRange")),
  expectedMonthlySalesInr: optionalNumber(z.number({ error: "number" }).int("number").nonnegative("nonNegative").max(1_000_000_000, "number")),
});

export const FORM_FIELDS = Object.keys(ProfileForm.shape) as (keyof z.infer<typeof ProfileForm>)[];

export type ParseResult = { ok: true; profile: BusinessProfile } | { ok: false; errors: FieldErrors };

const KNOWN: FieldError[] = ["required", "number", "nonNegative", "hoursRange", "tooLong", "supportedType"];

export function parseProfileForm(values: Record<string, unknown>, lang: Lang): ParseResult {
  const r = ProfileForm.safeParse(values);
  if (!r.success) {
    const errors: FieldErrors = {};
    for (const issue of r.error.issues) {
      const field = issue.path[0] as keyof BusinessProfile;
      if (!errors[field]) errors[field] = KNOWN.includes(issue.message as FieldError) ? (issue.message as FieldError) : issue.code === "invalid_type" ? "number" : "required";
    }
    return { ok: false, errors };
  }
  const p = { ...r.data, language: lang };
  return { ok: true, profile: { ...p, missingFields: computeMissingFields(p) } };
}

/** FormData → plain object of the fields we know (ignores anything else). */
export function formDataToValues(fd: FormData): Record<string, unknown> {
  return Object.fromEntries(FORM_FIELDS.map((f) => [f, fd.get(f) ?? null]));
}
