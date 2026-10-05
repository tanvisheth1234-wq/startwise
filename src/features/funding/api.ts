// src/features/funding/api.ts — scheme matcher (#32–#34): rule-based filters over reviewed scheme data.
import "server-only";
import type { FundingAnswers, FundingApi, SchemeMatch } from "@/contracts/funding";
import type { BusinessProfile, Lang } from "@/contracts/profile";
import { requirePlan } from "@/lib/auth";
import { SCHEMES, type SchemeRecord } from "@/knowledge/data";
import { sourceRef } from "@/features/compliance/api";
import { getSection } from "@/features/validate/server/sections";
import { money } from "@/features/money/api";

const MAHARASHTRA = /pune|pimpri|chinchwad|mumbai|thane|nagpur|nashik|aurangabad|sambhaji|kolhapur|solapur|satara|sangli|amravati|navi mumbai|maharashtra/i;

const WOMEN_NOTE: Record<Lang, string> = {
  en: " Women founders get extra benefits here.",
  hi: " यहाँ महिला उद्यमियों को अतिरिक्त लाभ मिलते हैं।",
  mr: " येथे महिला उद्योजकांना जास्तीचे फायदे मिळतात.",
};
const ASK_WOMAN: Record<Lang, string> = {
  en: "Tell us if the founder is a woman to confirm this one.",
  hi: "पुष्टि के लिए बताइए कि क्या संस्थापक महिला हैं।",
  mr: "खात्रीसाठी सांगा की संस्थापक महिला आहेत का.",
};


/** Who gives the scheme, in her language (official scheme names stay as they are). */
const PROVIDER: Record<string, Record<"en" | "hi" | "mr", string>> = {
  "Banks, NBFCs and MFIs under MUDRA": { en: "Banks, NBFCs and MFIs under MUDRA", hi: "MUDRA के तहत बैंक, NBFC और MFI", mr: "MUDRA अंतर्गत बँका, NBFC आणि MFI" },
  "CGTMSE through banks": { en: "CGTMSE through banks", hi: "बैंकों के ज़रिए CGTMSE", mr: "बँकांमार्फत CGTMSE" },
  "Directorate of Industries, Maharashtra": { en: "Directorate of Industries, Maharashtra", hi: "उद्योग निदेशालय, महाराष्ट्र", mr: "उद्योग संचालनालय, महाराष्ट्र" },
  "Government of Maharashtra": { en: "Government of Maharashtra", hi: "महाराष्ट्र सरकार", mr: "महाराष्ट्र शासन" },
  "KVIC through banks": { en: "KVIC through banks", hi: "बैंकों के ज़रिए KVIC", mr: "बँकांमार्फत KVIC" },
  "Scheduled commercial banks": { en: "Scheduled commercial banks", hi: "अनुसूचित वाणिज्यिक बैंक", mr: "अनुसूचित व्यापारी बँका" },
};
export type MatchContext = { profile: BusinessProfile; answers: FundingAnswers; investmentInr: number | null };

/** Pure: one scheme against one founder. null = not shown. */
export function judgeScheme(s: SchemeRecord, ctx: MatchContext, lang: Lang): SchemeMatch | null {
  const e = s.eligibility;
  const { profile: p, answers, investmentInr } = ctx;
  let maybe = false;
  let why = s.whyTemplate[lang];

  if (!e.businessTypes.includes("*") && !e.businessTypes.includes(p.businessType)) return null;
  if (!e.stages.includes(p.stage)) return null;
  if (!e.states.includes("*")) {
    if (!p.city) maybe = true;
    else if (!MAHARASHTRA.test(p.city)) return null;
  }
  if (e.womenOnly || e.needsWoman) {
    if (answers.founderIsWoman === false) return null;
    if (answers.founderIsWoman === null) {
      maybe = true;
      why += " " + ASK_WOMAN[lang];
    }
  }
  if (investmentInr !== null) {
    if (e.minInvestmentInr !== null && investmentInr < e.minInvestmentInr) return null;
    if (e.maxInvestmentInr !== null && investmentInr > e.maxInvestmentInr) return null;
  } else if (e.minInvestmentInr !== null || e.maxInvestmentInr !== null) maybe = true;
  if (answers.ageBand && (e.minAge !== null || e.maxAge !== null)) {
    const [lo, hi] = answers.ageBand === "18-35" ? [18, 35] : answers.ageBand === "36-50" ? [36, 50] : [51, 120];
    if ((e.maxAge !== null && lo > e.maxAge) || (e.minAge !== null && hi < e.minAge)) return null;
  }
  if (s.key === "pmegp" && answers.founderIsWoman) why += WOMEN_NOTE[lang];

  return {
    schemeKey: s.key, applies: maybe ? "maybe" : "yes", name: s.name, provider: PROVIDER[s.provider]?.[lang] ?? s.provider, benefit: s.benefit[lang],
    whyMatched: why, documents: s.documents.map((d) => d[lang]), womenFocused: s.womenFocused,
    officialUrl: s.officialUrl, source: sourceRef(s.sourceKey),
  };
}

export async function getFundingAnswers(planId: string): Promise<FundingAnswers> {
  const s = await getSection<FundingAnswers>(planId, "funding_answers", "en");
  return s?.content ?? { founderIsWoman: null, ageBand: null };
}

export const funding: FundingApi = {
  async matchSchemes(planId, lang) {
    const plan = await requirePlan(planId);
    if (!plan.profile) return [];
    const summary = await money.getMoneySummary(planId).catch(() => null);
    // What the founder needs to raise or spend: the money plan if there is one, else the budget.
    const investmentInr = summary ? summary.startupTotal + 2 * summary.monthlyFixed : plan.profile.budgetInr;
    const ctx: MatchContext = { profile: plan.profile, answers: await getFundingAnswers(planId), investmentInr };
    const matches = SCHEMES.map((s) => judgeScheme(s, ctx, lang)).filter((m): m is SchemeMatch => m !== null);
    // Definite matches first, then women-focused ones (highlighted), then the rest.
    return matches.sort((a, b) => (a.applies === b.applies ? Number(b.womenFocused) - Number(a.womenFocused) : a.applies === "yes" ? -1 : 1));
  },
};
