// src/features/roadmap/api.ts — the founder's tasks (#36, #37): templates + applicable licence rules,
// ordered by phase with dependencies. Stored per plan in plan_tasks so progress is remembered.
import "server-only";
import { and, asc, eq, inArray, notInArray } from "drizzle-orm";
import { addDays, format } from "date-fns";
import type { Phase } from "@/contracts/common";
import type { Lang } from "@/contracts/profile";
import type { NextStep, RoadmapApi, RoadmapTask } from "@/contracts/roadmap";
import { db } from "@/db/client";
import { planTasks } from "@/db/schema";
import { requirePlan } from "@/lib/auth";
import { mergeProfile } from "@/lib/ai/profile";
import { RULE_TASK_DAY, RULES, TASK_TEMPLATES, type L } from "@/knowledge/data";
import { PHASE_ORDER, selectRules } from "@/features/compliance/engine";

type Def = { key: string; phase: Phase; category: RoadmapTask["category"]; title: L; dependsOn: string[]; dayOffset: number; href: string };

const GET: L = { en: "Get: {x}", hi: "पाएँ: {x}", mr: "मिळवा: {x}" };

/** Every task definition the app knows, by key ("rule:<key>" for licence tasks). */
function definition(key: string): Def | null {
  const tpl = TASK_TEMPLATES.find((t) => t.key === key);
  if (tpl) return { key, phase: tpl.phase, category: tpl.category, title: tpl.title, dependsOn: tpl.dependsOn, dayOffset: tpl.dayOffset, href: tpl.href };
  const rule = RULES.find((r) => `rule:${r.key}` === key);
  if (rule) {
    const title = { en: GET.en.replace("{x}", rule.plainName.en), hi: GET.hi.replace("{x}", rule.plainName.hi), mr: GET.mr.replace("{x}", rule.plainName.mr) };
    return { key, phase: rule.phase, category: "legal", title, dependsOn: rule.dependsOn.map((d) => `rule:${d}`), dayOffset: RULE_TASK_DAY[rule.phase], href: "compliance" };
  }
  // The founder's own tasks (from the notebook): "custom:<their words>".
  if (key.startsWith("custom:")) {
    const text = key.slice(7);
    return { key, phase: "prepare", category: "operations", title: { en: text, hi: text, mr: text }, dependsOn: [], dayOffset: 3, href: "roadmap" };
  }
  return null;
}

/** Where in the app a task is done, relative to /plan/[id]. */
export function taskHref(key: string): string {
  return definition(key)?.href ?? "roadmap";
}

const todayInIndia = () => new Date(Date.now() + 5.5 * 3600_000);

function toTask(row: typeof planTasks.$inferSelect, doneKeys: Set<string>, lang: Lang): RoadmapTask {
  const def = definition(row.key);
  const locked = row.status !== "done" && (def?.dependsOn ?? []).some((d) => !doneKeys.has(d) && d !== row.key);
  return {
    id: row.id,
    key: row.key,
    title: def?.title[lang] ?? row.key,
    phase: row.phase,
    category: row.category,
    status: locked && row.status !== "blocked" ? "upcoming" : row.status,
    locked,
    dueDate: row.dueDate,
    notes: row.notes,
    evidenceUrl: row.evidenceUrl,
  };
}

async function loadTasks(planId: string, lang: Lang): Promise<RoadmapTask[]> {
  const rows = await db.select().from(planTasks).where(eq(planTasks.planId, planId)).orderBy(asc(planTasks.sortOrder));
  const doneKeys = new Set(rows.filter((r) => r.status === "done").map((r) => r.key));
  // Keys from both sources must exist in the plan; a dependency on a task the plan doesn't have is ignored.
  const present = new Set(rows.map((r) => r.key));
  for (const r of rows) for (const d of definition(r.key)?.dependsOn ?? []) if (!present.has(d)) doneKeys.add(d);
  return rows.map((r) => toTask(r, doneKeys, lang));
}

export const roadmap: RoadmapApi = {
  /** Builds (or refreshes after an edit) the task list. Idempotent: done tasks and notes are kept. */
  async onProfileConfirmed(planId) {
    const plan = await requirePlan(planId);
    const profile = plan.profile ?? mergeProfile(undefined, {}, plan.language);

    const keys = [
      ...TASK_TEMPLATES.filter((t) =>
        (t.appliesTo.businessTypes.includes("*") || t.appliesTo.businessTypes.includes(profile.businessType)) &&
        t.appliesTo.stages.includes(profile.stage),
      ).map((t) => t.key),
      ...selectRules(profile, plan.language).filter((v) => v.applies === "yes").map((v) => `rule:${v.rule.key}`),
    ];
    const defs = keys.map(definition).filter((d): d is Def => d !== null);
    defs.sort((a, b) => PHASE_ORDER.indexOf(a.phase) - PHASE_ORDER.indexOf(b.phase) || a.dayOffset - b.dayOffset);

    const existing = await db.select().from(planTasks).where(eq(planTasks.planId, planId));
    const have = new Map(existing.map((r) => [r.key, r]));
    const start = todayInIndia();

    // Tasks that no longer apply go, unless the founder already finished them.
    const wanted = [...defs.map((d) => d.key), ...existing.filter((r) => r.key.startsWith("custom:")).map((r) => r.key)];
    await db.delete(planTasks).where(and(eq(planTasks.planId, planId), notInArray(planTasks.key, wanted.length ? wanted : ["-"]), inArray(planTasks.status, ["upcoming", "pending", "blocked"])));

    const fresh = defs
      .map((d, i) => ({ d, i }))
      .filter(({ d }) => !have.has(d.key))
      .map(({ d, i }) => ({
        planId, key: d.key, phase: d.phase, category: d.category, status: "pending" as const,
        dueDate: format(addDays(start, d.dayOffset), "yyyy-MM-dd"), sortOrder: i, updatedBy: plan.userId,
      }));
    if (fresh.length) await db.insert(planTasks).values(fresh);
    // Keep the order consistent with the new list.
    for (const [i, d] of defs.entries()) {
      const row = have.get(d.key);
      if (row && row.sortOrder !== i) await db.update(planTasks).set({ sortOrder: i }).where(eq(planTasks.id, row.id));
    }
  },

  async getRoadmap(planId, lang) {
    await requirePlan(planId);
    return loadTasks(planId, lang);
  },

  async getNextStep(planId, lang): Promise<NextStep> {
    await requirePlan(planId);
    const next = (await loadTasks(planId, lang)).find((t) => t.status !== "done" && !t.locked);
    return next ? { taskId: next.id, title: next.title, href: taskHref(next.key) } : null;
  },

  async markTaskDoneByKey(planId, key) {
    await requirePlan(planId);
    await db.update(planTasks).set({ status: "done", updatedAt: new Date() }).where(and(eq(planTasks.planId, planId), eq(planTasks.key, key)));
  },
};
