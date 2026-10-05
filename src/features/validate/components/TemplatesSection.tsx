"use client";
// OWNER: T1 — #12 ready-to-send templates: WhatsApp message (copy + share), poll, price card
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Copy, MessageCircle } from "lucide-react";
import { Button, buttonClasses, cn } from "@/components/ui";
import type { Templates } from "@/contracts/sections";
import { useDraftSection } from "../hooks/useDraftSection";
import type { Section } from "../server/sections";
import { fieldClass, growClass, SectionShell } from "./SectionShell";

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Older phones / non-https: fall back to a hidden textarea.
    const el = document.createElement("textarea");
    el.value = text;
    el.style.position = "fixed";
    el.style.opacity = "0";
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand("copy");
    el.remove();
    return ok;
  }
}

function CopyButton({ text }: { text: string }) {
  const tc = useTranslations("common.actions");
  const [copied, setCopied] = useState(false);
  return (
    <Button
      size="sm"
      variant="secondary"
      onClick={async () => {
        if (await copyText(text)) {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }
      }}
    >
      {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
      <span aria-live="polite">{copied ? tc("copied") : tc("copy")}</span>
    </Button>
  );
}

/** Copy, or open WhatsApp with the text ready to send. */
export function ShareRow({ text }: { text: string }) {
  const t = useTranslations("validate.templates");
  return (
    <div className="flex flex-wrap gap-2">
      <CopyButton text={text} />
      <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer" className={buttonClasses("primary", "sm")}>
        <MessageCircle className="size-4" aria-hidden />
        {t("shareWhatsapp")}
      </a>
    </div>
  );
}

export function TemplatesSection({ planId, initial, ready }: { planId: string; initial: Section<Templates> | null; ready: boolean }) {
  const t = useTranslations("validate.templates");
  const s = useDraftSection<Templates>(planId, "templates", initial, false);
  const d = s.draft;
  const pollText = d ? [d.poll.question, ...d.poll.options.map((o, i) => `${i + 1}. ${o}`)].join("\n") : "";

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
      emptyAction={<Button onClick={() => s.generate()} disabled={!ready}>{ready ? t("create") : t("needsAssumptions")}</Button>}
    >
      {d && (
        <div className="space-y-5">
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-forest">{t("whatsapp")}</h3>
            <textarea aria-label={t("whatsapp")} value={d.whatsappMessage} rows={5} maxLength={1000}
              onChange={(e) => s.setDraft((x) => ({ ...x, whatsappMessage: e.target.value }))} className={growClass} />
            <ShareRow text={d.whatsappMessage} />
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-forest">{t("poll")}</h3>
            <input aria-label={t("pollQuestion")} value={d.poll.question} maxLength={200}
              onChange={(e) => s.setDraft((x) => ({ ...x, poll: { ...x.poll, question: e.target.value } }))} className={cn(fieldClass, "font-medium")} />
            <ul className="space-y-2">
              {d.poll.options.map((o, i) => (
                <li key={i}>
                  <input aria-label={t("pollOption", { n: i + 1 })} value={o} maxLength={100}
                    onChange={(e) => s.setDraft((x) => ({ ...x, poll: { ...x.poll, options: x.poll.options.map((v, j) => (j === i ? e.target.value : v)) } }))}
                    className={fieldClass} />
                </li>
              ))}
            </ul>
            <ShareRow text={pollText} />
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-forest">{t("priceCard")}</h3>
            <p className="text-xs text-muted">{t("priceCardHint")}</p>
            <textarea aria-label={t("priceCard")} value={d.priceCard} rows={5} maxLength={1000}
              onChange={(e) => s.setDraft((x) => ({ ...x, priceCard: e.target.value }))} className={growClass} />
            <ShareRow text={d.priceCard} />
          </section>
        </div>
      )}
    </SectionShell>
  );
}
