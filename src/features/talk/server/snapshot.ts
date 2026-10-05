// src/features/talk/server/snapshot.ts — everything the assistant may talk about, from real plan data.
// The assistant answers ONLY from this snapshot; numbers and rules here were computed by code.
import "server-only";
import type { Lang } from "@/contracts/profile";
import type { Plan } from "@/lib/auth";
import { compliance } from "@/features/compliance/api";
import { funding } from "@/features/funding/api";
import { money } from "@/features/money/api";
import { readiness } from "@/features/readiness/api";
import { roadmap } from "@/features/roadmap/api";
import { sprintState } from "@/features/validate/server/results";
import { getSection } from "@/features/validate/server/sections";
import type { Diary } from "@/features/first-customers/actions";
import type { OrderBook } from "@/features/orders/actions";

export async function planSnapshot(plan: Plan, lang: Lang) {
  const settle = <T,>(p: Promise<T>) => p.catch(() => null);
  const [tasks, m, checklist, schemes, ready, sprint, diary, orders] = await Promise.all([
    settle(roadmap.getRoadmap(plan.id, lang)),
    settle(money.getMoneySummary(plan.id)),
    settle(compliance.getChecklist(plan.id, lang)),
    settle(funding.matchSchemes(plan.id, lang)),
    settle(readiness.getReadiness(plan.id, lang)),
    settle(sprintState(plan.id, plan.language)),
    settle(getSection<Diary>(plan.id, "diary", "en")),
    settle(getSection<OrderBook>(plan.id, "orders", "en")),
  ]);
  const month = new Date().toISOString().slice(0, 7);
  const entries = diary?.content.entries.filter((e) => e.date.startsWith(month)) ?? [];
  const p = plan.profile;

  return {
    today: new Date().toISOString().slice(0, 10),
    business: p ? { product: p.product, type: p.businessType, area: [p.locality, p.city].filter(Boolean).join(", "), premises: p.premises, budgetInr: p.budgetInr, customers: p.targetCustomer } : null,
    readinessScore: ready?.score ?? null,
    blockers: ready?.blockers.map((b) => b.label) ?? [],
    openTasks: (tasks ?? []).filter((t) => t.status !== "done").slice(0, 8).map((t) => ({ title: t.title, due: t.dueDate, locked: t.locked })),
    tasksDone: (tasks ?? []).filter((t) => t.status === "done").length,
    tasksTotal: tasks?.length ?? 0,
    sevenDayTest: sprint?.startDate ? { verdict: sprint.verdict.verdict, orders: sprint.totals.orders, enquiries: sprint.totals.enquiries, targets: sprint.targets } : "not started",
    moneyEstimates: m ? { startupInr: m.startupTotal, monthlyCostsInr: m.monthlyFixed, priceInr: m.price, costPerItemInr: m.unitCost, keepPerItemInr: m.marginPerUnit, breakEvenItemsPerMonth: m.breakEvenUnitsPerMonth, loanNeedInr: m.loanNeed } : null,
    licences: (checklist ?? []).map((c) => ({ name: c.name, official: c.authority.split(" · ")[0], why: c.whyNeeded, cost: c.costText, time: c.timeText, status: c.status === "verified" ? "verified" : "check locally" })),
    schemes: (schemes ?? []).slice(0, 5).map((s) => ({ name: s.name, benefit: s.benefit, match: s.applies, forWomen: s.womenFocused })),
    openOrders: (orders?.content.orders ?? []).filter((o) => !(o.status === "delivered" && o.paid)).slice(0, 8).map((o) => ({ customer: o.customer, item: `${o.quantity} × ${o.item}`, due: o.dueDate, time: o.dueTime, status: o.status, stillToCollectInr: o.paid ? 0 : Math.max(0, o.amountInr - o.advanceInr) })),
    salesThisMonth: { salesInr: entries.filter((e) => e.kind === "sale").reduce((s, e) => s + (e.amountInr ?? 0), 0), orders: entries.filter((e) => e.kind === "sale").length, spentInr: entries.filter((e) => e.kind === "expense").reduce((s, e) => s + (e.amountInr ?? 0), 0) },
  };
}
