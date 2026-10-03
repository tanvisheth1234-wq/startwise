"use client";
// OWNER: T1 — state for one AI-drafted, editable section (draft → edit → save; regenerate asks first).
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { generateSection, saveSectionEdit, type DraftResult, type ValidateKind } from "../actions";
import type { Section } from "../server/sections";

export type DraftError = Extract<DraftResult, { ok: false }>["error"];

export function useDraftSection<T>(planId: string, kind: ValidateKind, initial: Section<T> | null, autoGenerate: boolean) {
  const t = useTranslations("validate");
  const [section, setSection] = useState<Section<T> | null>(initial);
  const [draft, setDraftState] = useState<T | null>(initial?.content ?? null);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<DraftError | null>(null);
  const [scaledNote, setScaledNote] = useState(false);
  const [busy, startTransition] = useTransition();

  const apply = useCallback((r: DraftResult) => {
    if (r.ok) {
      setSection(r.section as Section<T>);
      setDraftState(r.section.content as T);
      setDirty(false);
      setError(null);
      if (r.scaledNote !== undefined) setScaledNote(r.scaledNote);
    } else {
      setError(r.error);
    }
    return r;
  }, []);

  const generate = useCallback(
    (force = false) =>
      startTransition(async () => {
        const r = await generateSection(planId, kind, force);
        if (!r.ok && r.error === "needsConfirm") {
          if (window.confirm(t("confirmRegenerate"))) apply(await generateSection(planId, kind, true));
          return;
        }
        apply(r);
      }),
    [planId, kind, apply, t],
  );

  const save = useCallback(
    () =>
      startTransition(async () => {
        if (draft) apply(await saveSectionEdit(planId, kind, draft));
      }),
    [planId, kind, draft, apply],
  );

  const setDraft = useCallback((update: (d: T) => T) => {
    setDraftState((d) => (d ? update(d) : d));
    setDirty(true);
  }, []);

  // First visit: draft automatically (once).
  const started = useRef(false);
  useEffect(() => {
    if (autoGenerate && !section && !started.current) {
      started.current = true;
      generate();
    }
  }, [autoGenerate, section, generate]);

  return { section, draft, setDraft, dirty, busy, error, scaledNote, generate, save, apply, startTransition };
}
