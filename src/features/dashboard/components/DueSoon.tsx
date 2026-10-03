// OWNER: T1 — #40 in-app reminders: open roadmap tasks due within 7 days. No new table.
import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { parseISO } from "date-fns";
import { CalendarClock } from "lucide-react";
import { cn } from "@/components/ui";
import type { Lang } from "@/contracts/profile";
import { dueSoon, isOverdue } from "../lib/summaries";
import { getRoadmap, settle } from "../server/data";

export async function DueSoonStrip({ planId, lang }: { planId: string; lang: Lang }) {
  const r = await settle(getRoadmap(planId, lang));
  if (!r.ok) return null;
  const today = new Date();
  const tasks = dueSoon(r.value, today).slice(0, 5);
  if (tasks.length === 0) return null;

  const t = await getTranslations("dashboard.dueSoon");
  const format = await getFormatter();
  return (
    <section className="space-y-2">
      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted">
        <CalendarClock className="size-4" aria-hidden />
        {t("title")}
      </h2>
      <ul className="flex gap-2 overflow-x-auto pb-1">
        {tasks.map((task) => {
          const overdue = isOverdue(task, today);
          return (
            <li key={task.id} className="shrink-0">
              <Link
                href={`/plan/${planId}/roadmap`}
                className={cn("block w-56 rounded-xl border bg-white p-3 text-sm", overdue ? "border-danger/40" : "border-line")}
              >
                <span className="line-clamp-2 font-medium text-ink">{task.title}</span>
                <span className={cn("mt-1 block text-xs font-semibold", overdue ? "text-danger" : "text-gold")}>
                  {overdue ? t("overdue") : t("due", { date: format.dateTime(parseISO(task.dueDate!), { day: "numeric", month: "short" }) })}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
