// src/lib/ai/profile.ts   OWNER: T1 — pure, unit-tested.
// The AI only extracts values; code merges them and decides what is still missing,
// so the same answers always give the same profile.
import type { BusinessProfile, Lang } from "@/contracts/profile";
import type { ExtractedProfile } from "./schemas";

/** Every optional detail, in the order we would ask about it. */
export const MISSING_FIELD_ORDER = [
  "premises",
  "locality",
  "budgetInr",
  "hoursPerDay",
  "sellsOnline",
  "targetCustomer",
  "expectedMonthlySalesInr",
] as const;

/** Follow-ups only ask these (keeps the bakery idea to at most 4 questions). The card highlights the rest. */
export const FOLLOW_UP_FIELDS = ["premises", "locality", "budgetInr", "hoursPerDay"] as const;

const clampInt = (n: number | null | undefined) => (n == null || !Number.isFinite(n) ? null : Math.max(0, Math.round(n)));
const clampHours = (n: number | null | undefined) =>
  n == null || !Number.isFinite(n) ? null : Math.min(24, Math.max(0, Math.round(n * 2) / 2));
const clean = (s: string | null | undefined) => {
  const t = s?.trim();
  return t ? t : null;
};

export function computeMissingFields(p: Omit<BusinessProfile, "missingFields">): string[] {
  return MISSING_FIELD_ORDER.filter((f) => p[f] === null);
}

/** Merge newly extracted values over what we already know. Null from the AI never erases a known value. */
export function mergeProfile(previous: Partial<BusinessProfile> | undefined, x: ExtractedProfile, lang: Lang): BusinessProfile {
  const prev = previous ?? {};
  const pick = <T>(next: T | null | undefined, old: T | null | undefined): T | null => (next ?? old ?? null);

  // A bare follow-up answer ("Kothrud") should not flip a known business type to "other".
  let businessType = prev.businessType ?? "other";
  if (x.businessType && !(x.businessType === "other" && prev.businessType && prev.businessType !== "other")) {
    businessType = x.businessType;
  }

  const merged = {
    stage: x.stage ?? prev.stage ?? "new_idea",
    businessType,
    product: clean(x.product) ?? clean(prev.product) ?? "",
    city: clean(x.city) ?? clean(prev.city) ?? "",
    locality: pick(clean(x.locality), prev.locality),
    premises: pick(x.premises, prev.premises),
    sellsOnline: pick(x.sellsOnline, prev.sellsOnline),
    targetCustomer: pick(clean(x.targetCustomer), prev.targetCustomer),
    budgetInr: pick(clampInt(x.budgetInr), prev.budgetInr),
    hoursPerDay: pick(clampHours(x.hoursPerDay), prev.hoursPerDay),
    expectedMonthlySalesInr: pick(clampInt(x.expectedMonthlySalesInr), prev.expectedMonthlySalesInr),
    language: lang,
  } satisfies Omit<BusinessProfile, "missingFields">;

  return { ...merged, missingFields: computeMissingFields(merged) };
}

/** The next field a follow-up should ask about, or null when we have enough. */
export function nextFollowUpField(profile: BusinessProfile): string | null {
  return FOLLOW_UP_FIELDS.find((f) => profile.missingFields.includes(f)) ?? null;
}
