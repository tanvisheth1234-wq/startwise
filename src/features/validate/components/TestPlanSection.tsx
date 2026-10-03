"use client";
// OWNER: T1 — #11 7-day test sprint (₹0–500, code-checked) with editable GO targets
import { useFormatter, useTranslations } from "next-intl";
import { CalendarCheck, Info, Rocket } from "lucide-react";
import { Badge, Button, cn } from "@/components/ui";
import { Experiment, type TestPlan } from "@/contracts/sections";
import { startSprint } from "../actions";
import { useDraftSection } from "../hooks/useDraftSection";
import { SPRINT_CAP_INR, totalCost } from "../lib/testPlan";
import type { Section } from "../server/sections";
import { fieldClass, growClass, SectionShell } from "./SectionShell";

const EXPERIMENTS = Experiment.options;

export function TestPlanSection({ planId, initial, ready }: { planId: string; initial: Section<TestPlan> | null; ready: boolean }) {
  const t = useTranslations("validate.testPlan");
  const format = useFormatter();
  const s = useDraftSection<TestPlan>(planId, "test_plan", initial, false);
  const d = s.draft;
  const total = d ? totalCost(d) : 0;
  const over = total > SPRINT_CAP_INR;
  const started = Boolean(s.section?.content.startDate);

  const setDay = (i: number, patch: Partial<TestPlan["days"][number]>) =>
    s.setDraft((x) => ({ ...x, days: x.days.map((day, j) => (j === i ? { ...day, ...patch } : day)) }));
  const setTarget = (key: "enquiries" | "orders", value: string) =>
    s.setDraft((x) => ({ ...x, targets: { ...x.targets, [key]: Math.max(0, Math.min(999, Math.round(Number(value) || 0))) } }));

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
            onClick={() => s.startTransition(async () => { s.apply(await startSprint(planId, d)); })}
          >
            <Rocket className="size-5" aria-hidden />
            {t("start")}
          </Button>
        ) : null
      }
    >
      {d && (
        <div className="space-y-4">
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
              <input type="number" inputMode="numeric" min={0} value={d.targets.orders} onChange={(e) => setTarget("orders", e.target.value)}
                aria-label={t("ordersTarget")} className={cn(fieldClass, "w-20 text-center font-bold")} />
              {t("goOrdersAfter")}
            </label>
            <label className="flex flex-wrap items-center gap-2 text-sm">
              {t("enquiriesBefore")}
              <input type="number" inputMode="numeric" min={0} value={d.targets.enquiries} onChange={(e) => setTarget("enquiries", e.target.value)}
                aria-label={t("enquiriesTarget")} className={cn(fieldClass, "w-20 text-center font-bold")} />
              {t("enquiriesAfter")}
            </label>
            <p className="text-xs text-muted">{t("targetsHint")}</p>
          </div>

          <ol className="space-y-2">
            {d.days.map((day, i) => (
              <li key={day.day} className="space-y-2 rounded-xl border border-line p-3">
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
                <label className="flex items-center gap-2 text-sm text-muted">
                  {t("cost")} ₹
                  <input type="number" inputMode="numeric" min={0} max={SPRINT_CAP_INR} value={day.costInr}
                    onChange={(e) => setDay(i, { costInr: Math.max(0, Math.round(Number(e.target.value) || 0)) })}
                    className={cn(fieldClass, "w-24")} />
                </label>
              </li>
            ))}
          </ol>

          <p className={cn("rounded-xl p-3 text-sm font-semibold", over ? "bg-danger/10 text-danger" : "bg-mint text-forest")}>
            {t("total", { total, cap: SPRINT_CAP_INR })}
            {over && ` — ${t("overCap")}`}
          </p>
        </div>
      )}
    </SectionShell>
  );
}
