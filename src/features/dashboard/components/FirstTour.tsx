"use client";
// A gentle 3-step tour the first time she opens her plan: next step → journey → "talk to me".
// Each step lights up one part of the screen; she can skip any time. Shown once per plan.
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui";

const STEPS = ["next", "journey", "talk"] as const;

export function FirstTour({ planId }: { planId: string }) {
  const t = useTranslations("dashboard.tour");
  const key = `sw_tour_${planId}`;
  const [step, setStep] = useState<number | null>(null);

  useEffect(() => {
    let seen = true;
    try {
      seen = Boolean(localStorage.getItem(key));
    } catch {
      /* no storage: just don't show the tour */
    }
    if (seen) return;
    const id = setTimeout(() => setStep(0), 900);
    return () => clearTimeout(id);
  }, [key]);

  useEffect(() => {
    if (step === null) return;
    const el = document.querySelector<HTMLElement>(`[data-tour="${STEPS[step]}"]`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    const prev = { outline: el.style.outline, offset: el.style.outlineOffset, z: el.style.zIndex, pos: el.style.position };
    el.style.outline = "4px solid #ffc24b";
    el.style.outlineOffset = "6px";
    el.style.zIndex = "45";
    if (getComputedStyle(el).position === "static") el.style.position = "relative";
    return () => {
      el.style.outline = prev.outline;
      el.style.outlineOffset = prev.offset;
      el.style.zIndex = prev.z;
      el.style.position = prev.pos;
    };
  }, [step]);

  const finish = () => {
    try {
      localStorage.setItem(key, "1");
    } catch {
      /* fine */
    }
    setStep(null);
  };

  if (step === null) return null;
  const last = step === STEPS.length - 1;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-forest/35" aria-hidden onClick={finish} />
      <div role="dialog" aria-modal="true" aria-label={t("label")} className="fixed inset-x-4 bottom-[calc(6.5rem+env(safe-area-inset-bottom))] z-50 mx-auto max-w-md animate-pop rounded-3xl bg-white p-5 shadow-lift">
        <p className="text-xs font-bold uppercase tracking-widest text-coral-600">{t("count", { n: step + 1, total: STEPS.length })}</p>
        <p className="mt-1 font-display text-xl font-bold text-forest">{t(`${STEPS[step]}.title`)}</p>
        <p className="mt-1 text-ink">{t(`${STEPS[step]}.body`)}</p>
        <div className="mt-4 flex items-center justify-between gap-2">
          <button type="button" onClick={finish} className="min-h-11 px-2 text-sm font-semibold text-muted">
            {t("skip")}
          </button>
          <Button onClick={() => (last ? finish() : setStep(step + 1))}>{last ? t("done") : t("nextBtn")}</Button>
        </div>
      </div>
    </>
  );
}
