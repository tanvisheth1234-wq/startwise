"use client";
// OWNER: T1 — #10 feasibility & risk snapshot, risks grouped by area with the evidence needed
import { useTranslations } from "next-intl";
import { Plus, Trash2 } from "lucide-react";
import { Button, cn } from "@/components/ui";
import type { RiskSnapshot } from "@/contracts/sections";
import type { Section } from "../server/sections";
import { useDraftSection } from "../hooks/useDraftSection";
import { fieldClass, growClass, SectionShell } from "./SectionShell";

const AREAS = ["market", "money", "operations", "execution"] as const;
type Area = (typeof AREAS)[number];

export function RiskSection({ planId, initial, ready }: { planId: string; initial: Section<RiskSnapshot> | null; ready: boolean }) {
  const t = useTranslations("validate.risk");
  const s = useDraftSection<RiskSnapshot>(planId, "risk", initial, ready);
  const d = s.draft;

  const list = (key: "strengths" | "unknowns") => (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-forest">{t(key)}</h3>
      <ul className="space-y-2">
        {d?.[key].map((text, i) => (
          <li key={i} className="flex gap-2">
            <input
              aria-label={`${t(key)} ${i + 1}`}
              value={text}
              maxLength={200}
              onChange={(e) => s.setDraft((x) => ({ ...x, [key]: x[key].map((v, j) => (j === i ? e.target.value : v)) }))}
              className={cn(fieldClass, "flex-1")}
            />
            <button type="button" aria-label={t("delete")} onClick={() => s.setDraft((x) => ({ ...x, [key]: x[key].filter((_, j) => j !== i) }))}
              className="grid min-h-11 min-w-11 place-items-center rounded-lg text-muted hover:bg-danger/10 hover:text-danger">
              <Trash2 className="size-4" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
      <Button variant="ghost" size="sm" onClick={() => s.setDraft((x) => ({ ...x, [key]: [...x[key], ""] }))}>
        <Plus className="size-4" aria-hidden />{t("add")}
      </Button>
    </div>
  );

  return (
    <SectionShell
      title={t("title")}
      intro={t("intro")}
      hasContent={Boolean(d)}
      edited={Boolean(s.section?.editedByUser)}
      dirty={s.dirty}
      busy={s.busy}
      error={s.error}
      onSave={s.save}
      onRegenerate={() => s.generate()}
      emptyAction={<Button onClick={() => s.generate()} disabled={!ready}>{t("create")}</Button>}
    >
      {d && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {list("strengths")}
            {list("unknowns")}
          </div>
          {AREAS.map((area: Area) => {
            const risks = d.risks.map((r, i) => ({ r, i })).filter(({ r }) => r.area === area);
            return (
              <section key={area} className="space-y-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-gold">{t(`areas.${area}`)}</h3>
                {risks.length === 0 && <p className="text-sm text-muted">{t("noneInArea")}</p>}
                {risks.map(({ r, i }) => (
                  <div key={i} className="space-y-2 rounded-xl border border-line p-3">
                    <div className="flex gap-2">
                      <textarea
                        aria-label={t("riskLabel")}
                        value={r.text}
                        rows={2}
                        maxLength={300}
                        onChange={(e) => s.setDraft((x) => ({ ...x, risks: x.risks.map((v, j) => (j === i ? { ...v, text: e.target.value } : v)) }))}
                        className={cn(growClass, "flex-1 font-medium")}
                      />
                      <button type="button" aria-label={t("delete")} onClick={() => s.setDraft((x) => ({ ...x, risks: x.risks.filter((_, j) => j !== i) }))}
                        className="grid min-h-11 min-w-11 place-items-center rounded-lg text-muted hover:bg-danger/10 hover:text-danger">
                        <Trash2 className="size-4" aria-hidden />
                      </button>
                    </div>
                    <label className="block space-y-1">
                      <span className="text-xs font-semibold text-muted">{t("evidence")}</span>
                      <textarea
                        rows={1}
                        value={r.evidenceNeeded}
                        maxLength={300}
                        onChange={(e) => s.setDraft((x) => ({ ...x, risks: x.risks.map((v, j) => (j === i ? { ...v, evidenceNeeded: e.target.value } : v)) }))}
                        className={growClass}
                      />
                    </label>
                  </div>
                ))}
                <Button variant="ghost" size="sm" onClick={() => s.setDraft((x) => ({ ...x, risks: [...x.risks, { area, text: "", evidenceNeeded: "" }] }))}>
                  <Plus className="size-4" aria-hidden />{t("addRisk")}
                </Button>
              </section>
            );
          })}
        </div>
      )}
    </SectionShell>
  );
}
