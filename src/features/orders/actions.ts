"use server";
// src/features/orders/actions.ts — Order book: what's due when, what's paid, what's pending.
// A delivered + paid order is written to the sales diary automatically.
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { addDays, format, nextDay, type Day } from "date-fns";
import { requirePlan, requireUser } from "@/lib/auth";
import { callJson } from "@/lib/ai/callJson";
import { baseRules } from "@/lib/ai/prompts/base";
import { getProvider } from "@/lib/ai/provider";
import { redact } from "@/lib/ai/redact";
import { getSection, saveSection } from "@/features/validate/server/sections";
import { todayInIndia } from "@/features/validate/lib/testPlan";
import type { Diary } from "@/features/first-customers/actions";

export type OrderStatus = "new" | "baking" | "ready" | "delivered";
export type Order = {
  id: string; customer: string; item: string; quantity: number; amountInr: number; advanceInr: number;
  dueDate: string; dueTime: string | null; status: OrderStatus; paid: boolean; note: string; createdAt: string;
};
export type OrderBook = { orders: Order[] };

const KIND = "orders";
const EMPTY: OrderBook = { orders: [] };

export async function loadOrders(planId: string): Promise<OrderBook> {
  await requirePlan(planId);
  return (await getSection<OrderBook>(planId, KIND, "en"))?.content ?? EMPTY;
}

async function save(planId: string, book: OrderBook, userId: string) {
  await saveSection(planId, KIND, "en", book, true, userId);
  revalidatePath(`/plan/${planId}`, "layout");
}

const NewOrder = z.object({
  customer: z.string().trim().min(1).max(40),
  item: z.string().trim().min(1).max(80),
  quantity: z.number().int().min(1).max(1000),
  amountInr: z.number().int().min(0).max(10_000_000),
  advanceInr: z.number().int().min(0).max(10_000_000),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dueTime: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
  note: z.string().max(200),
});

export async function addOrder(planId: string, input: z.input<typeof NewOrder>): Promise<OrderBook> {
  const user = await requireUser();
  const o = NewOrder.parse(input);
  const book = await loadOrders(planId);
  const order: Order = { ...o, id: crypto.randomUUID().slice(0, 8), status: "new", paid: o.advanceInr >= o.amountInr && o.amountInr > 0, createdAt: new Date().toISOString() };
  const next = { orders: [...book.orders, order] };
  await save(planId, next, user.id);
  return next;
}

export async function updateOrder(planId: string, id: string, patch: { status?: OrderStatus; paid?: boolean }): Promise<OrderBook> {
  const user = await requireUser();
  const book = await loadOrders(planId);
  const before = book.orders.find((o) => o.id === id);
  if (!before) return book;
  const after: Order = { ...before, ...(patch.status ? { status: z.enum(["new", "baking", "ready", "delivered"]).parse(patch.status) } : {}), ...(patch.paid !== undefined ? { paid: Boolean(patch.paid) } : {}) };
  const next = { orders: book.orders.map((o) => (o.id === id ? after : o)) };
  await save(planId, next, user.id);

  // Delivered and paid for the first time → it's a sale in the diary.
  const nowComplete = after.status === "delivered" && after.paid;
  const wasComplete = before.status === "delivered" && before.paid;
  if (nowComplete && !wasComplete) {
    const diary = (await getSection<Diary>(planId, "diary", "en"))?.content ?? { entries: [], customers: [] };
    const entry = { id: `ord-${id}`, date: todayInIndia(), text: `${after.quantity} × ${after.item} · ${after.customer}`, kind: "sale" as const, item: after.item, quantity: after.quantity, amountInr: after.amountInr, customer: after.customer };
    if (!diary.entries.some((e) => e.id === entry.id)) {
      await saveSection(planId, "diary", "en", { ...diary, entries: [entry, ...diary.entries] }, true, user.id);
    }
  }
  return next;
}

export async function deleteOrder(planId: string, id: string): Promise<OrderBook> {
  const user = await requireUser();
  const book = await loadOrders(planId);
  const next = { orders: book.orders.filter((o) => o.id !== id) };
  await save(planId, next, user.id);
  return next;
}

// ---------------------------------------------------------------- spoken order → fields
const Spoken = z.object({
  customer: z.string().nullable(),
  item: z.string().nullable(),
  quantity: z.number().nullable(),
  amountInr: z.number().nullable(),
  advanceInr: z.number().nullable(),
  when: z.enum(["today", "tomorrow", "mon", "tue", "wed", "thu", "fri", "sat", "sun", "date", "unknown"]),
  date: z.string().nullable(),
  time: z.string().nullable(),
});

const WEEKDAY: Record<string, Day> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };

/** "Priya, 2 chocolate cakes for Sunday 5 pm, 900, 200 advance" → a filled order form. Code turns the day into a date. */
export async function parseSpokenOrder(planId: string, text: string) {
  const plan = await requirePlan(planId);
  try {
    const s = await callJson(
      Spoken,
      {
        system: [
          baseRules(plan.language),
          "Turn one spoken order from a home seller into fields. Only use numbers the founder said.",
          "amountInr: the TOTAL price. If a per-item price and a quantity were said, multiply. advanceInr: money already paid, else null.",
          "when: today, tomorrow, a weekday (mon…sun), 'date' (then date = YYYY-MM-DD), or unknown. time: 24-hour HH:MM if said, else null.",
          'Return JSON: {"customer":null,"item":null,"quantity":null,"amountInr":null,"advanceInr":null,"when":"unknown","date":null,"time":null}',
        ].join("\n"),
        user: redact(text.slice(0, 400)),
      },
      { temperature: 0.1, provider: getProvider(), fast: true },
    );
    const today = new Date(`${todayInIndia()}T12:00:00`);
    const due =
      s.when === "today" ? today
      : s.when === "tomorrow" ? addDays(today, 1)
      : s.when in WEEKDAY ? nextDay(today, WEEKDAY[s.when])
      : s.when === "date" && s.date && /^\d{4}-\d{2}-\d{2}$/.test(s.date) ? new Date(`${s.date}T12:00:00`)
      : addDays(today, 2);
    return {
      ok: true as const,
      order: {
        customer: s.customer ?? "", item: s.item ?? "", quantity: Math.max(1, Math.round(s.quantity ?? 1)),
        amountInr: Math.max(0, Math.round(s.amountInr ?? 0)), advanceInr: Math.max(0, Math.round(s.advanceInr ?? 0)),
        dueDate: format(due, "yyyy-MM-dd"), dueTime: s.time && /^\d{2}:\d{2}$/.test(s.time) ? s.time : null,
      },
    };
  } catch {
    return { ok: false as const };
  }
}
