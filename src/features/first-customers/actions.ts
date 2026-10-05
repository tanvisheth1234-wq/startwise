"use server";
// src/features/first-customers/actions.ts — voice sales diary + a little customer list.
// The AI only turns a spoken line into fields; amounts are only ever what the founder said.
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePlan, requireUser } from "@/lib/auth";
import { parseDiaryEntry } from "@/lib/ai/extras";
import { getSection, saveSection } from "@/features/validate/server/sections";
import { todayInIndia } from "@/features/validate/lib/testPlan";
import { roadmap } from "@/features/roadmap/api";

export type DiaryEntry = {
  id: string; date: string; text: string;
  kind: "sale" | "expense" | "enquiry" | "unclear";
  item: string | null; quantity: number | null; amountInr: number | null; customer: string | null;
};
export type CustomerStatus = "asked" | "ordered" | "follow_up";
export type Customer = { id: string; name: string; status: CustomerStatus; note: string; lastDate: string };
export type Diary = { entries: DiaryEntry[]; customers: Customer[] };

const KIND = "diary";
const EMPTY: Diary = { entries: [], customers: [] };
const id = () => crypto.randomUUID().slice(0, 8);

export async function loadDiary(planId: string): Promise<Diary> {
  await requirePlan(planId);
  return (await getSection<Diary>(planId, KIND, "en"))?.content ?? EMPTY;
}

async function save(planId: string, d: Diary, userId: string) {
  await saveSection(planId, KIND, "en", d, true, userId);
  revalidatePath(`/plan/${planId}`, "layout");
}

function upsertCustomer(list: Customer[], name: string, status: CustomerStatus, date: string): Customer[] {
  const clean = name.trim().slice(0, 40);
  if (!clean) return list;
  const i = list.findIndex((c) => c.name.toLowerCase() === clean.toLowerCase());
  if (i < 0) return [{ id: id(), name: clean, status, note: "", lastDate: date }, ...list];
  const rank: Record<CustomerStatus, number> = { asked: 0, follow_up: 1, ordered: 2 };
  const next = [...list];
  next[i] = { ...next[i], status: rank[status] >= rank[next[i].status] ? status : next[i].status, lastDate: date };
  return next;
}

/** A spoken or typed diary line → a record. Returns whether this was the very first sale. */
export async function addDiaryLine(planId: string, text: string): Promise<{ ok: true; diary: Diary; entry: DiaryEntry; firstSale: boolean } | { ok: false }> {
  const user = await requireUser();
  const plan = await requirePlan(planId);
  const line = text.trim().slice(0, 400);
  if (!line) return { ok: false };
  let parsed;
  try {
    parsed = await parseDiaryEntry(line, plan.language);
  } catch {
    parsed = { kind: "unclear" as const, item: null, quantity: null, amountInr: null, customer: null };
  }
  const d = await loadDiary(planId);
  const date = todayInIndia();
  const entry: DiaryEntry = {
    id: id(), date, text: line, kind: parsed.kind, item: parsed.item,
    quantity: parsed.quantity, amountInr: parsed.amountInr === null ? null : Math.max(0, Math.round(parsed.amountInr)), customer: parsed.customer,
  };
  const firstSale = entry.kind === "sale" && !d.entries.some((e) => e.kind === "sale");
  let customers = d.customers;
  if (entry.customer && (entry.kind === "sale" || entry.kind === "enquiry")) {
    customers = upsertCustomer(customers, entry.customer, entry.kind === "sale" ? "ordered" : "asked", date);
  }
  const next = { entries: [entry, ...d.entries].slice(0, 500), customers };
  await save(planId, next, user.id);
  if (firstSale) await roadmap.markTaskDoneByKey(planId, "pilot.first_orders").catch(() => {});
  return { ok: true, diary: next, entry, firstSale };
}

export async function deleteDiaryEntry(planId: string, entryId: string): Promise<Diary> {
  const user = await requireUser();
  const d = await loadDiary(planId);
  const next = { ...d, entries: d.entries.filter((e) => e.id !== entryId) };
  await save(planId, next, user.id);
  return next;
}

const Status = z.enum(["asked", "ordered", "follow_up"]);

export async function saveCustomer(planId: string, c: { id?: string; name: string; status: CustomerStatus; note?: string }): Promise<Diary> {
  const user = await requireUser();
  const d = await loadDiary(planId);
  const status = Status.parse(c.status);
  const name = c.name.trim().slice(0, 40);
  if (!name) return d;
  const date = todayInIndia();
  const customers = c.id
    ? d.customers.map((x) => (x.id === c.id ? { ...x, name, status, note: (c.note ?? x.note).slice(0, 200), lastDate: date } : x))
    : [{ id: id(), name, status, note: (c.note ?? "").slice(0, 200), lastDate: date }, ...d.customers];
  const next = { ...d, customers };
  await save(planId, next, user.id);
  return next;
}

export async function deleteCustomer(planId: string, customerId: string): Promise<Diary> {
  const user = await requireUser();
  const d = await loadDiary(planId);
  const next = { ...d, customers: d.customers.filter((c) => c.id !== customerId) };
  await save(planId, next, user.id);
  return next;
}
