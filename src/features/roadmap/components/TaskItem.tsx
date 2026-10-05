"use client";
// A task row: tick it off (with a small celebration), open where it's done, add a note or mark blocked.
import { useState, useTransition } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Check, ChevronRight, Lock, MessageSquareText, OctagonAlert } from "lucide-react";
import { Celebrate, cn } from "@/components/ui";
import type { RoadmapTask } from "@/contracts/roadmap";
import { saveTaskNote, setTaskStatus } from "../actions";

export type TaskView = RoadmapTask & { href: string };

export function TaskItem({ planId, task, compact = false }: { planId: string; task: TaskView; compact?: boolean }) {
  const t = useTranslations("roadmap.task");
  const locale = useLocale();
  const [done, setDone] = useState(task.status === "done");
  const [blocked, setBlocked] = useState(task.status === "blocked");
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState(task.notes ?? "");
  const [evidence, setEvidence] = useState(task.evidenceUrl ?? "");
  const [fire, setFire] = useState(0);
  const [pending, start] = useTransition();

  const toggle = () => {
    if (task.locked) return;
    const next = !done;
    setDone(next);
    if (next) setFire((n) => n + 1);
    start(() => setTaskStatus(planId, task.id, next ? "done" : "pending"));
  };

  const toggleBlocked = () => {
    const next = !blocked;
    setBlocked(next);
    start(() => setTaskStatus(planId, task.id, next ? "blocked" : "pending"));
  };

  return (
    <li
      className={cn(
        "rounded-2xl border bg-white shadow-soft transition-colors",
        done ? "border-sage/30 bg-sage-light/40" : blocked ? "border-danger/30" : "border-line/70",
        task.locked && "opacity-60",
      )}
    >
      <Celebrate fire={fire} message={t("yay")} />
      <div className="flex items-center gap-3 p-3">
        <button
          type="button"
          role="checkbox"
          aria-checked={done}
          aria-label={done ? t("markUndone", { title: task.title }) : t("markDone", { title: task.title })}
          onClick={toggle}
          disabled={task.locked || pending}
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-full border-2 transition-all",
            done ? "animate-pop border-sage bg-sage text-white" : "border-line bg-white hover:border-coral",
          )}
        >
          {task.locked ? <Lock className="size-4 text-muted" aria-hidden /> : done && <Check className="size-5" aria-hidden />}
        </button>
        <Link href={`/plan/${planId}/${task.href}`.replace(/\/$/, "")} className="min-w-0 flex-1">
          <span className={cn("block font-semibold leading-snug", done ? "text-muted line-through" : "text-forest")}>{task.title}</span>
          {!compact && (
            <span className="block text-xs text-muted">
              {task.locked ? t("locked") : blocked ? t("blocked") : task.dueDate ? t("due", { date: new Intl.DateTimeFormat(`${locale}-IN`, { day: "numeric", month: "short" }).format(new Date(`${task.dueDate}T12:00:00`)) }) : null}
            </span>
          )}
        </Link>
        {compact ? (
          <Link href={`/plan/${planId}/${task.href}`.replace(/\/$/, "")} aria-label={t("open")} className="grid size-9 place-items-center rounded-full text-muted hover:bg-mint">
            <ChevronRight className="size-5" aria-hidden />
          </Link>
        ) : (
          <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={t("notes")} className="grid size-9 place-items-center rounded-full text-muted hover:bg-mint">
            <MessageSquareText className="size-5" aria-hidden />
          </button>
        )}
      </div>

      {open && !compact && (
        <div className="space-y-2 border-t border-line/60 p-3">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            maxLength={1000}
            placeholder={t("notesPlaceholder")}
            className="w-full resize-none rounded-2xl border-2 border-line p-2 text-sm focus:border-coral/60 focus:outline-none"
          />
          <input
            value={evidence}
            onChange={(e) => setEvidence(e.target.value)}
            placeholder={t("evidencePlaceholder")}
            inputMode="url"
            className="min-h-10 w-full rounded-full border-2 border-line px-3 text-sm focus:border-coral/60 focus:outline-none"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => start(() => saveTaskNote(planId, task.id, notes, evidence))}
              className="min-h-10 rounded-full bg-forest px-4 text-sm font-semibold text-white"
            >
              {t("saveNote")}
            </button>
            <button
              type="button"
              onClick={toggleBlocked}
              className={cn("flex min-h-10 items-center gap-1.5 rounded-full border-2 px-4 text-sm font-semibold", blocked ? "border-danger bg-danger/10 text-danger" : "border-line text-muted")}
            >
              <OctagonAlert className="size-4" aria-hidden />
              {blocked ? t("unblock") : t("markBlocked")}
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
