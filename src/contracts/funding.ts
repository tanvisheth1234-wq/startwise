// src/contracts/funding.ts   (SHARED, frozen) — T2
import type { SourceRef } from "./common";
import type { Lang } from "./profile";

export type SchemeMatch = {
  schemeKey: string; applies: "yes" | "maybe"; name: string; provider: string; benefit: string;
  whyMatched: string; documents: string[]; womenFocused: boolean; officialUrl: string; source: SourceRef | null;
};

export type SchemeCondition = {
  businessTypes: string[]; stages: ("new_idea" | "existing")[]; states: string[];
  womenOnly: boolean; minAge: number | null; maxAge: number | null;
  minInvestmentInr: number | null; maxInvestmentInr: number | null;
};

// Optional answers asked only on the Funding screen (never caste, ID or bank details):
export type FundingAnswers = { founderIsWoman: boolean | null; ageBand: "18-35" | "36-50" | "51+" | null };

export interface FundingApi { matchSchemes(planId: string, lang: Lang): Promise<SchemeMatch[]>; }
