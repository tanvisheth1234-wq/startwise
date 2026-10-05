"use server";
// src/features/demo/actions.ts — "See a live demo": gives the visitor their own copy of Sunita's plan
// (as a guest), so judges can click around a fully filled-in plan without typing anything.
import { and, desc, eq, inArray, like } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { addDays, format } from "date-fns";
import { Lang } from "@/contracts/profile";
import { db } from "@/db/client";
import { planTasks, plans, testResults } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { roadmap } from "@/features/roadmap/api";
import { ensureMoneyDefaults } from "@/features/money/server/store";
import { saveMoneyInputs } from "@/features/money/actions";
import { getSection, saveSection } from "@/features/validate/server/sections";
import { todayInIndia } from "@/features/validate/lib/testPlan";
import type { Diary } from "@/features/first-customers/actions";
import type { Notebook } from "@/features/notebook/actions";
import {
  DEMO_DIARY, DEMO_DONE_TASKS, DEMO_IDEA, DEMO_NOTES, DEMO_RESULTS,
  demoAssumptions, demoProfile, demoRisk, demoTemplates, demoTestPlan,
} from "./fixture";

const LANGS: Lang[] = ["en", "hi", "mr"];

export async function startDemo(): Promise<void> {
  const user = await requireUser("/demo");
  // Opening the demo link again reopens the same demo instead of making copies.
  const [existing] = await db.select({ id: plans.id }).from(plans).where(and(eq(plans.userId, user.id), like(plans.ideaText, "%Kothrud%"), like(plans.title, "%·%"), eq(plans.status, "confirmed"))).orderBy(desc(plans.createdAt)).limit(1);
  const isDemo = existing ? Boolean(await getSection(existing.id, "orders", "en")) : false;
  if (existing && isDemo) redirect(`/plan/${existing.id}`);
  const parsed = Lang.safeParse(await getLocale());
  const lang = parsed.success ? parsed.data : "en";
  const profile = demoProfile(lang);
  const today = todayInIndia();
  const day = (offset: number) => format(addDays(new Date(`${today}T12:00:00`), offset), "yyyy-MM-dd");
  const start = day(-9);

  const [plan] = await db
    .insert(plans)
    .values({
      userId: user.id, title: lang === "en" ? "Sunita's home bakery · Pune" : lang === "hi" ? "सुनीता की होम बेकरी · पुणे" : "सुनीताची होम बेकरी · पुणे",
      stage: "new_idea", status: "confirmed", ideaText: DEMO_IDEA[lang], profile, language: lang, updatedBy: user.id,
    })
    .returning({ id: plans.id });
  const planId = plan.id;

  // Drafts in every language, so switching language mid-demo never waits for the AI.
  for (const l of LANGS) {
    await saveSection(planId, "assumptions", l, demoAssumptions(l), false, user.id);
    await saveSection(planId, "risk", l, demoRisk(l), false, user.id);
    await saveSection(planId, "test_plan", l, demoTestPlan(l, start), true, user.id);
    await saveSection(planId, "templates", l, demoTemplates(l), false, user.id);
  }
  await db.insert(testResults).values(DEMO_RESULTS.map((r) => ({ planId, day: day(-9 + r.dayOffset), enquiries: r.enquiries, orders: r.orders, updatedBy: user.id })));

  await roadmap.onProfileConfirmed(planId);
  await db.update(planTasks).set({ status: "done" }).where(and(eq(planTasks.planId, planId), inArray(planTasks.key, DEMO_DONE_TASKS)));
  await ensureMoneyDefaults(planId, profile, lang, user.id, { ai: false }); // the demo keeps its fixed numbers
  await saveMoneyInputs(planId, { price: 450, unitsPerMonth: 40 });

  const diary: Diary = {
    entries: DEMO_DIARY.map((e, i) => ({ id: `demo${i}`, date: day(-e.daysAgo), text: e.text[lang], kind: e.kind, item: e.item, quantity: e.quantity, amountInr: e.amountInr, customer: e.customer })),
    customers: [
      { id: "c1", name: "Priya", status: "ordered", note: "", lastDate: day(0) },
      { id: "c2", name: "Meera", status: "ordered", note: "", lastDate: day(-1) },
      { id: "c3", name: "Kavita", status: "ordered", note: "", lastDate: day(-4) },
      { id: "c4", name: "Anjali", status: "follow_up", note: "", lastDate: day(-3) },
    ],
  };
  await saveSection(planId, "diary", "en", diary, true, user.id);
  const notebook: Notebook = {
    notes: DEMO_NOTES.map((n, i) => ({ id: `n${i}`, text: n[lang], createdAt: addDays(new Date(), -i).toISOString() })),
    shaped: null,
    shapedAt: null,
  };
  await saveSection(planId, "notebook", "en", notebook, true, user.id);
  await saveSection(planId, "funding_answers", "en", { founderIsWoman: true, ageBand: "36-50" }, true, user.id);
  const now = new Date().toISOString();
  await saveSection(planId, "orders", "en", {
    orders: [
      { id: "o1", customer: "Anjali", item: lang === "en" ? "Eggless chocolate cake (1 kg)" : lang === "hi" ? "एगलेस चॉकलेट केक (1 किलो)" : "एगलेस चॉकलेट केक (१ किलो)", quantity: 1, amountInr: 900, advanceInr: 300, dueDate: day(1), dueTime: "17:00", status: "baking", paid: false, note: "", createdAt: now },
      { id: "o2", customer: "Karve Road office", item: lang === "en" ? "Diwali cookie box" : lang === "hi" ? "दिवाली कुकी बॉक्स" : "दिवाळी कुकी बॉक्स", quantity: 20, amountInr: 5600, advanceInr: 2000, dueDate: day(5), dueTime: "11:00", status: "new", paid: false, note: "", createdAt: now },
      { id: "o3", customer: "Meera", item: lang === "en" ? "Cookie box" : lang === "hi" ? "कुकी बॉक्स" : "कुकी बॉक्स", quantity: 2, amountInr: 560, advanceInr: 560, dueDate: day(0), dueTime: "18:30", status: "ready", paid: true, note: "", createdAt: now },
    ],
  }, true, user.id);

  redirect(`/plan/${planId}`);
}
