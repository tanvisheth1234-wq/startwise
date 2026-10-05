// The plan home: a board-game journey path, "Today's 3 things", and friendly doors into each part.
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  BadgeIndianRupee, BookHeart, ClipboardList, Drama, FileDown, Calculator, FileText, Flag, FlaskConical, HandCoins, MapPinned, Megaphone, PartyPopper,
  Rocket, Store, Users, type LucideIcon,
} from "lucide-react";
import { cn } from "@/components/ui";
import type { Lang } from "@/contracts/profile";
import type { RoadmapTask } from "@/contracts/roadmap";
import { taskHref } from "@/features/roadmap/api";
import { TaskItem } from "@/features/roadmap/components/TaskItem";
import { getMoney, getRoadmap, getValidation, settle } from "../server/data";

type Props = { planId: string; lang: Lang };

type Station = { key: string; icon: LucideIcon; href: string; done: boolean };

function stations(planId: string, tasks: RoadmapTask[], go: boolean, priced: boolean): Station[] {
  const doneKey = (k: string) => tasks.some((t) => t.key === k && t.status === "done");
  const legal = tasks.filter((t) => t.category === "legal");
  const launch = tasks.filter((t) => t.phase === "launch");
  const base = `/plan/${planId}`;
  return [
    { key: "test", icon: FlaskConical, href: `${base}/validate`, done: go || doneKey("validate.test_sprint") },
    { key: "costs", icon: Calculator, href: `${base}/money`, done: doneKey("prepare.costs") || priced },
    { key: "papers", icon: FileText, href: `${base}/compliance`, done: legal.length > 0 && legal.every((t) => t.status === "done") },
    { key: "launch", icon: Rocket, href: `${base}/marketing`, done: launch.length > 0 && launch.every((t) => t.status === "done") },
    { key: "customer", icon: Store, href: `${base}/first-customers`, done: doneKey("pilot.first_orders") },
  ];
}

export async function JourneyPath({ planId, lang }: Props) {
  const t = await getTranslations("dashboard.journey");
  const [tasks, v, m] = await Promise.all([settle(getRoadmap(planId, lang)), settle(getValidation(planId)), settle(getMoney(planId))]);
  const list = tasks.ok ? tasks.value : [];
  const go = v.ok && v.value.verdict === "go";
  const priced = m.ok && m.value !== null && (m.value.marginPerUnit ?? 0) > 0 && list.some((x) => x.key === "prepare.costs" && x.status === "done");
  const all = stations(planId, list, go, priced);
  const current = all.findIndex((s) => !s.done);

  return (
    <section className="rounded-3xl border border-line/70 bg-white/80 p-4 shadow-soft">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="font-display text-lg font-bold text-forest">{t("title")}</h2>
        <span className="text-xs font-semibold text-muted">{t("progress", { done: all.filter((s) => s.done).length, total: all.length })}</span>
      </div>
      <ol className="relative flex items-start justify-between">
        <span className="absolute left-6 right-6 top-6 border-t-[3px] border-dashed border-line" aria-hidden />
        {all.map((s, i) => {
          const Icon = s.done ? PartyPopper : i === all.length - 1 ? Flag : s.icon;
          const isCurrent = i === current;
          return (
            <li key={s.key} className="relative z-10 flex w-16 flex-col items-center gap-1 text-center">
              <Link
                href={s.href}
                aria-current={isCurrent ? "step" : undefined}
                className={cn(
                  "grid size-12 place-items-center rounded-full border-[3px] transition-transform hover:scale-105",
                  s.done ? "border-sage bg-sage text-white" : isCurrent ? "animate-breathe border-coral bg-gradient-to-br from-sun to-coral text-white" : "border-line bg-white text-muted",
                )}
              >
                <Icon className="size-5" aria-hidden />
              </Link>
              <span className={cn("text-[11px] font-bold leading-tight", isCurrent ? "text-coral-600" : s.done ? "text-sage" : "text-muted")}>
                {t(`stations.${s.key}`)}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export async function TodayThree({ planId, lang }: Props) {
  const t = await getTranslations("dashboard.today");
  const r = await settle(getRoadmap(planId, lang));
  if (!r.ok) return null;
  // The first open task is already the big "next step" box above, so Today's 3 are the ones after it.
  const all = r.value.filter((x) => x.status !== "done" && !x.locked);
  const open = (all.length > 1 ? all.slice(1) : all).slice(0, 3);
  const doneCount = r.value.filter((x) => x.status === "done").length;

  return (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-lg font-bold text-forest">{t("title")}</h2>
        <Link href={`/plan/${planId}/roadmap`} className="text-sm font-semibold text-coral-600 hover:underline">
          {t("all", { done: doneCount, total: r.value.length })}
        </Link>
      </div>
      {open.length === 0 ? (
        <p className="rounded-2xl bg-sage-light p-4 font-semibold text-sage">{t("allDone")}</p>
      ) : (
        <ul className="stagger space-y-2">
          {open.map((task) => (
            <TaskItem key={task.id} planId={planId} task={{ ...task, href: taskHref(task.key) }} compact />
          ))}
        </ul>
      )}
    </section>
  );
}

const DOORS: { key: string; route: string; icon: LucideIcon; tone: string }[] = [
  { key: "validate", route: "validate", icon: FlaskConical, tone: "bg-berry-light text-berry" },
  { key: "money", route: "money", icon: BadgeIndianRupee, tone: "bg-sun-light text-[#a86b00]" },
  { key: "compliance", route: "compliance", icon: FileText, tone: "bg-sky-light text-sky" },
  { key: "funding", route: "funding", icon: HandCoins, tone: "bg-sage-light text-sage" },
  { key: "customers", route: "first-customers", icon: Users, tone: "bg-mint text-coral-600" },
  { key: "orders", route: "orders", icon: ClipboardList, tone: "bg-berry-light text-berry" },
  { key: "marketing", route: "marketing", icon: Megaphone, tone: "bg-berry-light text-berry" },
  { key: "notebook", route: "notebook", icon: BookHeart, tone: "bg-sun-light text-[#a86b00]" },
  { key: "market", route: "market", icon: MapPinned, tone: "bg-sky-light text-sky" },
  { key: "practice", route: "practice", icon: Drama, tone: "bg-sage-light text-sage" },
  { key: "launchPack", route: "launch-pack", icon: FileDown, tone: "bg-sky-light text-sky" },
];

export async function ExploreDoors({ planId }: { planId: string }) {
  const t = await getTranslations("dashboard.doors");
  return (
    <section className="space-y-2">
      <h2 className="font-display text-lg font-bold text-forest">{t("title")}</h2>
      <ul className="stagger grid grid-cols-2 gap-2">
        {DOORS.map(({ key, route, icon: Icon, tone }) => (
          <li key={key}>
            <Link
              href={`/plan/${planId}/${route}`}
              className="flex h-full min-h-28 flex-col justify-between gap-2 rounded-3xl border border-line/70 bg-white p-3 shadow-soft transition-transform hover:-translate-y-0.5"
            >
              <span className={cn("grid size-10 place-items-center rounded-2xl", tone)}>
                <Icon className="size-5" aria-hidden />
              </span>
              <span>
                <span className="block font-display font-bold leading-tight text-forest">{t(`${key}.title`)}</span>
                <span className="block text-xs text-muted">{t(`${key}.sub`)}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
