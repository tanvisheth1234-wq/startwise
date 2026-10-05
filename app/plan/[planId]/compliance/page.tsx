// app/plan/[planId]/compliance/page.tsx — "What papers do I need?" (#17–#21, #24)
import { getLocale, getTranslations } from "next-intl/server";
import { ShieldCheck } from "lucide-react";
import { GuidanceFooter } from "@/components/ui";
import { Lang } from "@/contracts/profile";
import { compliance } from "@/features/compliance/api";
import { LicenceCard } from "@/features/compliance/components/LicenceCard";
import { roadmap } from "@/features/roadmap/api";
import { RULES } from "@/knowledge/data";
import { requirePlan } from "@/lib/auth";

export default async function CompliancePage({ params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params;
  const plan = await requirePlan(planId);
  const parsed = Lang.safeParse(await getLocale());
  const lang = parsed.success ? parsed.data : plan.language;
  const t = await getTranslations("compliance");
  const [items, tasks] = await Promise.all([compliance.getChecklist(planId, lang), roadmap.getRoadmap(planId, lang).catch(() => [])]);
  // Each needed licence is also a task on her plan; ticking it here grows the Papers leaf.
  const taskFor = (ruleKey: string) => {
    const task = tasks.find((x) => x.key === `rule:${ruleKey}`);
    return task ? { id: task.id, done: task.status === "done" } : undefined;
  };
  const shown = new Set(items.map((i) => i.ruleKey));
  // "Do I need it?": the big ones we checked and left out, so the founder sees why.
  const type = plan.profile?.businessType ?? "other";
  const notNeeded = RULES.filter((r) =>
    !shown.has(r.key) &&
    ["gst_registration", "fssai_state_licence", "mh_shop_establishment"].includes(r.key) &&
    (r.appliesTo.businessTypes.includes("*") || r.appliesTo.businessTypes.includes(type)));

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-extrabold text-forest">{t("title")}</h1>
        <p className="text-muted">{t("subtitle", { count: items.length })}</p>
      </header>

      <ol className="stagger space-y-3">
        {items.map((item, i) => (
          <LicenceCard key={item.ruleKey} planId={planId} item={item} index={i} task={taskFor(item.ruleKey)} />
        ))}
      </ol>

      {notNeeded.length > 0 && (
        <section className="rounded-3xl border-2 border-dashed border-sage/40 bg-sage-light/50 p-4">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold text-sage">
            <ShieldCheck className="size-5" aria-hidden />
            {t("notNeededTitle")}
          </h2>
          <ul className="mt-2 space-y-2">
            {notNeeded.map((r) => (
              <li key={r.key} className="text-sm">
                <span className="font-semibold text-forest">{r.plainName[lang]}</span>
                <span className="text-muted"> · {r.whyNeeded[lang]}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <GuidanceFooter />
    </div>
  );
}
