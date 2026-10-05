"use client";
// Worry Box: say what scares you; get calm words and one small step you can take today.
import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Footprints, HeartHandshake, Loader2 } from "lucide-react";
import { Button } from "@/components/ui";
import type { Lang } from "@/contracts/profile";
import type { WorryReply } from "@/lib/ai/extras";
import { useSpeech } from "@/features/intake/hooks/useSpeech";
import { MicButton } from "@/features/intake/components/MicButton";
import { ReadAloud } from "@/features/intake/ui";
import { askWorry } from "../worry";

export function WorryBox({ planId }: { planId: string }) {
  const t = useTranslations("notebook.worry");
  const lang = useLocale() as Lang;
  const [text, setText] = useState("");
  const [reply, setReply] = useState<WorryReply | null>(null);
  const [failed, setFailed] = useState(false);
  const [pending, start] = useTransition();
  const speech = useSpeech(lang, setText);

  const examples = [t("ex1"), t("ex2"), t("ex3")];

  return (
    <section className="space-y-3 rounded-[2rem] bg-gradient-to-br from-berry-light to-sky-light p-4">
      <h2 className="flex items-center gap-2 font-display text-xl font-bold text-forest">
        <HeartHandshake className="size-6 text-berry" aria-hidden />
        {t("title")}
      </h2>
      <p className="text-sm text-forest-700">{t("subtitle")}</p>

      {!reply && (
        <>
          <div className="flex flex-wrap gap-1.5">
            {examples.map((e) => (
              <button key={e} type="button" onClick={() => setText(e)} className="min-h-9 rounded-full bg-white/70 px-3 text-xs font-semibold text-forest hover:bg-white">
                {e}
              </button>
            ))}
          </div>
          <div className="flex items-start gap-2 rounded-3xl bg-white p-2 shadow-soft">
            <MicButton size="sm" status={speech.status} level={speech.level} onStart={() => speech.start(text)} onStop={speech.stop} />
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={2}
              maxLength={600}
              placeholder={t("placeholder")}
              className="min-h-11 flex-1 resize-none p-2 text-base focus:outline-none"
            />
          </div>
          <Button
            block
            disabled={!text.trim() || pending}
            onClick={() =>
              start(async () => {
                setFailed(false);
                const r = await askWorry(planId, text);
                if (r.ok) setReply(r.reply);
                else setFailed(true);
              })
            }
          >
            {pending && <Loader2 className="size-5 animate-spin" aria-hidden />}
            {pending ? t("thinking") : t("share")}
          </Button>
          {failed && <p role="alert" className="text-sm text-danger">{t("failed")}</p>}
        </>
      )}

      {reply && (
        <div className="animate-rise space-y-3">
          <p className="rounded-3xl bg-white p-4 font-display text-lg font-semibold leading-snug text-forest">{reply.comfort}</p>
          <ReadAloud text={`${reply.comfort} ${reply.reality} ${reply.smallStep}`} lang={lang} />
          <p className="rounded-3xl bg-white/70 p-4 text-sm text-ink">{reply.reality}</p>
          <p className="flex gap-2 rounded-3xl bg-sage p-4 font-semibold text-white">
            <Footprints className="mt-0.5 size-5 shrink-0" aria-hidden />
            <span>
              <span className="block text-xs font-bold uppercase tracking-widest text-white/80">{t("smallStep")}</span>
              {reply.smallStep}
            </span>
          </p>
          <button
            type="button"
            onClick={() => {
              setReply(null);
              setText("");
            }}
            className="min-h-11 w-full text-sm font-semibold text-forest-700 underline-offset-2 hover:underline"
          >
            {t("another")}
          </button>
        </div>
      )}
    </section>
  );
}
