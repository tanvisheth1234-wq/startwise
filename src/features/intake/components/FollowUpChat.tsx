"use client";
// OWNER: T1 — chat-style follow-up questions (#4)
import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Loader2, Send } from "lucide-react";
import { Button, cn } from "@/components/ui";
import type { Lang } from "@/contracts/profile";
import type { IntakeResult, IntakeState } from "../actions";
import { useSpeech } from "../hooks/useSpeech";
import { quickRepliesFor } from "../lib/quickReplies";
import { MicButton, SpeechErrorNote } from "./MicButton";

const SUPPORTED = ["home_food", "tailoring_boutique", "online_reselling"] as const;

export type ChatHandlers = {
  answer: (text: string) => Promise<IntakeResult>;
  quick: (field: string, chipId: string, label: string) => Promise<IntakeResult>;
  chooseType: (type: string, label: string) => Promise<IntakeResult>;
  skip: () => Promise<IntakeResult>;
};

export function FollowUpChat({
  state,
  busy,
  error,
  handlers,
}: {
  state: IntakeState;
  busy: boolean;
  error: string | null;
  handlers: ChatHandlers;
}) {
  const t = useTranslations("intake");
  const lang = useLocale() as Lang;
  const [draft, setDraft] = useState("");
  const speech = useSpeech(lang, setDraft);
  const endRef = useRef<HTMLDivElement>(null);
  const { chat, profile } = state;
  const pending = chat.pending;
  const needsType = profile.businessType === "other" && !chat.done;
  const chips = quickRepliesFor(pending?.field);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chat.messages.length, pending?.question, busy]);

  const send = async () => {
    const text = draft.trim();
    if (!text || busy) return;
    speech.stop();
    const r = await handlers.answer(text);
    if (r.ok) setDraft("");
  };

  return (
    <div className="flex flex-col gap-3">
      <ol className="space-y-2" aria-live="polite">
        {chat.messages.map((m, i) => (
          <li key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <p
              className={cn(
                "max-w-[85%] rounded-2xl px-4 py-2 text-base",
                m.role === "user" ? "rounded-br-sm bg-forest text-white" : "rounded-bl-sm border border-line bg-white",
              )}
            >
              {m.text}
            </p>
          </li>
        ))}
        {pending && (
          <li className="flex justify-start">
            <p className="max-w-[85%] rounded-2xl rounded-bl-sm border border-teal/40 bg-mint px-4 py-2 text-base font-medium text-forest">
              {pending.question}
            </p>
          </li>
        )}
        {busy && (
          <li className="flex justify-start">
            <p className="flex items-center gap-2 rounded-2xl border border-line bg-white px-4 py-2 text-sm text-muted">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              {t("thinking")}
            </p>
          </li>
        )}
      </ol>

      {needsType && (
        <div className="space-y-2 rounded-2xl border border-gold/40 bg-gold-light/20 p-4">
          <p className="font-semibold text-forest">{t("unsupported")}</p>
          <div className="flex flex-wrap gap-2">
            {SUPPORTED.map((type) => (
              <Button key={type} variant="secondary" disabled={busy} onClick={() => handlers.chooseType(type, t(`types.${type}`))}>
                {t(`types.${type}`)}
              </Button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-lg bg-danger/10 p-2 text-sm text-danger">
          {t(`errors.${error}`)}
        </p>
      )}

      {pending && (
        <div className="space-y-3">
          {chips.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {chips.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  disabled={busy}
                  onClick={() => handlers.quick(c.field, c.id, t(`chips.${c.id}`))}
                  className="min-h-11 rounded-full border border-teal/40 bg-white px-4 text-sm font-semibold text-teal hover:bg-teal hover:text-white disabled:opacity-50"
                >
                  {t(`chips.${c.id}`)}
                </button>
              ))}
            </div>
          )}

          <SpeechErrorNote error={speech.error} />

          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <MicButton size="sm" status={speech.status} onStart={() => speech.start(draft)} onStop={speech.stop} disabled={busy} />
            <label className="flex-1">
              <span className="sr-only">{t("answerLabel")}</span>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={300}
                placeholder={t("answerPlaceholder")}
                className="min-h-11 w-full rounded-xl border border-line bg-white px-3 text-base"
              />
            </label>
            <Button type="submit" size="sm" disabled={!draft.trim() || busy} aria-label={t("send")}>
              <Send className="size-5" aria-hidden />
            </Button>
          </form>

          <button
            type="button"
            onClick={() => handlers.skip()}
            disabled={busy}
            className="min-h-11 w-full text-sm font-semibold text-muted underline-offset-2 hover:underline"
          >
            {t("skip")}
          </button>
        </div>
      )}
      <div ref={endRef} />
    </div>
  );
}
