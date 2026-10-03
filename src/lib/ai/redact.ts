// src/lib/ai/redact.ts   OWNER: T1
// Removes things we must never send to the AI: long ID-like numbers (Aadhaar, bank
// accounts: 12+ digits, spaces/dashes allowed), emails and phone numbers.
// Short numbers such as budgets ("30000", "₹30,000") and hours are kept.

export const REDACTED = "[removed]";

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
// 12 or more digits, optionally separated by single spaces or dashes ("1234 5678 9012").
const LONG_DIGITS = /\d(?:[ -]?\d){11,}/g;
// Indian mobiles (+91 / 0 prefix optional) and landlines with an STD code.
const PHONE = /(?:\+?91[\s-]?|\b0)?[6-9]\d{2}[\s-]?\d{3}[\s-]?\d{4}\b|\b0\d{2,4}[\s-]\d{6,8}\b/g;

export function redact(text: string): string {
  return text.replace(EMAIL, REDACTED).replace(LONG_DIGITS, REDACTED).replace(PHONE, REDACTED);
}

/** Redacts every string inside an object (for draft contexts). */
export function redactDeep<T>(value: T): T {
  if (typeof value === "string") return redact(value) as T;
  if (Array.isArray(value)) return value.map(redactDeep) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, redactDeep(v)])) as T;
  }
  return value;
}
