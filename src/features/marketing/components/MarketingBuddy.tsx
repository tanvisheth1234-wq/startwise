"use client";
// Marketing Buddy: what to post, when, with a ready caption; one tap to copy, share or set a reminder.
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { CalendarPlus, Camera, Check, Copy, Handshake, Loader2, MessageCircle, PartyPopper, RefreshCw, Sparkles } from "lucide-react";
import { Badge, Button, Celebrate, cn } from "@/components/ui";
import { generateMarketing, markPosted, type CaptionLang, type MarketingState } from "../actions";
import { googleCalendarUrl, nextSlot } from "../lib/calendar";

const CHANNEL_TONE: Record<string, string> = {
  whatsapp_status: "bg-sage-light text-sage",
  whatsapp_broadcast: "bg-sage-light text-sage",
  instagram_post: "bg-berry-light text-berry",
  instagram_story: "bg-berry-light text-berry",
  instagram_reel: "bg-berry-light text-berry",
};

function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  return {
    copied,
    copy: async (key: string, text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(key);
        setTimeout(() => setCopied(null), 1500);
      } catch {
        /* clipboard blocked: the text is still visible to copy by hand */
      }
    },
  };
}

export function MarketingBuddy({ planId, initial, defaultLang }: { planId: string; initial: MarketingState | null; defaultLang: CaptionLang }) {
  const t = useTranslations("marketing");
  const [state, setState] = useState(initial);
  const [captionLang, setCaptionLang] = useState<CaptionLang>(initial?.captionLang ?? defaultLang);
  const [posted, setPosted] = useState<Set<number>>(new Set(initial?.posted ?? []));
  const [failed, setFailed] = useState(false);
  const [fire, setFire] = useState(0);
  const [pending, start] = useTransition();
  const { copied, copy } = useCopy();

  const generate = () =>
    start(async () => {
      setFailed(false);
      const r = await generateMarketing(planId, captionLang);
      if (r.ok) {
        setState(r.state);
        setPosted(new Set());
      } else setFailed(true);
    });

  const togglePosted = (i: number) => {
    const on = !posted.has(i);
    setPosted((s) => {
      const n = new Set(s);
      if (on) n.add(i);
      else n.delete(i);
      return n;
    });
    if (on) setFire((n) => n + 1);
    start(() => markPosted(planId, i, on));
  };

  const langChips = (
    <div className="flex flex-wrap gap-1.5">
      {(["english", "hinglish", "hindi", "marathi"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setCaptionLang(l)}
          aria-pressed={captionLang === l}
          className={cn("min-h-10 rounded-full border-2 px-3 text-sm font-semibold", captionLang === l ? "border-coral bg-coral text-white" : "border-line bg-white text-forest")}
        >
          {t(`langs.${l}`)}
        </button>
      ))}
    </div>
  );

  if (!state) {
    return (
      <section className="space-y-4 rounded-[2rem] bg-gradient-to-br from-berry-light via-mint to-sun-light p-5 text-center">
        <p className="text-5xl" aria-hidden>📣</p>
        <h2 className="font-display text-2xl font-extrabold text-forest">{t("emptyTitle")}</h2>
        <p className="text-sm text-forest-700">{t("emptyBody")}</p>
        <p className="text-sm font-bold text-forest">{t("captionLang")}</p>
        <div className="flex justify-center">{langChips}</div>
        <Button block size="lg" onClick={generate} disabled={pending}>
          {pending ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Sparkles className="size-5" aria-hidden />}
          {pending ? t("making") : t("make")}
        </Button>
        {failed && <p role="alert" className="text-sm text-danger">{t("failed")}</p>}
      </section>
    );
  }

  const { plan } = state;
  return (
    <div className="space-y-5">
      <Celebrate fire={fire} message={t("postedYay")} />

      <div className="rounded-3xl border border-line/70 bg-white p-4 shadow-soft">
        <div className="flex items-baseline justify-between">
          <p className="font-display text-lg font-bold text-forest">{t("thisWeek")}</p>
          <p className="text-sm font-bold text-coral-600">{t("postedCount", { done: posted.size, total: plan.posts.length })}</p>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-mint">
          <div className="h-full rounded-full bg-gradient-to-r from-berry to-coral transition-all" style={{ width: `${(posted.size / plan.posts.length) * 100}%` }} />
        </div>
      </div>

      {plan.festivalTip && (
        <p className="flex gap-2 rounded-3xl bg-gradient-to-r from-sun to-coral p-4 font-semibold text-white shadow-lift">
          <PartyPopper className="mt-0.5 size-5 shrink-0" aria-hidden />
          {plan.festivalTip}
        </p>
      )}

      <ol className="stagger space-y-3">
        {plan.posts.map((p, i) => {
          const done = posted.has(i);
          const slot = nextSlot(p.day, p.time);
          const cal = googleCalendarUrl(`📣 ${t(`channels.${p.channel}`)}: ${p.idea}`, `${p.caption}\n\n📸 ${p.photoTip}`, slot);
          return (
            <li key={i} className={cn("space-y-3 rounded-3xl border bg-white p-4 shadow-soft", done ? "border-sage/40 bg-sage-light/40" : "border-line/70")}>
              <div className="flex items-center gap-3">
                <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-forest text-white">
                  <span className="text-center leading-tight">
                    <span className="block text-xs font-bold uppercase">{t(`days.${p.day}`)}</span>
                    <span className="block font-display text-sm font-extrabold">{p.time}</span>
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold", CHANNEL_TONE[p.channel])}>
                    {p.channel.startsWith("instagram") ? <Camera className="size-3" aria-hidden /> : <MessageCircle className="size-3" aria-hidden />}
                    {t(`channels.${p.channel}`)}
                  </span>
                  <p className="mt-0.5 font-display font-bold leading-snug text-forest">{p.idea}</p>
                </div>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={done}
                  aria-label={t("markPosted")}
                  onClick={() => togglePosted(i)}
                  className={cn("grid size-9 shrink-0 place-items-center rounded-full border-2", done ? "border-sage bg-sage text-white" : "border-line")}
                >
                  {done && <Check className="size-5" aria-hidden />}
                </button>
              </div>
              <p className="whitespace-pre-wrap rounded-2xl bg-mint/70 p-3 text-sm text-ink">{p.caption}</p>
              <p className="flex gap-2 text-xs text-muted">
                <Camera className="size-4 shrink-0 text-coral" aria-hidden />
                {p.photoTip}
              </p>
              <div className="grid grid-cols-3 gap-2">
                <button type="button" onClick={() => copy(`p${i}`, p.caption)} className="flex min-h-11 items-center justify-center gap-1 rounded-2xl border-2 border-line text-sm font-semibold text-forest">
                  {copied === `p${i}` ? <Check className="size-4 text-sage" aria-hidden /> : <Copy className="size-4" aria-hidden />}
                  {copied === `p${i}` ? t("copied") : t("copy")}
                </button>
                <a href={`https://wa.me/?text=${encodeURIComponent(p.caption)}`} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center justify-center gap-1 rounded-2xl bg-sage text-sm font-semibold text-white">
                  <MessageCircle className="size-4" aria-hidden />
                  {t("share")}
                </a>
                <a href={cal} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center justify-center gap-1 rounded-2xl bg-forest text-sm font-semibold text-white">
                  <CalendarPlus className="size-4" aria-hidden />
                  {t("remind")}
                </a>
              </div>
            </li>
          );
        })}
      </ol>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 font-display text-xl font-bold text-forest">
          <Handshake className="size-6 text-coral" aria-hidden />
          {t("partnersTitle")}
        </h2>
        <ul className="space-y-3">
          {plan.partnerships.map((pt, i) => (
            <li key={i} className="space-y-2 rounded-3xl border border-line/70 bg-white p-4 shadow-soft">
              <p className="font-display text-lg font-bold text-forest">{pt.who}</p>
              <p className="text-sm text-muted">{pt.why}</p>
              <p className="whitespace-pre-wrap rounded-2xl bg-sky-light/70 p-3 text-sm text-ink">{pt.message}</p>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => copy(`m${i}`, pt.message)} className="flex min-h-11 items-center justify-center gap-1 rounded-2xl border-2 border-line text-sm font-semibold text-forest">
                  {copied === `m${i}` ? <Check className="size-4 text-sage" aria-hidden /> : <Copy className="size-4" aria-hidden />}
                  {copied === `m${i}` ? t("copied") : t("copy")}
                </button>
                <a href={`https://wa.me/?text=${encodeURIComponent(pt.message)}`} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center justify-center gap-1 rounded-2xl bg-sage text-sm font-semibold text-white">
                  <MessageCircle className="size-4" aria-hidden />
                  {t("send")}
                </a>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2 rounded-3xl border-2 border-dashed border-line p-4">
        <p className="text-sm font-bold text-forest">{t("newWeek")}</p>
        {langChips}
        <Button variant="secondary" block onClick={generate} disabled={pending}>
          {pending ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <RefreshCw className="size-5" aria-hidden />}
          {pending ? t("making") : t("remake")}
        </Button>
        {failed && <p role="alert" className="text-sm text-danger">{t("failed")}</p>}
      </section>
      <Badge tone="grey">{t("aiNote")}</Badge>
    </div>
  );
}
