"use client";
// "I've done this step" at the bottom of a step's own page (Costs, Launch), so she never has to
// hunt in the task list. Ticking it grows that leaf on her plant; tapping again undoes it.
import { useState, useTransition } from "react";
import { CheckCircle2, Sprout } from "lucide-react";
import { Celebrate, cn } from "@/components/ui";
import { completeStep } from "../actions";

export function StepDone({
  planId,
  step,
  initiallyDone,
  label,
  doneLabel,
  hint,
  undo,
  cheer,
}: {
  planId: string;
  step: "costs" | "launch" | "month";
  initiallyDone: boolean;
  label: string;
  doneLabel: string;
  hint: string;
  undo: string;
  cheer: string;
}) {
  const [done, setDone] = useState(initiallyDone);
  const [fire, setFire] = useState(0);
  const [, start] = useTransition();

  const toggle = () => {
    const next = !done;
    setDone(next);
    if (next) setFire((n) => n + 1);
    start(() => completeStep(planId, step, next));
  };

  return (
    <section className={cn("space-y-2 rounded-3xl border-2 p-4", done ? "border-sage/50 bg-sage-light/60" : "border-dashed border-sage/40 bg-white")}>
      <Celebrate fire={fire} message={cheer} />
      {!done && (
        <p className="flex items-start gap-2 text-sm text-muted">
          <Sprout className="mt-0.5 size-4 shrink-0 text-sage" aria-hidden />
          {hint}
        </p>
      )}
      <button
        type="button"
        onClick={toggle}
        aria-pressed={done}
        className={cn(
          "flex min-h-14 w-full flex-col items-center justify-center rounded-2xl px-4 font-display text-lg font-bold transition-colors",
          done ? "text-sage" : "bg-gradient-to-br from-sage to-teal-600 text-white shadow-soft",
        )}
      >
        <span className="flex items-center gap-2">
          <CheckCircle2 className="size-5" aria-hidden />
          {done ? doneLabel : label}
        </span>
        {done && <span className="font-sans text-xs font-normal text-muted">{undo}</span>}
      </button>
    </section>
  );
}
