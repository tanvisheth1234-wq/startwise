"use client";
// Money Lab (#26–#31): drag price and sales, see profit and break-even move live. Every number is an
// editable estimate; formulas live in lib/calc.ts and run the same on the server.
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Loader2, Plus, RefreshCw, Sparkles, Trash2 } from "lucide-react";
import { Badge, Slider, cn } from "@/components/ui";
import { breakEvenUnits, cashFlow90, monthlyProfit, scenarios, suggestedPriceRange, totals, type CostLine } from "../lib/calc";
import { deleteCostLine, reEstimateCosts, saveCostLine, saveMoneyInputs } from "../actions";

const inr = (n: number) => (n < 0 ? "−₹" : "₹") + Math.abs(Math.round(n)).toLocaleString("en-IN");

export function MoneyLab({
  planId,
  initialLines,
  initialPrice,
  initialUnits,
  budget,
  unit = null,
  source = "user",
}: {
  planId: string;
  initialLines: CostLine[];
  initialPrice: number;
  initialUnits: number;
  budget: number | null;
  /** What one "item" is for her business (tiffin, class, blouse…), and whether the numbers are AI estimates. */
  unit?: string | null;
  source?: "ai" | "template" | "user";
}) {
  const t = useTranslations("money");
  const [lines, setLines] = useState(initialLines);
  const [price, setPrice] = useState(initialPrice);
  const [units, setUnits] = useState(initialUnits);
  const [, start] = useTransition();
  const [reEstimating, startReEstimate] = useTransition();
  const per = unit ? t("perUnit", { unit }) : t("perItemPlain");
  const locale = useLocale();
  // "1 student", "10 students" in English; Hindi/Marathi nouns here read fine unchanged.
  const plural = (n: number) => (locale === "en" && unit && n !== 1 && !/s$/i.test(unit) ? `${unit}${/(ch|sh|x)$/i.test(unit) ? "es" : "s"}` : unit);
  const count = (n: number) => (unit ? `${n} ${plural(n)}` : t("unitsValue", { count: n }));

  // Save the sliders a moment after the founder stops dragging.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const id = setTimeout(() => start(() => saveMoneyInputs(planId, { price, unitsPerMonth: units })), 700);
    return () => clearTimeout(id);
  }, [planId, price, units]);

  const tot = totals(lines);
  const profit = monthlyProfit(lines, price, units);
  const be = breakEvenUnits(lines, price);
  const range = suggestedPriceRange(lines);
  const sc = useMemo(() => scenarios(lines, { price, unitsPerMonth: units }), [lines, price, units]);
  const cash = useMemo(() => cashFlow90(lines, { price, unitsPerMonth: units }, budget ?? tot.startupTotal), [lines, price, units, budget, tot.startupTotal]);
  const loanNeed = Math.max(0, tot.startupTotal + 2 * tot.monthlyFixed - (budget ?? 0));
  const priceMax = Math.max(1000, Math.round(price * 2.5 / 50) * 50, range.high * 2);
  const unitsMax = Math.max(100, units * 3);

  const updateLine = (i: number, patch: Partial<CostLine>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const persist = (l: CostLine) => start(async () => {
    if (!l.label.trim()) return;
    await saveCostLine(planId, { id: l.id, label: l.label, kind: l.kind, amountInr: l.amountInr });
  });

  return (
    <div className="space-y-5">
      {/* The big answer first. */}
      {source === "ai" && (
        <section className="flex items-start gap-3 rounded-3xl border-2 border-dashed border-sun bg-sun-light/70 p-4">
          <Sparkles className="mt-0.5 size-5 shrink-0 text-[#b07800]" aria-hidden />
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-sm text-ink">{t("aiEstimates")}</p>
            <button
              type="button"
              disabled={reEstimating}
              onClick={() => {
                if (!confirm(t("reEstimateConfirm"))) return;
                startReEstimate(async () => {
                  await reEstimateCosts(planId);
                  location.reload();
                });
              }}
              className="flex min-h-9 items-center gap-1.5 rounded-full bg-white px-3 text-xs font-bold text-forest shadow-soft disabled:opacity-60"
            >
              {reEstimating ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <RefreshCw className="size-3.5" aria-hidden />}
              {t("reEstimate")}
            </button>
          </div>
        </section>
      )}

      <section
        className={cn(
          "rounded-[2rem] p-5 text-white shadow-lift",
          profit >= 0 ? "bg-gradient-to-br from-sage to-teal-600" : "bg-gradient-to-br from-coral to-berry",
        )}
      >
        <p className="text-sm font-bold uppercase tracking-widest text-white/80">{t("profitLabel")}</p>
        <p className="font-display text-5xl font-extrabold">{inr(profit)}</p>
        <p className="mt-1 text-white/90">
          {be === null ? t("losingEachSale") : units >= be ? t("aboveBreakEven", { units: count(be) }) : t("belowBreakEven", { units: count(be), more: count(be - units) })}
        </p>
        <Badge tone="grey" className="mt-3 bg-white/20 text-white">{t("estimate")}</Badge>
      </section>

      <section className="space-y-4 rounded-3xl border border-line/70 bg-white p-4 shadow-soft">
        <Slider label={unit ? t("priceFor", { unit }) : t("price")} value={price} min={0} max={priceMax} step={10} onChange={setPrice} format={inr} />
        <p className="-mt-2 text-xs text-muted">{t("priceHint", { low: inr(range.low), high: inr(range.high), cost: inr(tot.unitCost), per })}</p>
        <Slider label={t("units")} value={units} min={0} max={unitsMax} step={1} onChange={setUnits} format={count} />
        <div className="grid grid-cols-3 gap-2 text-center">
          <Mini label={t("perItem")} value={inr(price - tot.unitCost)} />
          <Mini label={t("breakEven")} value={be === null ? "—" : count(be)} />
          <Mini label={t("recover")} value={profit > 0 ? t("months", { count: Math.ceil(tot.startupTotal / profit) }) : "—"} />
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="font-display text-lg font-bold text-forest">{t("scenariosTitle")}</h2>
        <div className="grid grid-cols-3 gap-2">
          {sc.map((s) => (
            <div key={s.name} className={cn("rounded-2xl border p-3 text-center", s.name === "likely" ? "border-coral/40 bg-mint" : "border-line/70 bg-white")}>
              <p className="text-xs font-bold uppercase text-muted">{t(`scenario.${s.name}`)}</p>
              <p className={cn("font-display text-lg font-extrabold", s.profit >= 0 ? "text-sage" : "text-danger")}>{inr(s.profit)}</p>
              <p className="text-[11px] text-muted">{t("scenarioDetail", { units: s.units, price: inr(s.price) })}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-2 rounded-3xl border border-line/70 bg-white p-4 shadow-soft">
        <h2 className="font-display text-lg font-bold text-forest">{t("cashTitle")}</h2>
        <p className="text-sm text-muted">{t("cashHint")}</p>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={cash} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="cashFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ec6a3c" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#ec6a3c" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0dccc" vertical={false} />
              <XAxis dataKey="week" tickFormatter={(w) => (w % 4 === 0 ? t("week", { n: w }) : "")} tick={{ fontSize: 11, fill: "#7d665b" }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => `${Math.round(v / 1000)}k`} tick={{ fontSize: 11, fill: "#7d665b" }} axisLine={false} tickLine={false} width={36} />
              <ReferenceLine y={0} stroke="#c4412f" strokeDasharray="4 4" />
              <Tooltip formatter={(v) => inr(Number(v))} labelFormatter={(w) => t("week", { n: String(w) })} />
              <Area isAnimationActive={false} type="monotone" dataKey="balance" stroke="#ec6a3c" strokeWidth={2.5} fill="url(#cashFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <p className={cn("rounded-2xl p-3 text-sm font-semibold", loanNeed > 0 ? "bg-sun-light text-[#8a5a00]" : "bg-sage-light text-sage")}>
          {loanNeed > 0 ? t("loanNeed", { amount: inr(loanNeed) }) : t("noLoan")}
        </p>
      </section>

      <section className="space-y-3 rounded-3xl border border-line/70 bg-white p-4 shadow-soft">
        <h2 className="font-display text-lg font-bold text-forest">{t("costsTitle")}</h2>
        {(["one_time", "monthly", "per_unit"] as const).map((kind) => (
          <div key={kind} className="space-y-2">
            <div className="flex items-baseline justify-between">
              <h3 className="text-sm font-bold text-forest">{t(`kind.${kind}`)}</h3>
              <span className="text-sm font-bold text-coral-600">{inr(kind === "one_time" ? tot.startupTotal : kind === "monthly" ? tot.monthlyFixed : tot.unitCost)}</span>
            </div>
            <ul className="space-y-1.5">
              {lines.map((l, i) =>
                l.kind !== kind ? null : (
                  <li key={l.id ?? `new-${i}`} className="flex items-center gap-2">
                    <input
                      value={l.label}
                      onChange={(e) => updateLine(i, { label: e.target.value })}
                      onBlur={() => persist(lines[i])}
                      aria-label={t("itemName")}
                      className="min-h-10 min-w-0 flex-1 rounded-xl border border-line px-2 text-sm"
                    />
                    <span className="relative">
                      <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-sm text-muted">₹</span>
                      <input
                        value={l.amountInr}
                        inputMode="numeric"
                        onChange={(e) => updateLine(i, { amountInr: Number(e.target.value.replace(/\D/g, "")) || 0 })}
                        onBlur={() => persist(lines[i])}
                        aria-label={t("amount")}
                        className="min-h-10 w-24 rounded-xl border border-line pl-5 pr-2 text-right text-sm font-semibold"
                      />
                    </span>
                    <button
                      type="button"
                      aria-label={t("remove")}
                      onClick={() => {
                        const id = l.id;
                        setLines((ls) => ls.filter((_, j) => j !== i));
                        if (id) start(() => deleteCostLine(planId, id));
                      }}
                      className="grid size-10 place-items-center rounded-full text-muted hover:bg-danger/10 hover:text-danger"
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  </li>
                ),
              )}
            </ul>
            <button
              type="button"
              onClick={() => setLines((ls) => [...ls, { label: "", kind, amountInr: 0 }])}
              className="flex min-h-10 items-center gap-1 text-sm font-semibold text-coral-600"
            >
              <Plus className="size-4" aria-hidden />
              {t("addLine")}
            </button>
          </div>
        ))}
      </section>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-mint/70 p-2">
      <p className="text-[11px] font-semibold text-muted">{label}</p>
      <p className="font-display font-extrabold text-forest">{value}</p>
    </div>
  );
}
