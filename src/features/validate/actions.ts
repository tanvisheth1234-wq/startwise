"use server";
// src/features/validate/actions.ts   OWNER: T1 — Screen 5: AI drafts (assumptions, risk, test plan, templates)
import { getLocale } from "next-intl/server";
import { Lang } from "@/contracts/profile";
import { DRAFT_SCHEMAS, type Assumptions, type TestPlan } from "@/contracts/sections";
import { requirePlan, requireUser } from "@/lib/auth";
import { ai } from "@/lib/ai";
import { hasSevenDays, normalise, scaleToCap, SPRINT_CAP_INR, todayInIndia, totalCost, withDefaultTargets } from "./lib/testPlan";
import { getSection, getSectionAnyLang, saveSection, type Section } from "./server/sections";

export type ValidateKind = "assumptions" | "risk" | "test_plan" | "templates";
const KINDS: ValidateKind[] = ["assumptions", "risk", "test_plan", "templates"];

export type DraftResult<T = unknown> =
  | { ok: true; section: Section<T>; scaledNote?: boolean }
  | { ok: false; error: "needsConfirm" | "ai" | "invalid" | "overCap" | "needsAssumptions" | "started" };

async function langFor(planLang: Lang): Promise<Lang> {
  const parsed = Lang.safeParse(await getLocale());
  return parsed.success ? parsed.data : planLang;
}

/** Draft a test plan; code checks shape + ₹500 cap, re-drafts once, then scales costs down. */
async function draftTestPlan(context: unknown, lang: Lang): Promise<{ plan: TestPlan; scaled: boolean }> {
  let plan: TestPlan | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    const p = normalise(await ai.draft<TestPlan>("test_plan", context, lang));
    if (!hasSevenDays(p)) continue;
    plan = p;
    if (totalCost(p) <= SPRINT_CAP_INR) return { plan: withDefaultTargets({ ...p, startDate: null }), scaled: false };
  }
  if (!plan) throw new Error("test plan without 7 days");
  return { plan: withDefaultTargets({ ...scaleToCap(plan), startDate: null }), scaled: true };
}

/** Creates (or, with force, replaces) an AI draft. Never silently overwrites the founder's edits. */
export async function generateSection(planId: string, kind: ValidateKind, force = false): Promise<DraftResult> {
  if (!KINDS.includes(kind)) return { ok: false, error: "invalid" };
  const user = await requireUser();
  const plan = await requirePlan(planId);
  const lang = await langFor(plan.language);

  const existing = await getSection<{ startDate?: string | null }>(plan.id, kind, lang);
  if (kind === "test_plan" && existing?.content.startDate) return { ok: false, error: "started" };
  if (existing?.editedByUser && !force) return { ok: false, error: "needsConfirm" };

  const assumptions = await getSection<Assumptions>(plan.id, "assumptions", lang);
  if ((kind === "test_plan" || kind === "templates") && !assumptions) return { ok: false, error: "needsAssumptions" };
  const context = {
    profile: plan.profile,
    ...(assumptions && kind !== "assumptions" ? { assumptions: assumptions.content.items } : {}),
  };

  try {
    let content: unknown;
    let scaledNote = false;
    if (kind === "test_plan") {
      const r = await draftTestPlan(context, lang);
      content = r.plan;
      scaledNote = r.scaled;
    } else {
      content = await ai.draft(kind, context, lang);
    }
    await saveSection(plan.id, kind, lang, content, false, user.id);
    const section = (await getSection(plan.id, kind, lang))!;
    return { ok: true, section, scaledNote };
  } catch (e) {
    console.error(`[validate] draft ${kind} failed:`, e);
    return { ok: false, error: "ai" };
  }
}

/** Saves the founder's edits (zod-checked); marks the section as edited. */
export async function saveSectionEdit(planId: string, kind: ValidateKind, content: unknown): Promise<DraftResult> {
  if (!KINDS.includes(kind)) return { ok: false, error: "invalid" };
  const user = await requireUser();
  const plan = await requirePlan(planId);
  const lang = await langFor(plan.language);

  const parsed = DRAFT_SCHEMAS[kind].safeParse(content);
  if (!parsed.success) return { ok: false, error: "invalid" };
  let data = parsed.data as unknown;
  if (kind === "test_plan") {
    const tp = normalise(parsed.data as TestPlan);
    if (!hasSevenDays(tp)) return { ok: false, error: "invalid" };
    if (totalCost(tp) > SPRINT_CAP_INR) return { ok: false, error: "overCap" };
    // The start date is set only by startSprint, never by an edit.
    const current = await getSectionAnyLang<TestPlan>(plan.id, "test_plan", lang);
    data = { ...tp, startDate: current?.section.content.startDate ?? null };
    const at = current?.lang ?? lang;
    await saveSection(plan.id, kind, at, data, true, user.id);
    return { ok: true, section: (await getSection(plan.id, kind, at))! };
  }
  await saveSection(plan.id, kind, lang, data, true, user.id);
  return { ok: true, section: (await getSection(plan.id, kind, lang))! };
}

/** Tick a day of the running sprint done (or not). Keeps everything else as it is. */
export async function markDay(planId: string, day: number, done: boolean): Promise<DraftResult> {
  const user = await requireUser();
  const plan = await requirePlan(planId);
  const lang = await langFor(plan.language);
  const found = await getSectionAnyLang<TestPlan>(plan.id, "test_plan", lang);
  if (!found) return { ok: false, error: "invalid" };
  const days = found.section.content.days.map((d) => (d.day === day ? { ...d, done } : d));
  await saveSection(plan.id, "test_plan", found.lang, { ...found.section.content, days }, true, user.id);
  return { ok: true, section: (await getSection(plan.id, "test_plan", found.lang))! };
}

/** Start sprint: saves the plan (as edited) with today's date as startDate. */
export async function startSprint(planId: string, content: unknown): Promise<DraftResult> {
  const saved = await saveSectionEdit(planId, "test_plan", content);
  if (!saved.ok) return saved;
  const user = await requireUser();
  const plan = await requirePlan(planId);
  const lang = await langFor(plan.language);
  const tp = saved.section.content as TestPlan;
  const today = todayInIndia();
  const at = (await getSectionAnyLang<TestPlan>(plan.id, "test_plan", lang))?.lang ?? lang;
  await saveSection(plan.id, "test_plan", at, { ...tp, startDate: tp.startDate ?? today }, true, user.id);
  return { ok: true, section: (await getSection(plan.id, "test_plan", at))! };
}

