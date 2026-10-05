// src/features/intake/lib/quickReplies.ts   OWNER: T1 — pure, unit-tested.
// Chips that answer a follow-up directly, with no AI call. Labels come from messages/intake.json.
import type { BusinessProfile } from "@/contracts/profile";

export type QuickReply = { id: string; field: QuickField; value: string | number | boolean };
export type QuickField = "premises" | "sellsOnline" | "budgetInr" | "hoursPerDay" | "locality";

/** Pilot city: common Pune areas as one-tap answers. The label is the value. */
export const PUNE_AREAS = ["Kothrud", "Baner", "Wakad", "Hadapsar", "Viman Nagar", "Aundh", "Shivajinagar", "Pimpri-Chinchwad"];

const CHIPS: Record<QuickField, QuickReply[]> = {
  premises: [
    { id: "home", field: "premises", value: "home" },
    { id: "shop", field: "premises", value: "shop" },
  ],
  sellsOnline: [
    { id: "yes", field: "sellsOnline", value: true },
    { id: "no", field: "sellsOnline", value: false },
  ],
  // A range chip stores its upper end; the profile card lets the founder fine-tune it.
  budgetInr: [
    { id: "b10k", field: "budgetInr", value: 10000 },
    { id: "b25k", field: "budgetInr", value: 25000 },
    { id: "b50k", field: "budgetInr", value: 50000 },
    { id: "b1l", field: "budgetInr", value: 100000 },
  ],
  hoursPerDay: [
    { id: "h2", field: "hoursPerDay", value: 2 },
    { id: "h4", field: "hoursPerDay", value: 4 },
    { id: "h6", field: "hoursPerDay", value: 6 },
    { id: "h8", field: "hoursPerDay", value: 8 },
  ],
  locality: PUNE_AREAS.map((a) => ({ id: a, field: "locality" as const, value: a })),
};

export function quickRepliesFor(field: string | null | undefined, city?: string): QuickReply[] {
  if (field === "locality" && !/pune|pimpri/i.test(city ?? "")) return [];
  return field && field in CHIPS ? CHIPS[field as QuickField] : [];
}

/** Finds a chip by id for a field; null if it is not one we offered (never trust client values). */
export function findQuickReply(field: string, id: string): QuickReply | null {
  return quickRepliesFor(field, "Pune").find((q) => q.id === id) ?? null;
}

/** Applies a chip to the profile (code only). */
export function applyQuickReply(profile: BusinessProfile, reply: QuickReply): Omit<BusinessProfile, "missingFields"> {
  const { missingFields: _ignored, ...rest } = profile;
  return { ...rest, [reply.field]: reply.value } as Omit<BusinessProfile, "missingFields">;
}
