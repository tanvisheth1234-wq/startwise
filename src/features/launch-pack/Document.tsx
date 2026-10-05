// src/features/launch-pack/Document.tsx — the Launch Pack (#41): the whole plan as one document,
// shared by the on-screen preview and the A4 print page (Save as PDF). Same data, same order.
import { getTranslations } from "next-intl/server";
import type { Lang } from "@/contracts/profile";
import type { Assumptions, RiskSnapshot, TestPlan } from "@/contracts/sections";
import { compliance } from "@/features/compliance/api";
import { PHASE_ORDER } from "@/features/compliance/engine";
import { funding } from "@/features/funding/api";
import { money } from "@/features/money/api";
import { loadCostLines } from "@/features/money/server/store";
import { roadmap } from "@/features/roadmap/api";
import { getSection } from "@/features/validate/server/sections";
import { sprintState } from "@/features/validate/server/results";
import type { Plan } from "@/lib/auth";
import { SOURCES } from "@/knowledge/data";

const inr = (n: number | null | undefined) => (n == null ? "—" : "₹" + Math.round(n).toLocaleString("en-IN"));

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="lp-section space-y-3 break-inside-avoid-page">
      <h2 className="flex items-center gap-3 border-b-2 border-coral/30 pb-2 font-display text-xl font-extrabold text-forest">
        <span className="grid size-8 place-items-center rounded-full bg-coral text-sm text-white">{n}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

