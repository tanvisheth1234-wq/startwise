// src/features/readiness/api.ts — Launch Readiness Score (#38): 0–100 from real progress, computed in code.
import "server-only";
import type { Lang } from "@/contracts/profile";
import type { Readiness, ReadinessApi } from "@/contracts/readiness";
import type { RoadmapTask } from "@/contracts/roadmap";
import type { MoneySummary } from "@/contracts/money";
import type { ValidationStatus } from "@/contracts/validate";
import { db } from "@/db/client";
import { plans } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requirePlan } from "@/lib/auth";
import { roadmap, taskHref } from "@/features/roadmap/api";
import { money } from "@/features/money/api";
import { validate } from "@/features/validate/api";

const LABELS: Record<string, Record<Lang, string>> = {
  test: { en: "Finish your 7-day test", hi: "अपना 7 दिन का टेस्ट पूरा करें", mr: "तुमची ७ दिवसांची चाचणी पूर्ण करा" },
  price: { en: "Set a price that covers your costs", hi: "ऐसी कीमत रखें जो खर्च निकाल दे", mr: "खर्च भरून निघेल अशी किंमत ठेवा" },
};

const pct = (done: number, total: number) => (total === 0 ? 100 : Math.round((done / total) * 100));

/** Pure: the score from the plan's tasks, money and test. */
export function computeReadiness(planId: string, tasks: RoadmapTask[], m: MoneySummary | null, v: ValidationStatus, lang: Lang): Readiness {
  const by = (c: RoadmapTask["category"]) => tasks.filter((t) => t.category === c);
  const done = (list: RoadmapTask[]) => list.filter((t) => t.status === "done").length;

  const legal = pct(done(by("legal")), by("legal").length);
  const ops = pct(done(by("operations")), by("operations").length);
  const market = v.verdict === "go" ? 100 : v.sprintStarted ? Math.min(90, 40 + Math.round((v.orders / 3) * 50)) : Math.min(30, pct(done(by("market")), by("market").length));
  const priceOk = m !== null && m.marginPerUnit !== null && m.marginPerUnit > 0;
  const moneyTasks = by("money");
  const moneyScore = Math.round((priceOk ? 50 : 10) + pct(done(moneyTasks), moneyTasks.length) * 0.5);

  const score = Math.round(legal * 0.25 + moneyScore * 0.25 + market * 0.3 + ops * 0.2);

  const blockers: Readiness["blockers"] = [];
  const base = `/plan/${planId}`;
  if (v.verdict !== "go") blockers.push({ label: LABELS.test[lang], href: `${base}/validate` });
  if (!priceOk) blockers.push({ label: LABELS.price[lang], href: `${base}/money` });
  for (const t of tasks.filter((t) => t.category === "legal" && t.status !== "done").slice(0, 2)) {
    blockers.push({ label: t.title, href: `${base}/${taskHref(t.key)}` });
  }
  return { score, parts: { legal, money: moneyScore, market, operations: ops }, blockers: blockers.slice(0, 3) };
}

export const readiness: ReadinessApi = {
  async getReadiness(planId, lang) {
    const plan = await requirePlan(planId);
    const [tasks, m, v] = await Promise.all([
      roadmap.getRoadmap(planId, lang),
      money.getMoneySummary(planId).catch(() => null),
      validate.getValidationStatus(planId),
    ]);
    const r = computeReadiness(planId, tasks, m, v, lang);
    if (plan.readinessScore !== r.score) {
      await db.update(plans).set({ readinessScore: r.score }).where(eq(plans.id, planId));
    }
    return r;
  },
};
