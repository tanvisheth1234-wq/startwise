// src/features/validate/server/results.ts — the test sprint's logged results and its verdict.
import "server-only";
import { asc, eq } from "drizzle-orm";
import type { Lang } from "@/contracts/profile";
import type { TestPlan } from "@/contracts/sections";
import { db } from "@/db/client";
import { testResults } from "@/db/schema";
import { DEFAULT_TARGETS, todayInIndia } from "../lib/testPlan";
import { decideVerdict, resultTotals, type DayResult, type Verdict } from "../lib/verdict";
import { getSection } from "./sections";

export type SprintState = {
  startDate: string | null;
  targets: { enquiries: number; orders: number };
  results: DayResult[];
  totals: { enquiries: number; orders: number };
  verdict: Verdict;
  today: string;
};

export async function loadResults(planId: string): Promise<DayResult[]> {
  const rows = await db.select().from(testResults).where(eq(testResults.planId, planId)).orderBy(asc(testResults.day));
  return rows.map((r) => ({ day: r.day, enquiries: r.enquiries, orders: r.orders }));
}

export async function sprintState(planId: string, lang: Lang): Promise<SprintState> {
  // Her plan is saved in the language she made it in; if she has switched language since, use the
  // one that is actually running so the GO line and start date always match what she set.
  let section = await getSection<TestPlan>(planId, "test_plan", lang);
  if (!section?.content.startDate) {
    for (const other of (["en", "hi", "mr"] as const).filter((l) => l !== lang)) {
      const s = await getSection<TestPlan>(planId, "test_plan", other);
      if (s?.content.startDate) {
        section = s;
        break;
      }
    }
  }
  const startDate = section?.content.startDate ?? null;
  const targets = section?.content.targets ?? { ...DEFAULT_TARGETS };
  const results = await loadResults(planId);
  const today = todayInIndia();
  return { startDate, targets, results, totals: resultTotals(results, startDate), verdict: decideVerdict(startDate, targets, results, today), today };
}
