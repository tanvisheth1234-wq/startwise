// The plan home: a board-game journey path, "Today's 3 things", and friendly doors into each part.
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  BadgeIndianRupee, BookHeart, CheckCircle2, ClipboardList, Drama, FileDown, Calculator, FileText, FlaskConical, HandCoins, MapPinned, Megaphone,
  Rocket, Store, Users, type LucideIcon,
} from "lucide-react";
import { GrowingPlant, cn, type PlantBranch } from "@/components/ui";
import type { Lang } from "@/contracts/profile";
import type { RoadmapTask } from "@/contracts/roadmap";
import { taskHref } from "@/features/roadmap/api";
import { TaskItem } from "@/features/roadmap/components/TaskItem";
import { getMoney, getRoadmap, getValidation, settle } from "../server/data";
import { getSection } from "@/features/validate/server/sections";
import { requirePlan } from "@/lib/auth";
import { ShareCard } from "./ShareCard";
import { IdeaChips } from "./IdeaChips";
import { loadOrders } from "@/features/orders/actions";
import { loadMarketing } from "@/features/marketing/actions";
import type { Diary } from "@/features/first-customers/actions";

type Props = { planId: string; lang: Lang };

export type Station = { key: string; icon: LucideIcon; href: string; done: boolean };

function stations(planId: string, tasks: RoadmapTask[], go: boolean, priced: boolean): Station[] {
  const doneKey = (k: string) => tasks.some((t) => t.key === k && t.status === "done");
  const legal = tasks.filter((t) => t.category === "legal");
  const launch = tasks.filter((t) => t.phase === "launch");
  const base = `/plan/${planId}`;
  return [
    { key: "test", icon: FlaskConical, href: `${base}/validate`, done: go || doneKey("validate.test_sprint") },
    { key: "costs", icon: Calculator, href: `${base}/money`, done: doneKey("prepare.costs") || priced },
    { key: "papers", icon: FileText, href: `${base}/compliance`, done: legal.length > 0 && legal.every((t) => t.status === "done") },
    { key: "launch", icon: Rocket, href: `${base}/marketing`, done: doneKey("launch.marketing_plan") || (launch.length > 0 && launch.every((t) => t.status === "done")) },
    { key: "customer", icon: Store, href: `${base}/first-customers`, done: doneKey("pilot.first_orders") },
  ];
}

/** Where she is on the journey: shared by the plan home and the share card. */
export async function journeyStations(planId: string, lang: Lang): Promise<Station[]> {
  const [tasks, v, m] = await Promise.all([settle(getRoadmap(planId, lang)), settle(getValidation(planId)), settle(getMoney(planId))]);
  const list = tasks.ok ? tasks.value : [];
  const go = v.ok && v.value.verdict === "go";
  const priced = m.ok && m.value !== null && (m.value.marginPerUnit ?? 0) > 0 && list.some((x) => x.key === "prepare.costs" && x.status === "done");
  return stations(planId, list, go, priced);
}

export type GrowGoal = { key: "customers" | "repeat" | "posts" | "month" | "funding"; href: string; done: boolean };

/**
 * Season 2, after her first sale: five goals that keep her growing, each finished on its own page
 * (orders and the sales diary count customers, the marketing calendar counts posts, Money holds the
 * month check, Funding the loan pitch).
 */
export async function growGoals(planId: string, lang: Lang): Promise<GrowGoal[]> {
  const base = `/plan/${planId}`;
  const [book, diary, marketing, tasks, pitch] = await Promise.all([
    loadOrders(planId).catch(() => ({ orders: [] })),
    getSection<Diary>(planId, "diary", "en").catch(() => null),
    loadMarketing(planId).catch(() => null),
    settle(getRoadmap(planId, lang)),
    getSection(planId, "loan_pitch", lang).catch(() => null),
  ]);
  const sales = (diary?.content.entries ?? []).filter((e) => e.kind === "sale");
  const names = [...book.orders.map((o) => o.customer), ...sales.map((e) => e.customer ?? "")].map((n) => n.trim().toLowerCase()).filter(Boolean);
  const repeat = names.some((n, i) => names.indexOf(n) !== i);
  const monthDone = tasks.ok && tasks.value.some((x) => x.key === "improve.review_month" && x.status === "done");
  return [
    { key: "customers", href: `${base}/orders`, done: new Set(names).size >= 10 || book.orders.length + sales.length >= 10 },
    { key: "repeat", href: `${base}/orders`, done: repeat },
    { key: "posts", href: `${base}/marketing`, done: (marketing?.posted.length ?? 0) >= 4 },
    { key: "month", href: `${base}/money`, done: monthDone },
    { key: "funding", href: `${base}/funding`, done: Boolean(pitch) },
  ];
}

