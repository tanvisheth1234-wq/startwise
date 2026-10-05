// app/admin/page.tsx — team only (#25, #48): flagged items, what still needs verifying, success metrics.
import { count, desc, eq, sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui";
import { db } from "@/db/client";
import { flags, planTasks, plans, testResults } from "@/db/schema";
import { RULES, SCHEMES } from "@/knowledge/data";
import { isAdmin } from "@/lib/auth";
import { reviewFlag } from "@/features/admin/actions";

export default async function AdminPage() {
  if (!(await isAdmin())) notFound();
  const t = await getTranslations("admin");

  const [open, [planCount], [confirmed], [tasksDone], [tested]] = await Promise.all([
    db.select().from(flags).where(eq(flags.status, "open")).orderBy(desc(flags.createdAt)).limit(50),
    db.select({ n: count() }).from(plans),
    db.select({ n: count() }).from(plans).where(eq(plans.status, "confirmed")),
    db.select({ n: count() }).from(planTasks).where(eq(planTasks.status, "done")),
    db.select({ n: sql<number>`count(distinct ${testResults.planId})` }).from(testResults),
  ]);
  const toVerify = [...RULES.map((r) => ({ key: r.key, name: r.name, status: r.status, notes: r.verifyNotes })), ...SCHEMES.map((s) => ({ key: s.key, name: s.name, status: s.status, notes: null }))];

  const metrics = [
    { label: t("metrics.plans"), value: planCount.n },
    { label: t("metrics.confirmed"), value: confirmed.n },
    { label: t("metrics.tasksDone"), value: tasksDone.n },
    { label: t("metrics.tested"), value: Number(tested.n) },
  ];

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <h1 className="text-2xl font-extrabold text-forest">{t("title")}</h1>

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-3xl border border-line/70 bg-white p-3 text-center shadow-soft">
            <p className="font-display text-3xl font-extrabold text-coral-600">{m.value}</p>
            <p className="text-xs font-semibold text-muted">{m.label}</p>
          </div>
        ))}
      </section>

      <section className="space-y-2">
        <h2 className="font-display text-lg font-bold text-forest">{t("flags", { count: open.length })}</h2>
        {open.length === 0 && <p className="rounded-2xl bg-white p-4 text-muted">{t("noFlags")}</p>}
        <ul className="space-y-2">
          {open.map((f) => (
            <li key={f.id} className="flex flex-wrap items-center gap-2 rounded-2xl border border-line/70 bg-white p-3">
              <Badge tone="sun">{f.targetType}</Badge>
              <span className="flex-1 font-semibold text-forest">{f.targetKey}</span>
              <span className="text-xs text-muted">{f.createdAt.toISOString().slice(0, 10)}</span>
              <form action={reviewFlag.bind(null, f.id, "fixed")}>
                <button className="min-h-9 rounded-full bg-sage px-3 text-xs font-semibold text-white">{t("fixed")}</button>
              </form>
              <form action={reviewFlag.bind(null, f.id, "rejected")}>
                <button className="min-h-9 rounded-full border border-line px-3 text-xs font-semibold text-muted">{t("rejected")}</button>
              </form>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="font-display text-lg font-bold text-forest">{t("records")}</h2>
        <p className="text-sm text-muted">{t("recordsHint")}</p>
        <ul className="divide-y divide-line/60 rounded-2xl border border-line/70 bg-white">
          {toVerify.map((r) => (
            <li key={r.key} className="flex items-start gap-2 p-3 text-sm">
              <Badge tone={r.status === "verified" ? "green" : "sun"}>{r.status === "verified" ? t("verified") : t("checkLocally")}</Badge>
              <span className="flex-1">
                <span className="block font-semibold text-forest">{r.name}</span>
                {r.notes && <span className="block text-xs text-muted">{r.notes}</span>}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
