"use client";
// OWNER: T1 — #9 assumptions list (AI draft, every item editable / deletable, add new)
import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Plus, Trash2 } from "lucide-react";
import { Button, cn } from "@/components/ui";
import type { Assumptions } from "@/contracts/sections";
import type { Section } from "../server/sections";
import { useDraftSection } from "../hooks/useDraftSection";
import { growClass, SectionShell } from "./SectionShell";

type Item = Assumptions["items"][number];

export function AssumptionsSection({ planId, initial, onReady }: { planId: string; initial: Section<Assumptions> | null; onReady?: () => void }) {
  const t = useTranslations("validate.assumptions");
  const s = useDraftSection<Assumptions>(planId, "assumptions", initial, true);
  const hasSection = Boolean(s.section);
  useEffect(() => {
    if (hasSection) onReady?.();
  }, [hasSection, onReady]);

  const update = (i: number, patch: Partial<Item>) =>
    s.setDraft((d) => ({ items: d.items.map((it, j) => (j === i ? { ...it, ...patch } : it)) }));

  return (
    <SectionShell
      title={t("title")}
      intro={t("intro")}
      hasContent={Boolean(s.draft)}
      edited={Boolean(s.section?.editedByUser)}
      dirty={s.dirty}
      busy={s.busy}
      error={s.error}
      onSave={s.save}
      onRegenerate={() => s.generate()}
      emptyAction={<Button onClick={() => s.generate()}>{t("create")}</Button>}
    >
      <ol className="space-y-3">
        {s.draft?.items.map((item, i) => (
          <li key={i} className="space-y-2 rounded-xl border border-line p-3">
            <div className="flex items-start gap-2">
              <span className="mt-2 text-sm font-bold text-gold">{i + 1}.</span>
              <textarea
                aria-label={t("textLabel", { n: i + 1 })}
                value={item.text}
                rows={2}
                maxLength={300}
                onChange={(e) => update(i, { text: e.target.value })}
                className={cn(growClass, "flex-1 font-medium")}
              />
              <button
                type="button"
                onClick={() => s.setDraft((d) => ({ items: d.items.filter((_, j) => j !== i) }))}
                aria-label={t("delete", { n: i + 1 })}
                className="grid min-h-11 min-w-11 place-items-center rounded-lg text-muted hover:bg-danger/10 hover:text-danger"
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            </div>
            <div className="flex flex-wrap gap-2 pl-5">
              {(["must_be_true", "open_question"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={item.kind === k}
                  onClick={() => update(i, { kind: k })}
                  className={cn(
                    "min-h-9 rounded-full border px-3 text-xs font-semibold",
                    item.kind === k ? "border-teal bg-mint text-forest" : "border-line text-muted",
                  )}
                >
                  {t(`kinds.${k}`)}
                </button>
              ))}
            </div>
            <label className="block space-y-1 pl-5">
              <span className="text-xs font-semibold text-muted">{t("howToCheck")}</span>
              <textarea value={item.howToCheck} rows={1} maxLength={300} onChange={(e) => update(i, { howToCheck: e.target.value })} className={growClass} />
            </label>
          </li>
        ))}
      </ol>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => s.setDraft((d) => ({ items: [...d.items, { text: "", kind: "open_question", howToCheck: "" }] }))}
        disabled={(s.draft?.items.length ?? 0) >= 12}
      >
        <Plus className="size-4" aria-hidden />
        {t("add")}
      </Button>
    </SectionShell>
  );
}
