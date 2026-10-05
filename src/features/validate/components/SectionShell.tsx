"use client";
// OWNER: T1 — frame for an AI-drafted section: title, "AI draft: edit freely", regenerate, save, errors.
import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Loader2, RefreshCw, Save, Sparkles } from "lucide-react";
import { Badge, Button, Card, GrowingWait } from "@/components/ui";
import type { DraftError } from "../hooks/useDraftSection";

export function SectionShell({
  title,
  intro,
  hasContent,
  edited,
  dirty,
  busy,
  error,
  onRegenerate,
  onSave,
  emptyAction,
  children,
  footer,
}: {
  title: string;
  intro?: string;
  hasContent: boolean;
  edited: boolean;
  dirty: boolean;
  busy: boolean;
  error: DraftError | null;
  onRegenerate?: () => void;
  onSave?: () => void;
  emptyAction?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
}) {
  const t = useTranslations("validate");
  const tc = useTranslations("common");
  return (
    <Card className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-forest">{title}</h2>
          {intro && <p className="text-sm text-muted">{intro}</p>}
        </div>
        {hasContent && (
          <Badge tone={edited ? "teal" : "gold"} className="shrink-0">
            <Sparkles className="size-3" aria-hidden />
            {edited ? t("editedByYou") : tc("labels.aiDraft")}
          </Badge>
        )}
      </div>

      {error && error !== "needsConfirm" && (
        <p role="alert" className="rounded-lg bg-danger/10 p-2 text-sm text-danger">{t(`errors.${error}`)}</p>
      )}

      {!hasContent && busy && (
        <GrowingWait message={t("drafting")} />
      )}
      {!hasContent && !busy && emptyAction}
      {hasContent && children}

      {hasContent && (onSave || onRegenerate) && (
        <div className="flex flex-wrap gap-2 pt-1">
          {onSave && (
            <Button size="sm" onClick={onSave} disabled={!dirty || busy}>
              {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Save className="size-4" aria-hidden />}
              {dirty ? tc("actions.save") : t("saved")}
            </Button>
          )}
          {onRegenerate && (
            <Button size="sm" variant="secondary" onClick={onRegenerate} disabled={busy}>
              <RefreshCw className="size-4" aria-hidden />
              {t("regenerate")}
            </Button>
          )}
        </div>
      )}
      {footer}
    </Card>
  );
}

export const fieldClass = "w-full rounded-xl border border-line bg-white px-3 py-2 text-base";
/** Multi-line box that grows to show all its text. */
export const growClass = `${fieldClass} field-sizing-content min-h-11 resize-none`;
