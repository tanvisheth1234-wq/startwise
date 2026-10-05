// src/features/talk/lib/neutral.ts — pure: makes an assistant reply address the founder neutrally.
// The fast AI model sometimes says "आप देख सकती हैं" (feminine) or "Tasks स्क्रीन"; code fixes that
// reliably. Only second-person forms ("…ती हैं" addressed with आप) change; "मैं … सकती हूँ" stays.
import type { Lang } from "@/contracts/profile";

const HI: [RegExp, string][] = [
  [/सकती हैं/g, "सकते हैं"],
  [/रही हैं/g, "रहे हैं"],
  [/चाहती हैं/g, "चाहते हैं"],
  [/करती हैं/g, "करते हैं"],
  [/(\S+)ेंगी([\s?।!,])/g, "$1ेंगे$2"], // करेंगी → करेंगे, चाहेंगी → चाहेंगे
  [/\s*स्क्रीन/g, ""],
  [/\b[Tt]asks?\b/g, "काम"],
  [/\bscreen\b/gi, ""],
];

const MR: [RegExp, string][] = [
  [/\s*स्क्रीन/g, ""],
  [/\b[Tt]asks?\b/g, "कामं"],
  [/\bscreen\b/gi, ""],
];

export function neutralReply(text: string, lang: Lang): string {
  const rules = lang === "hi" ? HI : lang === "mr" ? MR : [];
  let out = text;
  for (const [re, to] of rules) out = out.replace(re, to);
  return out.replace(/\s{2,}/g, " ").trim();
}
