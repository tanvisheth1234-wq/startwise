// src/features/compliance/engine.ts — pure rule engine (#17, #18). No AI, no database:
// the same profile always gives the same licences, in the same order.
import type { Phase } from "@/contracts/common";
import type { BusinessProfile, Lang } from "@/contracts/profile";
import { RULES, type L, type RuleRecord } from "@/knowledge/data";

export type RuleVerdict = { rule: RuleRecord; applies: "yes" | "maybe"; reason: string };

export const PHASE_ORDER: Phase[] = ["validate", "prepare", "register", "pilot", "launch", "improve"];

const DOING: Record<string, L> = {
  home_food: { en: "you make and sell food", hi: "आप खाना बनाकर बेचते हैं", mr: "तुम्ही अन्न बनवून विकता" },
  tailoring_boutique: { en: "you run a tailoring or boutique business", hi: "आप सिलाई या बुटीक का काम करते हैं", mr: "तुम्ही शिवणकाम किंवा बुटीकचा व्यवसाय करता" },
  online_reselling: { en: "you resell products online", hi: "आप ऑनलाइन सामान दोबारा बेचते हैं", mr: "तुम्ही ऑनलाइन वस्तू पुन्हा विकता" },
  other: { en: "you run a small business", hi: "आप छोटा व्यवसाय चलाते हैं", mr: "तुम्ही छोटा व्यवसाय चालवता" },
};
const FROM_SHOP: L = { en: " from a shop", hi: " दुकान से", mr: " दुकानातून" };
const ONLINE: L = { en: " and sell online", hi: " और ऑनलाइन बेचते हैं", mr: " आणि ऑनलाइन विकता" };
const BECAUSE: L = { en: "Applies because {x}.", hi: "लागू है क्योंकि {x}।", mr: "लागू आहे कारण {x}." };
const SMALL: L = { en: " Your sales are in the small-seller range.", hi: " आपकी बिक्री छोटे विक्रेता की सीमा में है।", mr: " तुमची विक्री लहान विक्रेत्याच्या मर्यादेत आहे." };
const MAYBE_PREMISES: L = { en: "Depends on whether you work from home or a shop. Check locally.", hi: "यह इस पर निर्भर है कि आप घर से काम करते हैं या दुकान से। स्थानीय रूप से जाँचें।", mr: "तुम्ही घरून काम करता की दुकानातून यावर अवलंबून आहे. स्थानिक पातळीवर तपासा." };
const MAYBE_ONLINE: L = { en: "Depends on whether you sell through online marketplaces. Check locally.", hi: "यह इस पर निर्भर है कि आप ऑनलाइन मार्केटप्लेस से बेचते हैं या नहीं। स्थानीय रूप से जाँचें।", mr: "तुम्ही ऑनलाइन मार्केटप्लेसवरून विकता का यावर अवलंबून आहे. स्थानिक पातळीवर तपासा." };
const MAYBE_SALES: L = { en: "Depends on your monthly sales, which we don't know yet. Check locally.", hi: "यह आपकी मासिक बिक्री पर निर्भर है, जो हमें अभी पता नहीं। स्थानीय रूप से जाँचें।", mr: "हे तुमच्या मासिक विक्रीवर अवलंबून आहे, जी आम्हाला अजून माहीत नाही. स्थानिक पातळीवर तपासा." };

const norm = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();

/** Cities a rule names, matched loosely ("Pune", "pune city", "PCMC" area names). */
function cityMatches(ruleCities: string[], city: string): boolean {
  if (ruleCities.includes("*")) return true;
  const c = norm(city);
  return ruleCities.some((rc) => c.includes(rc) || (rc === "pune" && /pimpri|chinchwad|pcmc/.test(c)));
}

/**
 * Decides one rule for one profile. Unknown monthly sales count as "small" for a new idea (most
 * home businesses start far below every threshold) and as "maybe" for an existing business.
 */
export function judgeRule(rule: RuleRecord, p: BusinessProfile, lang: Lang): RuleVerdict | null {
  const c = rule.appliesTo;
  if (!c.businessTypes.includes("*") && !c.businessTypes.includes(p.businessType)) return null;
  if (!cityMatches(c.cities, p.city)) return null;

  let maybe: L | null = null;

  if (c.premises.length < 2) {
    if (p.premises === null) maybe = MAYBE_PREMISES;
    else if (!c.premises.includes(p.premises)) return null;
  }
  if (c.sellsOnline !== null) {
    if (p.sellsOnline === null) maybe = maybe ?? MAYBE_ONLINE;
    else if (p.sellsOnline !== c.sellsOnline) return null;
  }

  const sales = p.expectedMonthlySalesInr;
  if (c.minMonthlySalesInr !== null) {
    if (sales === null) {
      if (p.stage === "new_idea") return null; // a brand-new home business starts small
      maybe = maybe ?? MAYBE_SALES;
    } else if (sales < c.minMonthlySalesInr) return null;
  }
  if (c.maxMonthlySalesInr !== null && sales !== null && sales > c.maxMonthlySalesInr) return null;

  if (maybe) return { rule, applies: "maybe", reason: maybe[lang] };

  let doing = DOING[p.businessType][lang];
  if (p.premises === "shop" && c.premises.length < 2) doing += FROM_SHOP[lang];
  if (c.sellsOnline) doing += ONLINE[lang];
  let reason = BECAUSE[lang].replace("{x}", doing);
  if (c.maxMonthlySalesInr !== null) reason += SMALL[lang];
  return { rule, applies: "yes", reason };
}

/** All rules for a profile, ordered by phase and then so that prerequisites come first. */
export function selectRules(p: BusinessProfile, lang: Lang): RuleVerdict[] {
  const picked = RULES.map((r) => judgeRule(r, p, lang)).filter((v): v is RuleVerdict => v !== null);
  return picked.sort((a, b) => {
    const phase = PHASE_ORDER.indexOf(a.rule.phase) - PHASE_ORDER.indexOf(b.rule.phase);
    if (phase !== 0) return phase;
    if (b.rule.dependsOn.includes(a.rule.key)) return -1;
    if (a.rule.dependsOn.includes(b.rule.key)) return 1;
    // Definite rules before "check locally" ones.
    return a.applies === b.applies ? 0 : a.applies === "yes" ? -1 : 1;
  });
}
