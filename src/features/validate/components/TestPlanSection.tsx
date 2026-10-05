"use client";
// OWNER: T1 — #11 7-day test sprint (₹0–500, code-checked) with editable GO targets
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { BellRing, CalendarCheck, Check, HandHeart, Info, Pencil, Rocket } from "lucide-react";
import { Badge, Button, Celebrate, Sheet, cn } from "@/components/ui";
import { Experiment, type Templates, type TestPlan } from "@/contracts/sections";
import { markDay, saveSectionEdit, startSprint } from "../actions";
import { DayHelp, type PosterInfo } from "./DayHelp";
import { addDaysIso, buildIcs } from "../lib/reminders";
import { useDraftSection } from "../hooks/useDraftSection";
import { SPRINT_CAP_INR, todayInIndia, totalCost } from "../lib/testPlan";
import type { Section } from "../server/sections";
import { fieldClass, growClass, SectionShell } from "./SectionShell";

const EXPERIMENTS = Experiment.options;


// "02" → "2": React keeps the typed text when the number is the same, so tidy it when she leaves the box.
const tidyNumber = (e: React.FocusEvent<HTMLInputElement>) => {
  if (e.target.value !== "") e.target.value = String(Number(e.target.value));
};
export function TestPlanSection({ planId, initial, ready, templates, poster }: { planId: string; initial: Section<TestPlan> | null; ready: boolean; templates: Templates | null; poster: PosterInfo }) {
  const t = useTranslations("validate.testPlan");
  const th = useTranslations("validate.help");
  const [helpFor, setHelpFor] = useState<number | null>(null);
  const [cheer, setCheer] = useState(0);
  const [cheerMsg, setCheerMsg] = useState("");
  const format = useFormatter();
  const s = useDraftSection<TestPlan>(planId, "test_plan", initial, false);
  const d = s.draft;
  const total = d ? totalCost(d) : 0;
  const over = total > SPRINT_CAP_INR;
  const started = Boolean(s.section?.content.startDate);
  const [editing, setEditing] = useState<number | null>(null);
  const router = useRouter();

  const setDay = (i: number, patch: Partial<TestPlan["days"][number]>) =>
    s.setDraft((x) => ({ ...x, days: x.days.map((day, j) => (j === i ? { ...day, ...patch } : day)) }));
  const setTarget = (key: "enquiries" | "orders", value: string) =>
    s.setDraft((x) => ({ ...x, targets: { ...x.targets, [key]: Math.max(0, Math.min(999, Math.round(Number(value) || 0))) } }));
  // The GO line saves itself as soon as she leaves the box, so the tracker always uses what she set.
  const saveTargets = (e: React.FocusEvent<HTMLInputElement>) => {
    tidyNumber(e);
    if (!d || !s.dirty) return;
    s.startTransition(async () => {
      s.apply(await saveSectionEdit(planId, "test_plan", d));
      router.refresh();
    });
  };

  // Which day of the sprint is today (1-7), counted from the start date in India time.
  const startDate = s.section?.content.startDate;
  const todayN = startDate ? Math.floor((Date.parse(todayInIndia()) - Date.parse(startDate)) / 86_400_000) + 1 : 0;
  const doneCount = d ? d.days.filter((x) => x.done).length : 0;
  const [reminded, setReminded] = useState(false);
  // No push notifications: a calendar file with a 10 AM reminder for each day still to do.
  const remind = () => {
    if (!d || !startDate) return;
    const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
    const ics = buildIcs(
      d.days.filter((x) => !x.done).map((x) => ({ date: addDaysIso(startDate, x.day - 1), title: th("remindTitle", { n: x.day, kind: t(`experiments.${x.experiment}`) }), detail: x.action })),
      stamp,
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
    a.download = "startwise-7-day-test.ics";
    a.click();
    URL.revokeObjectURL(a.href);
    setReminded(true);
  };
  const tick = (n: number, done: boolean) => {
    s.setDraft((x) => ({ ...x, days: x.days.map((day) => (day.day === n ? { ...day, done } : day)) }));
    if (done) {
      setCheerMsg(th("dayDone", { n }));
      setCheer((c) => c + 1);
    }
    s.startTransition(async () => {
      s.apply(await markDay(planId, n, done));
    });
  };

  return (
    <SectionShell
      title={t("title")}
      intro={t("intro")}
      hasContent={Boolean(d)}
      edited={Boolean(s.section?.editedByUser)}
      dirty={s.dirty}
      busy={s.busy}
      error={s.error}
      onSave={s.save}
      onRegenerate={started ? undefined : () => s.generate()}
      emptyAction={
        <Button onClick={() => s.generate()} disabled={!ready}>
          <CalendarCheck className="size-4" aria-hidden />
          {ready ? t("create") : t("needsAssumptions")}
        </Button>
      }
      footer={
        d && !started ? (
          <Button
            block
            size="lg"
            variant="gold"
            disabled={s.busy || over}
            onClick={() => s.startTransition(async () => {
              s.apply(await startSprint(planId, d));
              // Show the "+1 enquiry / +1 order" tracker straight away, and take her to it.
              router.refresh();
              setTimeout(() => document.getElementById("sprint-tracker")?.scrollIntoView({ behavior: "smooth", block: "start" }), 600);
            })}
          >
            <Rocket className="size-5" aria-hidden />
            {t("start")}
          </Button>
        ) : null
      }
    >
      {d && (
        <div className="space-y-4">
          <Celebrate fire={cheer} message={cheerMsg} />
          {started && (
            <div className="space-y-1.5">
              <p className="text-sm font-semibold text-forest">{th("progress", { done: doneCount })}</p>
              <div className="h-2.5 overflow-hidden rounded-full bg-mint">
                <div className="h-full rounded-full bg-gradient-to-r from-sage to-teal-600 transition-all duration-500" style={{ width: `${(doneCount / 7) * 100}%` }} />
              </div>
            </div>
          )}
          {started && doneCount < 7 && (
            <div className="space-y-1">
              <button type="button" onClick={remind} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border-2 border-line bg-white text-sm font-semibold text-forest hover:border-coral/60">
                <BellRing className="size-4 text-coral" aria-hidden />
                {th("remind")}
              </button>
              {reminded && <p role="status" className="text-center text-xs font-semibold text-sage">{th("remindSaved")}</p>}
            </div>
          )}
          {started && (
            <p className="flex items-center gap-2 rounded-xl bg-mint p-3 text-sm font-semibold text-forest">
              <CalendarCheck className="size-4" aria-hidden />
              {t("startedOn", { date: format.dateTime(new Date(s.section!.content.startDate! + "T00:00:00"), { day: "numeric", month: "long" }) })}
            </p>
          )}
          {s.scaledNote && (
            <p className="flex items-start gap-2 rounded-xl bg-gold-light/30 p-3 text-sm">
              <Info className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden />
              {t("scaledNote")}
            </p>
          )}

          {/* The GO line the founder commits to before starting. */}
          <div className="space-y-2 rounded-xl border-2 border-gold/50 bg-gold-light/15 p-3">
            <p className="text-sm font-semibold text-forest">{t("goLineTitle")}</p>
            <label className="flex flex-wrap items-center gap-2 text-sm">
              {t("goOrdersBefore")}
              <input type="number" inputMode="numeric" min={0} onBlur={saveTargets} value={d.targets.orders} onChange={(e) => setTarget("orders", e.target.value)}
                aria-label={t("ordersTarget")} className={cn(fieldClass, "!w-16 shrink-0 text-center font-bold")} />
              {t("goOrdersAfter")}
            </label>
            <label className="flex flex-wrap items-center gap-2 text-sm">
              {t("enquiriesBefore")}
              <input type="number" inputMode="numeric" min={0} onBlur={saveTargets} value={d.targets.enquiries} onChange={(e) => setTarget("enquiries", e.target.value)}
                aria-label={t("enquiriesTarget")} className={cn(fieldClass, "!w-16 shrink-0 text-center font-bold")} />
              {t("enquiriesAfter")}
            </label>
            <p className="text-xs text-muted">{t("targetsHint")}</p>
          </div>

          {/* Read like a plan; edit one day only when she wants to (no wall of form fields). */}
          <ol className="space-y-2">
            {d.days.map((day, i) =>
              editing === i ? (
                <li key={day.day} className="space-y-2 rounded-2xl border-2 border-coral/40 bg-white p-3">
                  <div className="flex items-center justify-between gap-2">
                    <Badge tone="green">{t("day", { n: day.day })}</Badge>
                    <select
                      aria-label={t("experimentLabel", { n: day.day })}
                      value={day.experiment}
                      onChange={(e) => setDay(i, { experiment: e.target.value as TestPlan["days"][number]["experiment"] })}
                      className="min-h-9 rounded-lg border border-line bg-white px-2 text-xs font-semibold text-teal"
                    >
                      {EXPERIMENTS.map((x) => <option key={x} value={x}>{t(`experiments.${x}`)}</option>)}
                    </select>
                  </div>
                  <textarea aria-label={t("actionLabel", { n: day.day })} value={day.action} rows={2} maxLength={300}
                    onChange={(e) => setDay(i, { action: e.target.value })} className={growClass} />
                  <div className="flex items-center justify-between gap-2">
                    <label className="flex items-center gap-2 text-sm text-muted">
                      {t("cost")} ₹
                      <input type="number" inputMode="numeric" min={0} onBlur={tidyNumber} max={SPRINT_CAP_INR} value={day.costInr}
                        onChange={(e) => setDay(i, { costInr: Math.max(0, Math.round(Number(e.target.value) || 0)) })}
                        className={cn(fieldClass, "w-24")} />
                    </label>
                    <Button size="sm" variant="secondary" onClick={() => setEditing(null)}>
                      <Check className="size-4" aria-hidden />
                      {t("doneEditing")}
                    </Button>
                  </div>
                </li>
              ) : (
                <li
                  key={day.day}
                  className={cn(
                    "flex items-start gap-3 rounded-2xl border bg-white p-3 transition-colors",
                    started && day.done ? "border-sage/40 bg-sage-light/50" : started && day.day === todayN ? "border-2 border-coral/60 shadow-soft" : "border-line/70",
                  )}
                >
                  {started ? (
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={Boolean(day.done)}
                      aria-label={day.done ? th("markUndone", { n: day.day }) : th("markDone", { n: day.day })}
                      onClick={() => tick(day.day, !day.done)}
                      className={cn(
                        "grid size-10 shrink-0 place-items-center rounded-full border-2 font-display text-xs font-bold transition-colors",
                        day.done ? "border-sage bg-sage text-white" : "border-line bg-white text-coral-600 hover:border-coral",
                      )}
                    >
                      {day.done ? <Check className="size-5" aria-hidden /> : day.day}
                    </button>
                  ) : (
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-mint text-center font-display text-xs font-bold leading-tight text-coral-600">
                      {t("day", { n: day.day })}
                    </span>
                  )}
                  <span className="min-w-0 flex-1 space-y-1.5">
                    <span className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-sage">
                      {started && <span className="text-forest">{t("day", { n: day.day })} ·</span>}
                      {t(`experiments.${day.experiment}`)}{day.costInr > 0 ? ` · ₹${day.costInr}` : ""}
                      {started && day.day === todayN && !day.done && <span className="rounded-full bg-coral px-2 py-0.5 text-[11px] font-bold text-white">{th("today")}</span>}
                    </span>
                    <span className={cn("block text-sm text-ink", day.done && "text-muted line-through decoration-sage/50")}>{day.action}</span>
                    {started && !day.done && (
                      <button type="button" onClick={() => setHelpFor(i)} className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-coral/10 px-3 text-sm font-semibold text-coral-600 hover:bg-coral/20">
                        <HandHeart className="size-4" aria-hidden />
                        {th("button")}
                      </button>
                    )}
                  </span>
                  {!started && (
                    <button type="button" onClick={() => setEditing(i)} aria-label={t("editDay", { n: day.day })} className="grid size-9 shrink-0 place-items-center rounded-full text-muted hover:bg-mint">
                      <Pencil className="size-4" aria-hidden />
                    </button>
                  )}
                </li>
              ),
            )}
          </ol>

          <Sheet open={helpFor !== null} onClose={() => setHelpFor(null)} title={helpFor !== null ? th("sheetTitle", { n: d.days[helpFor].day }) : ""}>
            {helpFor !== null && <DayHelp planId={planId} day={d.days[helpFor]} templates={templates} poster={poster} />}
          </Sheet>

          <p className={cn("rounded-xl p-3 text-sm font-semibold", over ? "bg-danger/10 text-danger" : "bg-mint text-forest")}>
            {t("total", { total, cap: SPRINT_CAP_INR })}
            {over && ` — ${t("overCap")}`}
          </p>
        </div>
      )}
    </SectionShell>
  );
}