const routeOf = (href: string) => href.replace(/^\/plan\/[^/]+\/?/, "").split(/[/?#]/)[0];

/**
 * One decision for the whole home screen, so the orange bar, the plant and "Small things" agree:
 * the bar shows the next task of the step that is pulsing on her plant; small things are the
 * any-time jobs plus leftovers of steps she has already finished (e.g. packaging after Costs).
 */
export async function planFocus(planId: string, lang: Lang) {
  const [stations, r] = await Promise.all([journeyStations(planId, lang), settle(getRoadmap(planId, lang))]);
  const tasks = r.ok ? r.value : [];
  const open = tasks.filter((x) => x.status !== "done" && !x.locked);
  const currentIdx = stations.findIndex((s) => !s.done);
  const current = currentIdx >= 0 ? stations[currentIdx] : null;
  const pendingRoutes = new Set(stations.filter((s) => !s.done).map((s) => routeOf(s.href)));
  const next = current ? open.find((x) => routeOf(taskHref(x.key)) === routeOf(current.href)) ?? null : null;
  const small = tasks.filter((x) => x.id !== next?.id && !pendingRoutes.has(routeOf(taskHref(x.key))));
  return { stations, currentIdx, next, small, ok: r.ok };
}

export async function JourneyPath({ planId, lang }: Props) {
  const t = await getTranslations("dashboard.journey");
  const tg = await getTranslations("dashboard.grow");
  const ts = await getTranslations("dashboard.share");
  const tr = await getTranslations("profile");
  const [all, plan, founder] = await Promise.all([journeyStations(planId, lang), requirePlan(planId), getSection<{ name: string }>(planId, "founder", "en").catch(() => null)]);
  const p = plan.profile;
  const raw = p?.product || plan.title;
  const product = raw.charAt(0).toUpperCase() + raw.slice(1);
  const where = [p?.locality, p?.city].filter(Boolean).join(", ");
  const current = all.findIndex((s) => !s.done);
  // Her business as a plant: each step is a branch, the first sale is the flower.
  // Once the flower is out, Season 2 begins: the plant bears a fruit for each growth goal.
  const season2 = current === -1;
  const goals = season2 ? await growGoals(planId, lang) : [];
  const goalAt = goals.findIndex((g) => !g.done);
  const parts: PlantBranch[] = season2
    ? [
        ...goals.map((g, i) => ({ key: `grow-${g.key}`, label: tg(`goals.${g.key}`), href: g.href, state: (g.done ? "done" : i === goalAt ? "current" : "todo") as PlantBranch["state"] })),
        { key: "grow-bloom", label: tg("bloom"), state: (goalAt === -1 ? "done" : "todo") as PlantBranch["state"] },
      ]
    : all.map((s, i) => ({
        key: s.key,
        label: t(`stations.${s.key}`),
        href: s.href,
        state: s.done ? "done" : i === current ? "current" : "todo",
      }));

  return (
    <section className="rounded-3xl border border-line/70 bg-white/80 p-4 shadow-soft">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-lg font-bold text-forest">{season2 ? tg("title") : t("title")}</h2>
        <span className="text-xs font-semibold text-muted">
          {season2 ? t("progress", { done: goals.filter((g) => g.done).length, total: goals.length }) : t("progress", { done: all.filter((s) => s.done).length, total: all.length })}
        </span>
      </div>
      <GrowingPlant mode="progress" branches={parts.slice(0, -1)} bloom={parts[parts.length - 1]} rememberAs={`sw-${season2 ? "grow" : "plant"}-${planId}`} grewText={(season2 ? tg.raw("grew") : t.raw("grew")) as string} fruit={season2} className="mx-auto -mb-3 -mt-2 w-full max-w-[290px] lg:my-2 lg:max-w-[330px]" />
      <div className="mt-4">
        <ShareCard
          label={ts("button")}
          savedLabel={ts("saved")}
          fileName={product.replace(/[^\p{L}\p{N}]+/gu, "-").slice(0, 40) || "my-business"}
          data={{
            soon: ts("soon"),
            product,
            by: founder?.content.name ? ts("by", { name: founder.content.name }) : "",
            facts: [where && { label: tr("reveal.where"), value: where }, p?.premises && { label: tr("reveal.worksFrom"), value: tr(`premises.${p.premises}`) }].filter(Boolean) as { label: string; value: string }[],
            cta: ts("cta"),
            made: ts("made"),
            leaves: all.slice(0, -1).map((s) => s.done),
            bloom: Boolean(all[all.length - 1]?.done),
            text: ts("text", { product }),
          }}
        />
      </div>
    </section>
  );
}

/** Always something new to try: a few questions that open a conversation with StartWise. */
export async function IdeasCard() {
  const t = await getTranslations("dashboard.ideas");
  const all = t.raw("items") as string[];
  // A different few each day, so the home never feels stale.
  const day = Number(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", day: "numeric" }).format(new Date()));
  const picks = [0, 1, 2].map((k) => all[(day * 3 + k) % all.length]);
  return (
    <section className="space-y-2 rounded-3xl border border-line/70 bg-white/80 p-4 shadow-soft">
      <h2 className="font-display text-lg font-bold text-forest">{t("title")}</h2>
      <p className="text-sm text-muted">{t("sub")}</p>
      <IdeaChips ideas={picks} />
    </section>
  );
}

export async function TodayThree({ planId, lang }: Props) {
  const t = await getTranslations("dashboard.today");
  // Only the small, any-time jobs (see planFocus); the big steps live on the plant and in "Your next step".
  const f = await planFocus(planId, lang);
  if (!f.ok) return null;
  const small = f.small;
  const open = small.filter((x) => x.status !== "done" && !x.locked).slice(0, 2);
  if (small.length === 0) return null;

  return (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-lg font-bold text-forest">{t("title")}</h2>
        <Link href={`/plan/${planId}/roadmap`} className="text-sm font-semibold text-coral-600 hover:underline">
          {t("seeAll")}
        </Link>
      </div>
      {open.length === 0 ? (
        <p className="flex items-center gap-2 rounded-2xl bg-sage-light p-4 font-semibold text-sage">
          <CheckCircle2 className="size-5 shrink-0" aria-hidden />
          {t("smallDone")}
        </p>
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
      <ul className="stagger grid grid-cols-2 gap-2 sm:grid-cols-3">
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
