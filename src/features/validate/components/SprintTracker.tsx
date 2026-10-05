"use client";
// The test sprint, live: big "+1 enquiry / +1 order" buttons, progress to the GO line, and the verdict.
import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { MessageCircleQuestion, PartyPopper, RotateCcw, ShoppingBag, TrendingUp } from "lucide-react";
import { Celebrate, cn } from "@/components/ui";
import { motion } from "motion/react";
import type { SprintState } from "../server/results";
import { logResult, restartSprint } from "../results";

export function SprintTracker({ planId, initial }: { planId: string; initial: SprintState }) {
  const t = useTranslations("validate.sprint");
  const [s, setS] = useState(initial);
  const [fire, setFire] = useState(0);
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  const inFlight = useRef(0);
  const wasGo = useRef(initial.verdict.verdict === "go");

  if (!s.startDate) return null;

  const add = (enquiries: number, orders: number) => {
    // Optimistic: show the tap at once, then take the server's verdict.
    setS((x) => ({ ...x, totals: { enquiries: x.totals.enquiries + enquiries, orders: x.totals.orders + orders } }));
    if (orders) {
      setMsg(s.totals.orders === 0 ? t("firstOrder") : t("anotherOrder"));
      setFire((n) => n + 1);
    }
    inFlight.current++;
    start(async () => {
      const next = await logResult(planId, { enquiries, orders });
      inFlight.current--;
      if (next.verdict.verdict === "go" && !wasGo.current) {
        wasGo.current = true;
        setMsg(t("goYay"));
        setFire((n) => n + 1);
      }
      // While other taps are still saving, keep the optimistic counts; take the server's once all are in.
      if (inFlight.current === 0) setS(next);
      else setS((x) => ({ ...x, verdict: next.verdict }));
    });
  };

  const bar = (value: number, target: number, tone: string) => (
    <div className="h-3 overflow-hidden rounded-full bg-mint">
      <motion.div
        className={cn("h-full rounded-full", tone)}
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, (value / Math.max(1, target)) * 100)}%` }}
        transition={{ type: "spring", stiffness: 120, damping: 18 }}
      />
    </div>
  );

  const v = s.verdict;
  return (
    <section id="sprint-tracker" className="scroll-mt-20 space-y-4 rounded-[2rem] border border-line/70 bg-white p-4 shadow-soft">
      <Celebrate fire={fire} message={msg} />
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-xl font-bold text-forest">{t("title")}</h2>
        {v.verdict === "pending" && v.daysLeft !== null && <span className="text-sm font-bold text-coral-600">{t("daysLeft", { count: v.daysLeft })}</span>}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <motion.button type="button" whileTap={{ scale: 0.92 }} onClick={() => add(1, 0)} className="flex min-h-24 flex-col items-center justify-center gap-1 rounded-3xl bg-sky-light font-bold text-sky">
          <MessageCircleQuestion className="size-7" aria-hidden />
          {t("plusEnquiry")}
        </motion.button>
        <motion.button type="button" whileTap={{ scale: 0.92 }} onClick={() => add(0, 1)} className="flex min-h-24 flex-col items-center justify-center gap-1 rounded-3xl bg-gradient-to-br from-sun to-coral font-bold text-white shadow-lift">
          <ShoppingBag className="size-7" aria-hidden />
          {t("plusOrder")}
        </motion.button>
      </div>

      <div className="space-y-3">
        <div className="space-y-1">
          <p className="flex justify-between text-sm font-semibold text-forest">
            <span>{t("enquiries")}</span>
            <motion.span key={s.totals.enquiries} initial={{ scale: 1.5, color: "#ec6a3c" }} animate={{ scale: 1, color: "#4a2c22" }} transition={{ type: "spring", stiffness: 300, damping: 15 }} className="inline-block">
              {s.totals.enquiries} / {s.targets.enquiries}
            </motion.span>
          </p>
          {bar(s.totals.enquiries, s.targets.enquiries, "bg-sky")}
        </div>
        <div className="space-y-1">
          <p className="flex justify-between text-sm font-semibold text-forest">
            <span>{t("orders")}</span>
            <motion.span key={s.totals.orders} initial={{ scale: 1.5, color: "#ec6a3c" }} animate={{ scale: 1, color: "#4a2c22" }} transition={{ type: "spring", stiffness: 300, damping: 15 }} className="inline-block">
              {s.totals.orders} / {s.targets.orders}
            </motion.span>
          </p>
          {bar(s.totals.orders, s.targets.orders, "bg-gradient-to-r from-sun to-coral")}
        </div>
      </div>

      {v.verdict === "go" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.7, rotate: -3 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 14 }}
          className="space-y-1 rounded-3xl bg-gradient-to-br from-sage to-teal-600 p-4 text-white"
        >
          <p className="flex items-center gap-2 font-display text-2xl font-extrabold">
            <motion.span initial={{ rotate: -40, scale: 0 }} animate={{ rotate: [0, -15, 15, 0], scale: 1 }} transition={{ delay: 0.25, duration: 0.7 }} className="inline-flex">
              <PartyPopper className="size-7" aria-hidden />
            </motion.span>
            {t("go")}
          </p>
          <p>{t("goBody")}</p>
        </motion.div>
      )}
      {v.verdict === "no_go" && (
        <div className="space-y-3 rounded-3xl bg-sun-light p-4">
          <p className="flex items-center gap-2 font-display text-xl font-bold text-forest">
            <TrendingUp className="size-6 text-coral" aria-hidden />
            {t("noGo")}
          </p>
          <p className="text-ink">{t(`reasons.${v.reason}`)}</p>
          <button
            type="button"
            disabled={pending}
            onClick={() => start(async () => { await restartSprint(planId); location.reload(); })}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-forest font-semibold text-white"
          >
            <RotateCcw className="size-5" aria-hidden />
            {t("retest")}
          </button>
        </div>
      )}
      {v.verdict === "pending" && <p className="text-sm text-muted">{t("pendingHint", { orders: s.targets.orders })}</p>}
    </section>
  );
}