export async function LaunchPackDocument({ plan, lang }: { plan: Plan; lang: Lang }) {
  const t = await getTranslations({ locale: lang, namespace: "launchPack" });
  const tp = await getTranslations({ locale: lang, namespace: "profile" });
  const tr = await getTranslations({ locale: lang, namespace: "roadmap" });
  const p = plan.profile;
  const [checklist, summary, lines, schemes, tasks, assumptions, risk, testPlan, sprint] = await Promise.all([
    compliance.getChecklist(plan.id, lang),
    money.getMoneySummary(plan.id).catch(() => null),
    loadCostLines(plan.id),
    funding.matchSchemes(plan.id, lang),
    roadmap.getRoadmap(plan.id, lang),
    getSection<Assumptions>(plan.id, "assumptions", lang),
    getSection<RiskSnapshot>(plan.id, "risk", lang),
    getSection<TestPlan>(plan.id, "test_plan", lang),
    sprintState(plan.id, plan.language), // the test runs in the plan's own language
  ]);
  const date = new Intl.DateTimeFormat(lang === "en" ? "en-IN" : `${lang}-IN`, { dateStyle: "long", timeZone: "Asia/Kolkata" }).format(new Date());
  const usedSources = SOURCES.filter((s) => checklist.some((c) => c.source?.key === s.key) || schemes.some((m) => m.source?.key === s.key));
  let n = 0;

  return (
    <article className="launch-pack space-y-8 text-ink">
      {/* 1 Cover */}
      <header className="lp-cover rounded-[2rem] bg-gradient-to-br from-sun via-coral to-berry p-8 text-white">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-white/85">StartWise · {t("cover.kicker")}</p>
        <h1 className="mt-3 text-4xl font-extrabold leading-tight first-letter:uppercase">{p?.product || plan.title}</h1>
        <p className="mt-2 text-lg text-white/90">{[p?.locality, p?.city].filter(Boolean).join(", ")}</p>
        <p className="mt-6 text-sm text-white/85">{t("cover.made", { date })}</p>
      </header>

      {/* 2 Profile */}
      {p && (
        <Section n={++n} title={t("sections.profile")}>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {([
              [tp("fields.businessType"), tp(`types.${p.businessType as "home_food"}`)],
              [tp("fields.product"), p.product],
              [tp("fields.city"), [p.locality, p.city].filter(Boolean).join(", ")],
              [tp("fields.premises"), p.premises ? tp(`premises.${p.premises}`) : "—"],
              [tp("fields.targetCustomer"), p.targetCustomer ?? "—"],
              [tp("fields.budgetInr"), inr(p.budgetInr)],
            ] as const).map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs font-semibold text-muted">{k}</dt>
                <dd className="font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
        </Section>
      )}

      {/* 3 Feasibility */}
      <Section n={++n} title={t("sections.feasibility")}>
        <p className="rounded-2xl bg-mint p-3 text-sm font-semibold">
          {sprint.verdict.verdict === "go"
            ? t("test.go", { orders: sprint.totals.orders, enquiries: sprint.totals.enquiries })
            : sprint.startDate
              ? t("test.running", { orders: sprint.totals.orders, enquiries: sprint.totals.enquiries })
              : t("test.notStarted")}
        </p>
        {assumptions && (
          <ul className="list-inside list-disc space-y-1 text-sm">
            {assumptions.content.items.slice(0, 6).map((a) => <li key={a.text}>{a.text}</li>)}
          </ul>
        )}
        {risk && risk.content.risks.length > 0 && (
          <div className="space-y-1 text-sm">
            <p className="font-bold">{t("risks")}</p>
            <ul className="list-inside list-disc space-y-1">
              {risk.content.risks.slice(0, 5).map((r) => <li key={r.text}>{r.text}</li>)}
            </ul>
          </div>
        )}
        {testPlan && (
          <ol className="grid grid-cols-1 gap-1 text-sm">
            {testPlan.content.days.map((d) => (
              <li key={d.day}><span className="font-bold">{t("day", { n: d.day })}:</span> {d.action}</li>
            ))}
          </ol>
        )}
      </Section>

      {/* 4 Licences */}
      <Section n={++n} title={t("sections.licences")}>
        <ul className="space-y-3">
          {checklist.map((c) => (
            <li key={c.ruleKey} className="rounded-2xl border border-line p-3 text-sm">
              <p className="font-bold">☐ {c.name} <span className="font-normal text-muted">· {c.authority}</span></p>
              <p>{c.whyNeeded}</p>
              <p className="text-muted">{[c.costText, c.timeText].filter(Boolean).join(" · ")}</p>
              {c.documents.length > 0 && <p className="text-muted">{t("papers")}: {c.documents.join(", ")}</p>}
              <p className="break-all text-xs">
                {c.officialUrl} · {c.status === "verified" ? t("verified", { date: c.lastVerified ?? "" }) : t("checkLocally")}
              </p>
            </li>
          ))}
        </ul>
      </Section>

      {/* 5 Money */}
      {summary && (
        <Section n={++n} title={t("sections.money")}>
          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <div className="rounded-2xl bg-mint p-2"><p className="text-xs text-muted">{t("money.startup")}</p><p className="font-display text-lg font-extrabold">{inr(summary.startupTotal)}</p></div>
            <div className="rounded-2xl bg-mint p-2"><p className="text-xs text-muted">{t("money.monthly")}</p><p className="font-display text-lg font-extrabold">{inr(summary.monthlyFixed)}</p></div>
            <div className="rounded-2xl bg-mint p-2"><p className="text-xs text-muted">{t("money.breakEven")}</p><p className="font-display text-lg font-extrabold">{summary.breakEvenUnitsPerMonth ?? "—"}</p></div>
          </div>
          <p className="text-sm">{t("money.line", { price: inr(summary.price), cost: inr(summary.unitCost), margin: inr(summary.marginPerUnit) })}</p>
          <table className="w-full text-sm">
            <tbody>
              {lines.map((l) => (
                <tr key={l.id} className="border-b border-line/60">
                  <td className="py-1">{l.label}</td>
                  <td className="py-1 text-muted">{t(`money.kind.${l.kind}`)}</td>
                  <td className="py-1 text-right font-semibold">{inr(l.amountInr)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-muted">{t("money.estimate")}</p>
        </Section>
      )}

      {/* 6 Funding */}
      {schemes.length > 0 && (
        <Section n={++n} title={t("sections.funding")}>
          <ul className="space-y-2 text-sm">
            {schemes.map((s) => (
              <li key={s.schemeKey}>
                <p className="font-bold">{s.name}{s.womenFocused ? " ♀" : ""}</p>
                <p>{s.benefit}. {s.whyMatched}</p>
                <p className="break-all text-xs text-muted">{s.officialUrl}</p>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* 7 Roadmap + task sheet */}
      <Section n={++n} title={t("sections.roadmap")}>
        {PHASE_ORDER.map((phase) => {
          const list = tasks.filter((x) => x.phase === phase);
          if (!list.length) return null;
          return (
            <div key={phase} className="break-inside-avoid">
              <p className="font-bold text-forest">{tr(`phase.${phase}`)}</p>
              <ul className="mb-2 space-y-0.5 text-sm">
                {list.map((x) => (
                  <li key={x.id}>{x.status === "done" ? "☑" : "☐"} {x.title}{x.dueDate ? <span className="text-muted"> · {x.dueDate}</span> : null}</li>
                ))}
              </ul>
            </div>
          );
        })}
      </Section>

      {/* 8 Plan starter: built from the founder's own data, no AI guessing */}
      {p && (
        <Section n={++n} title={t("sections.starter")}>
          <dl className="space-y-2 text-sm">
            <div><dt className="font-bold">{t("starter.offer")}</dt><dd>{t("starter.offerText", { product: p.product, area: [p.locality, p.city].filter(Boolean).join(", "), where: p.premises ? tp(`premises.${p.premises}`).toLowerCase() : "" })}</dd></div>
            <div><dt className="font-bold">{t("starter.customer")}</dt><dd>{p.targetCustomer ?? t("starter.customerDefault")}</dd></div>
            <div><dt className="font-bold">{t("starter.price")}</dt><dd>{summary ? t("starter.priceText", { price: inr(summary.price), units: summary.breakEvenUnitsPerMonth ?? "—" }) : "—"}</dd></div>
            <div><dt className="font-bold">{t("starter.channels")}</dt><dd>{t("starter.channelsText")}</dd></div>
          </dl>
        </Section>
      )}

      {/* 9 Sources + disclaimer */}
      <Section n={++n} title={t("sections.sources")}>
        <ul className="space-y-1 text-xs">
          {usedSources.map((s) => (
            <li key={s.key}><span className="font-semibold">{s.title}</span> · {s.publisher} · <span className="break-all">{s.url}</span></li>
          ))}
        </ul>
        <p className="rounded-2xl bg-sun-light p-3 text-sm">{t("disclaimer")}</p>
      </Section>
    </article>
  );
}
