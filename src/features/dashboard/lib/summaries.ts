// src/features/dashboard/lib/summaries.ts   OWNER: T1 — pure, unit-tested.
import { addDays, isAfter, isBefore, parseISO, startOfDay } from "date-fns";
import type { ChecklistItem } from "@/contracts/compliance";
import type { RoadmapTask } from "@/contracts/roadmap";

/** T2 links may be relative to the plan ("validate") or absolute ("/plan/…", "https://…"). */
export function resolvePlanHref(planId: string, href: string): string {
  if (/^(https?:)?\/\//.test(href) || href.startsWith("/")) return href;
  const clean = href.replace(/^\.?\/*/, "");
  return clean ? `/plan/${planId}/${clean}` : `/plan/${planId}`;
}

export function complianceSummary(items: ChecklistItem[]) {
  return { licences: items.length, verified: items.filter((i) => i.status === "verified").length };
}

export function roadmapSummary(tasks: RoadmapTask[]) {
  return { done: tasks.filter((t) => t.status === "done").length, total: tasks.length };
}

/** Open tasks due within the next `days` days (overdue ones included), soonest first. */
export function dueSoon(tasks: RoadmapTask[], today: Date, days = 7): RoadmapTask[] {
  const start = startOfDay(today);
  const limit = addDays(start, days + 1);
  return tasks
    .filter((t) => t.status !== "done" && t.dueDate)
    .filter((t) => isBefore(parseISO(t.dueDate!), limit))
    .sort((a, b) => (isAfter(parseISO(a.dueDate!), parseISO(b.dueDate!)) ? 1 : -1));
}

export function isOverdue(task: RoadmapTask, today: Date): boolean {
  return Boolean(task.dueDate) && isBefore(parseISO(task.dueDate!), startOfDay(today));
}

/** Readiness score clamped to 0–100 for the ring. */
export function clampScore(score: number): number {
  return Number.isFinite(score) ? Math.min(100, Math.max(0, Math.round(score))) : 0;
}
