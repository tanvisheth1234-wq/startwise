// OWNER: T1 — one card per module from MODULES, each with a one-line live status.
// Every status loads on its own (Suspense) so a slow or failing module never blocks the others.
import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  Calculator, ChevronRight, FileDown, FlaskConical, HandCoins, ListChecks, MapPin, Scale, Users, type LucideIcon,
} from "lucide-react";
import { Skeleton } from "@/components/ui";
import type { Lang } from "@/contracts/profile";
import { MODULES, type ModuleIcon, type ModuleKey } from "@/features/registry";
import { complianceSummary, roadmapSummary } from "../lib/summaries";
import { getChecklist, getMoney, getRoadmap, getSchemes, getValidation, settle } from "../server/data";

const ICONS: Record<ModuleIcon, LucideIcon> = { FlaskConical, MapPin, Scale, Calculator, HandCoins, ListChecks, Users, FileDown };
const inr = (n: number) => n.toLocaleString("en-IN");

type Props = { planId: string; lang: Lang };

async function Status({ moduleKey, planId, lang }: Props & { moduleKey: ModuleKey }) {
  const t = await getTranslations("dashboard.cards");
  const fail = <span className="text-danger">{t("error")}</span>;

  switch (moduleKey) {
    case "validate": {
      const r = await settle(getValidation(planId));
      if (!r.ok) return fail;
      const v = r.value;
      if (v.verdict === "go") return <>{t("validate.go")}</>;
      if (v.verdict === "no_go") return <>{t("validate.noGo")}</>;
      if (v.sprintStarted) return <>{t("validate.running", { enquiries: v.enquiries, orders: v.orders })}</>;
      return <>{t("validate.notStarted")}</>;
    }
    case "compliance": {
      const r = await settle(getChecklist(planId, lang));
      if (!r.ok) return fail;
      return <>{t("compliance", complianceSummary(r.value))}</>;
    }
    case "money": {
      const r = await settle(getMoney(planId));
      if (!r.ok) return fail;
      if (!r.value) return <>{t("money.empty")}</>;
      if (r.value.breakEvenUnitsPerMonth == null) return <>{t("money.noPrice")}</>;
      return <>{t("money.breakEven", { units: inr(r.value.breakEvenUnitsPerMonth) })}</>;
    }
    case "funding": {
      const r = await settle(getSchemes(planId, lang));
      if (!r.ok) return fail;
      return <>{t("funding", { count: r.value.length })}</>;
    }
    case "roadmap": {
      const r = await settle(getRoadmap(planId, lang));
      if (!r.ok) return fail;
      return <>{t("roadmap", roadmapSummary(r.value))}</>;
    }
    default:
      return <>{t(`static.${moduleKey}`)}</>;
  }
}

function Card({ href, Icon, title, children }: { href: string; Icon: LucideIcon; title: string; children: ReactNode }) {
  return (
    <Link href={href} className="flex min-h-20 items-center gap-3 rounded-2xl border border-line bg-white p-4 shadow-sm hover:bg-mint-50">
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-mint text-teal">
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-forest">{title}</span>
        <span className="block text-sm text-muted">{children}</span>
      </span>
      <ChevronRight className="size-5 shrink-0 text-muted" aria-hidden />
    </Link>
  );
}

export async function ModuleCards({ planId, lang }: Props) {
  const t = await getTranslations("common");
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {MODULES.map((m) => (
        <li key={m.key}>
          <Card href={`/plan/${planId}/${m.route}`} Icon={ICONS[m.icon]} title={t(m.labelKey.replace(/^common\./, "") as "nav.validate")}>
            <Suspense fallback={<Skeleton className="mt-1 h-4 w-40" />}>
              <Status moduleKey={m.key} planId={planId} lang={lang} />
            </Suspense>
          </Card>
        </li>
      ))}
    </ul>
  );
}
