// app/plan/[planId]/roadmap/page.tsx — Tasks: the phased roadmap and tracker (#36, #37), with a 30/60/90 view.
import { getLocale, getTranslations } from "next-intl/server";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { Tabs, type TabItem } from "@/components/ui";
import type { Phase } from "@/contracts/common";
import { Lang } from "@/contracts/profile";
import { PHASE_ORDER } from "@/features/compliance/engine";
import { roadmap, taskHref } from "@/features/roadmap/api";
import { TaskItem, type TaskView } from "@/features/roadmap/components/TaskItem";
import { requirePlan } from "@/lib/auth";

export default async function RoadmapPage({ params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params;
  const plan = await requirePlan(planId);
  const parsed = Lang.safeParse(await getLocale());
  const lang = parsed.success ? parsed.data : plan.language;
  const t = await getTranslations("roadmap");
  const tasks: TaskView[] = (await roadmap.getRoadmap(planId, lang)).map((x) => ({ ...x, href: taskHref(x.key) }));
  const done = tasks.filter((x) => x.status === "done").length;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

  const byPhase = PHASE_ORDER.map((p) => ({ phase: p, list: tasks.filter((x) => x.phase === p) })).filter((g) => g.list.length);
  const today = new Date();
  const bucket = (x: TaskView) => {
    const d = x.dueDate ? differenceInCalendarDays(parseISO(x.dueDate), today) : 0;
    return d <= 30 ? "d30" : d <= 60 ? "d60" : "d90";
  };

  const list = (items: TaskView[]) => (
    <ul className="space-y-2">
      {items.map((task) => (
        <TaskItem key={task.id} planId={planId} task={task} />
      ))}
    </ul>
  );

  const tabs: TabItem[] = [
    {
      key: "phases",
      label: t("byStage"),
      content: (
        <div className="space-y-5">
          {byPhase.map(({ phase, list: items }) => (
            <section key={phase} className="space-y-2">
              <h2 className="flex items-baseline justify-between font-display text-lg font-bold text-forest">
                {t(`phase.${phase as Phase}`)}
                <span className="text-xs font-semibold text-muted">
                  {items.filter((x) => x.status === "done").length}/{items.length}
                </span>
              </h2>
              {list(items)}
            </section>
          ))}
        </div>
      ),
    },
    ...(["d30", "d60", "d90"] as const).map((k) => ({
      key: k,
      label: t(`days.${k}`),
      content: tasks.filter((x) => bucket(x) === k).length ? list(tasks.filter((x) => bucket(x) === k)) : <p className="p-4 text-center text-muted">{t("nothingHere")}</p>,
    })),
  ];

  return (
    <div className="space-y-5">
      <header className="space-y-3">
        <h1 className="text-2xl font-extrabold text-forest">{t("title")}</h1>
        <div className="rounded-3xl border border-line/70 bg-white p-4 shadow-soft">
          <div className="flex items-baseline justify-between">
            <p className="font-semibold text-forest">{t("progress", { done, total: tasks.length })}</p>
            <p className="font-display text-2xl font-extrabold text-coral-600">{pct}%</p>
          </div>
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-mint">
            <div className="h-full rounded-full bg-gradient-to-r from-sun to-coral transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </header>
      <Tabs items={tabs} />
    </div>
  );
}
