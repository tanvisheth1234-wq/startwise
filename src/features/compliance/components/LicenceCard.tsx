"use client";
// One licence: plain name first, why it applies, cost and time, papers to keep ready, the official
// link and its verified status. "Explain simply" opens the reviewed explanation (no AI guessing).
import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { Lang } from "@/contracts/profile";
import { ReadAloud } from "@/features/intake/ui";
import { CalendarClock, Check, CheckCircle2, ChevronDown, ExternalLink, FileCheck2, Flag, IndianRupee, Lightbulb } from "lucide-react";
import { Badge, Celebrate, cn } from "@/components/ui";
import { setTaskStatus } from "@/features/roadmap/actions";
import type { ChecklistItem } from "@/contracts/compliance";
import { flagOutdated } from "../actions";

/** Not legally required, but worth doing (e.g. Udyam opens MSME loans and schemes). */
const OPTIONAL = new Set(["udyam_registration"]);

export function LicenceCard({ planId, item, index, task }: { planId: string; item: ChecklistItem; index: number; task?: { id: string; done: boolean } }) {
  const t = useTranslations("compliance");
  const lang = useLocale() as Lang;
  const [open, setOpen] = useState(index === 0);
  const [have, setHave] = useState<Set<number>>(new Set());
  const [flagged, setFlagged] = useState(false);
  const [, start] = useTransition();
  const verified = item.status === "verified";
  const [got, setGot] = useState(Boolean(task?.done));
  const [cheer, setCheer] = useState(0);
  const toggleGot = () => {
    if (!task) return;
    const next = !got;
    setGot(next);
    if (next) setCheer((n) => n + 1);
    start(() => setTaskStatus(planId, task.id, next ? "done" : "pending"));
  };

  return (
    <li className={cn("overflow-hidden rounded-3xl border bg-white shadow-soft", got ? "border-sage/50" : "border-line/70")}>
      <Celebrate fire={cheer} message={t("gotItCheer", { name: item.name })} />
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-start gap-3 p-4 text-left">
        <span className={cn("grid size-10 shrink-0 place-items-center rounded-2xl font-display text-lg font-extrabold", got ? "bg-sage text-white" : "bg-sky-light text-sky")}>
          {got ? <Check className="size-5" aria-hidden /> : index + 1}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-lg font-bold leading-snug text-forest">{item.name}</span>
          <span className="mt-1 flex flex-wrap gap-1.5">
            {item.authority.split(" · ")[0] !== item.name && <Badge tone="grey">{item.authority.split(" · ")[0]}</Badge>}
            {item.applies === "maybe" ? <Badge tone="sun">{t("maybe")}</Badge> : OPTIONAL.has(item.ruleKey) ? <Badge tone="sky">{t("recommended")}</Badge> : <Badge tone="green">{t("needed")}</Badge>}
          </span>
        </span>
        <ChevronDown className={cn("mt-2 size-5 shrink-0 text-muted transition-transform", open && "rotate-180")} aria-hidden />
      </button>

      {open && (
        <div className="space-y-4 px-4 pb-4">
          <p className="text-ink">{item.whyNeeded}</p>
          <p className="rounded-2xl bg-mint/70 p-3 text-sm text-forest-700">{item.reason}</p>

          <div className="grid grid-cols-2 gap-2">
            <Fact icon={IndianRupee} label={t("cost")} value={item.costText ?? t("checkPortal")} />
            <Fact icon={CalendarClock} label={t("time")} value={item.timeText ?? t("checkPortal")} />
          </div>

          <details className="group rounded-2xl bg-sun-light/60 p-3">
            <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold text-forest">
              <Lightbulb className="size-4 text-[#b07800]" aria-hidden />
              {t("explain")}
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-ink">{item.explanation}</p>
            <ReadAloud text={`${item.name}. ${item.whyNeeded} ${item.explanation}`} lang={lang} className="mt-2" />
          </details>

          {item.documents.length > 0 && (
            <div className="space-y-2">
              <p className="flex items-center gap-2 text-sm font-bold text-forest">
                <FileCheck2 className="size-4 text-coral" aria-hidden />
                {t("documents", { have: have.size, total: item.documents.length })}
              </p>
              <ul className="space-y-1.5">
                {item.documents.map((d, i) => {
                  const on = have.has(i);
                  return (
                    <li key={d}>
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={on}
                        onClick={() => setHave((s) => { const n = new Set(s); if (on) n.delete(i); else n.add(i); return n; })}
                        className="flex min-h-11 w-full items-center gap-3 rounded-2xl border border-line/70 px-3 text-left text-sm"
                      >
                        <span className={cn("grid size-6 shrink-0 place-items-center rounded-full border-2", on ? "border-sage bg-sage text-white" : "border-line")}>
                          {on && <Check className="size-4" aria-hidden />}
                        </span>
                        <span className={on ? "text-muted line-through" : "text-ink"}>{d}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <a
            href={item.officialUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-forest px-4 font-semibold text-white hover:bg-forest-700"
          >
            {t("openOfficial")}
            <ExternalLink className="size-4" aria-hidden />
          </a>

          {task && (
            <button
              type="button"
              onClick={toggleGot}
              aria-pressed={got}
              className={cn(
                "flex min-h-12 w-full flex-col items-center justify-center rounded-2xl border-2 px-4 font-semibold transition-colors",
                got ? "border-sage bg-sage-light text-sage" : "border-sage/40 bg-white text-sage hover:bg-sage-light",
              )}
            >
              <span className="flex items-center gap-2">
                <CheckCircle2 className="size-5" aria-hidden />
                {got ? t("gotItDone") : t("gotIt")}
              </span>
              {got && <span className="text-xs font-normal text-muted">{t("gotItUndo")}</span>}
            </button>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
            <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold", verified ? "bg-sage-light text-sage" : "bg-sun-light text-[#8a5a00]")}>
              {verified ? t("verifiedOn", { date: item.lastVerified ? new Intl.DateTimeFormat(`${lang}-IN`, { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${item.lastVerified}T12:00:00`)) : "" }) : t("checkLocally")}
            </span>
            {item.source && (
              <a href={item.source.url} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">
                {t("source")}: {item.source.title}
              </a>
            )}
          </div>
          <button
            type="button"
            disabled={flagged}
            onClick={() => {
              setFlagged(true);
              start(() => flagOutdated(planId, "rule", item.ruleKey));
            }}
            className="flex min-h-10 items-center gap-1.5 text-xs font-semibold text-muted hover:text-danger disabled:text-sage"
          >
            <Flag className="size-3.5" aria-hidden />
            {flagged ? t("flagged") : t("flag")}
          </button>
        </div>
      )}
    </li>
  );
}

function Fact({ icon: Icon, label, value }: { icon: typeof IndianRupee; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line/70 p-3">
      <p className="flex items-center gap-1 text-xs font-semibold text-muted">
        <Icon className="size-3.5" aria-hidden />
        {label}
      </p>
      <p className="font-semibold text-forest">{value}</p>
    </div>
  );
}
