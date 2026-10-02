// src/contracts/readiness.ts   (SHARED, frozen) — T2
import type { Lang } from "./profile";

export type Readiness = {
  score: number;
  parts: { legal: number; money: number; market: number; operations: number };
  blockers: { label: string; href: string }[];
};

export interface ReadinessApi { getReadiness(planId: string, lang: Lang): Promise<Readiness>; }
