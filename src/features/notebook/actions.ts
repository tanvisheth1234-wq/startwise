"use server";
// src/features/notebook/actions.ts — the Idea Notebook: messy thoughts in, shape out.
import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { addDays, format } from "date-fns";
import { db } from "@/db/client";
import { planTasks } from "@/db/schema";
import { requirePlan, requireUser } from "@/lib/auth";
import { shapeNotes, type ShapedNotes } from "@/lib/ai/extras";
import { getSection, saveSection } from "@/features/validate/server/sections";
import { mergeProfile } from "@/lib/ai/profile";

export type Note = { id: string; text: string; createdAt: string };
export type Notebook = { notes: Note[]; shaped: ShapedNotes | null; shapedAt: string | null };

const EMPTY: Notebook = { notes: [], shaped: null, shapedAt: null };
const KIND = "notebook";

export async function loadNotebook(planId: string): Promise<Notebook> {
  await requirePlan(planId);
  return (await getSection<Notebook>(planId, KIND, "en"))?.content ?? EMPTY;
}

async function save(planId: string, nb: Notebook, userId: string) {
  await saveSection(planId, KIND, "en", nb, true, userId);
  revalidatePath(`/plan/${planId}/notebook`);
}

export async function addNote(planId: string, text: string): Promise<Notebook> {
  const user = await requireUser();
  const clean = text.trim().slice(0, 600);
  const nb = await loadNotebook(planId);
  if (!clean) return nb;
  const next = { ...nb, notes: [{ id: crypto.randomUUID().slice(0, 8), text: clean, createdAt: new Date().toISOString() }, ...nb.notes].slice(0, 200) };
  await save(planId, next, user.id);
  return next;
}

export async function deleteNote(planId: string, id: string): Promise<Notebook> {
  const user = await requireUser();
  const nb = await loadNotebook(planId);
  const next = { ...nb, notes: nb.notes.filter((n) => n.id !== id) };
  await save(planId, next, user.id);
  return next;
}

export async function shapeMyThoughts(planId: string): Promise<{ ok: true; notebook: Notebook } | { ok: false; error: "few" | "ai" }> {
  const user = await requireUser();
  const plan = await requirePlan(planId);
  const nb = await loadNotebook(planId);
  if (nb.notes.length < 2) return { ok: false, error: "few" };
  try {
    const profile = plan.profile ?? mergeProfile(undefined, {}, plan.language);
    const notes = nb.notes.slice(0, 60).map((n) => ({ id: n.id, text: n.text }));
    const shaped = await shapeNotes(notes, profile, plan.language);
    // Only ids we gave it count.
    const ids = new Set(notes.map((n) => n.id));
    shaped.groups = shaped.groups.map((g) => ({ ...g, noteIds: g.noteIds.filter((i) => ids.has(i)) })).filter((g) => g.noteIds.length);
    const next = { ...nb, shaped, shapedAt: new Date().toISOString() };
    await save(planId, next, user.id);
    return { ok: true, notebook: next };
  } catch {
    return { ok: false, error: "ai" };
  }
}

/** A note or suggested action becomes a task on the roadmap. */
export async function noteToTask(planId: string, text: string): Promise<void> {
  const user = await requireUser();
  await requirePlan(planId);
  const key = `custom:${text.trim().slice(0, 120)}`;
  const [max] = await db.select({ n: sql<number>`coalesce(max(${planTasks.sortOrder}), 0)` }).from(planTasks).where(eq(planTasks.planId, planId));
  const [exists] = await db.select({ id: planTasks.id }).from(planTasks).where(and(eq(planTasks.planId, planId), eq(planTasks.key, key))).limit(1);
  if (!exists) {
    await db.insert(planTasks).values({
      planId, key, phase: "prepare", category: "operations", status: "pending",
      dueDate: format(addDays(new Date(), 3), "yyyy-MM-dd"), sortOrder: Number(max?.n ?? 0) + 1, updatedBy: user.id,
    });
  }
  revalidatePath(`/plan/${planId}`, "layout");
}
