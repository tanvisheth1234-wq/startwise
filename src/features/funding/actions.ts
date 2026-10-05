"use server";
// src/features/funding/actions.ts — the optional questions on the Funding screen, and the bank loan pitch.
// Never caste, ID numbers or bank details.
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePlan, requireUser } from "@/lib/auth";
import { getSection as readSection, saveSection } from "@/features/validate/server/sections";
import { getFundingAnswers } from "./api";
import type { LoanPitch } from "@/contracts/sections";
import { ai } from "@/lib/ai";
import { money } from "@/features/money/api";
import { sprintState } from "@/features/validate/server/results";

const Answers = z.object({ founderIsWoman: z.boolean().nullable(), ageBand: z.enum(["18-35", "36-50", "51+"]).nullable() });

export async function saveFundingAnswers(planId: string, patch: { founderIsWoman?: boolean | null; ageBand?: "18-35" | "36-50" | "51+" | null }) {
  const user = await requireUser();
  await requirePlan(planId);
  const next = Answers.parse({ ...(await getFundingAnswers(planId)), ...patch });
  await saveSection(planId, "funding_answers", "en", next, true, user.id);
  revalidatePath(`/plan/${planId}`, "layout");
}

// ---------------------------------------------------------------- bank loan pitch (#35)
export async function loadLoanPitch(planId: string): Promise<LoanPitch | null> {
  const plan = await requirePlan(planId);
  return (await readSection<LoanPitch>(planId, "loan_pitch", plan.language))?.content ?? null;
}

/** The AI writes the words; every number comes from the Money Lab and the test, computed in code. */
export async function makeLoanPitch(planId: string): Promise<{ ok: true; pitch: LoanPitch } | { ok: false; error: "noMoney" | "ai" }> {
  const user = await requireUser();
  const plan = await requirePlan(planId);
  const summary = await money.getMoneySummary(planId).catch(() => null);
  if (!summary || !plan.profile) return { ok: false, error: "noMoney" };
  const test = await sprintState(planId, plan.language);
  const context = {
    profile: { product: plan.profile.product, businessType: plan.profile.businessType, area: [plan.profile.locality, plan.profile.city].filter(Boolean).join(", "), premises: plan.profile.premises },
    numbersAreEstimates: true,
    money: {
      startupCostInr: summary.startupTotal, monthlyCostsInr: summary.monthlyFixed, pricePerItemInr: summary.price,
      costPerItemInr: summary.unitCost, breakEvenItemsPerMonth: summary.breakEvenUnitsPerMonth,
      monthsToRecoverStartup: summary.monthsToRecoverStartup, ownMoneyInr: plan.profile.budgetInr ?? 0, loanNeededInr: summary.loanNeed,
    },
    sevenDayTest: test.startDate ? { verdict: test.verdict.verdict, orders: test.totals.orders, enquiries: test.totals.enquiries } : null,
  };
  try {
    const pitch = await ai.draft<LoanPitch>("loan_pitch", context, plan.language);
    await saveSection(planId, "loan_pitch", plan.language, pitch, false, user.id);
    return { ok: true, pitch };
  } catch {
    return { ok: false, error: "ai" };
  }
}
