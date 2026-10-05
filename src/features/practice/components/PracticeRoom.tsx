"use client";
// Practice room: pick who to talk to, have the conversation out loud, then get kind feedback.
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Award, Landmark, Loader2, Mic, RotateCcw, Send, ShoppingBag, Square, Star, Building2 } from "lucide-react";
import { Button, Celebrate, cn } from "@/components/ui";
import type { Lang } from "@/contracts/profile";
import { useSpeech } from "@/features/intake/hooks/useSpeech";
import { useSpeaker } from "@/features/talk/hooks/useSpeaker";
import { practiceFeedback, practiceTurn, type PracticeFeedback, type PracticeMessage } from "../actions";
import type { Role } from "../roles";

const ROLE_UI: Record<Role, { icon: typeof Landmark; tone: string; avatar: string }> = {
  bank: { icon: Landmark, tone: "from-sky to-forest", avatar: "🏦" },
  customer: { icon: ShoppingBag, tone: "from-coral to-berry", avatar: "🛍️" },
  office: { icon: Building2, tone: "from-sage to-sky", avatar: "🏢" },
};

export function PracticeRoom({ planId }: { planId: string }) {
  const t = useTranslations("practice");
  const lang = useLocale() as Lang;
  const [role, setRole] = useState<Role | null>(null);
  const [thread, setThread] = useState<PracticeMessage[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [finished, setFinished] = useState(false);
  const [feedback, setFeedback] = useState<PracticeFeedback | null>(null);
  const [failed, setFailed] = useState(false);
  const [fire, setFire] = useState(0);
  const speech = useSpeech(lang, setText);
  const speaker = useSpeaker(lang);
  const endRef = useRef<HTMLDivElement>(null);
  const listening = speech.status === "listening" || speech.status === "recording";

  const partnerSays = useCallback(async (r: Role, history: PracticeMessage[], said: string) => {
    setBusy(true);
    setFailed(false);
    const res = await practiceTurn(planId, r, history, said, lang);
    setBusy(false);
    if (!res.ok) {
      setFailed(true);
      return;
    }
    setThread((th) => [...th, { role: "partner", text: res.reply }]);
    if (res.finished) setFinished(true);
    await speaker.speak(res.reply);
  }, [planId, lang, speaker]);

  const begin = (r: Role) => {
    setRole(r);
    setThread([]);
    setFinished(false);
    setFeedback(null);
    void partnerSays(r, [], "");
  };

  const send = useCallback(async (said: string) => {
    const clean = said.trim();
    if (!clean || !role) return;
    setText("");
    const history = [...thread, { role: "founder" as const, text: clean }];
    setThread(history);
    await partnerSays(role, thread, clean);
  }, [role, thread, partnerSays]);

  // Speaking: send automatically when the mic stops.
  const prev = useRef(speech.status);
  useEffect(() => {
    const was = prev.current;
    prev.current = speech.status;
    if (was !== "idle" && speech.status === "idle" && text.trim()) void send(text);
  }, [speech.status, text, send]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [thread.length, busy, feedback]);

  const getFeedback = async () => {
    if (!role) return;
    speaker.stop();
    setBusy(true);
    const r = await practiceFeedback(planId, role, thread, lang);
    setBusy(false);
    if (r.ok) {
      setFeedback(r.feedback);
      if (r.feedback.stars >= 4) setFire((n) => n + 1);
    } else setFailed(true);
  };

  if (!role) {
    return (
      <ul className="stagger space-y-3">
        {(Object.keys(ROLE_UI) as Role[]).map((r) => {
          const { icon: Icon, tone, avatar } = ROLE_UI[r];
          return (
            <li key={r}>
              <button type="button" onClick={() => begin(r)} className={cn("flex w-full items-center gap-4 rounded-[2rem] bg-gradient-to-br p-5 text-left text-white shadow-lift transition-transform hover:-translate-y-0.5", tone)}>
                <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-white/20 text-3xl" aria-hidden>{avatar}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-xl font-bold">{t(`roles.${r}.title`)}</span>
                  <span className="block text-sm text-white/85">{t(`roles.${r}.sub`)}</span>
                </span>
                <Icon className="size-6 shrink-0" aria-hidden />
              </button>
            </li>
          );
        })}
      </ul>
    );
  }

  const ui = ROLE_UI[role];
  const founderTurns = thread.filter((m) => m.role === "founder").length;

  return (
    <div className="space-y-4">
      <Celebrate fire={fire} message={t("great")} />
      <div className={cn("flex items-center gap-3 rounded-3xl bg-gradient-to-br p-4 text-white", ui.tone)}>
        <span className="text-3xl" aria-hidden>{ui.avatar}</span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg font-bold">{t(`roles.${role}.name`)}</p>
          <p className="text-sm text-white/85">{t(`roles.${role}.title`)}</p>
        </div>
        <button type="button" onClick={() => { speaker.stop(); speech.stop(); setRole(null); }} className="min-h-9 rounded-full bg-white/20 px-3 text-xs font-bold">
          {t("change")}
        </button>
      </div>

      <div className="space-y-2">
        {thread.map((m, i) => (
          <div key={i} className={cn("flex animate-rise", m.role === "founder" ? "justify-end" : "justify-start")}>
            <p className={cn("max-w-[85%] rounded-3xl px-4 py-3", m.role === "founder" ? "rounded-br-md bg-gradient-to-br from-coral to-coral-600 text-white" : "rounded-bl-md border border-line/70 bg-white text-ink shadow-soft")}>
              {m.role === "partner" && <span className="mr-1" aria-hidden>{ui.avatar}</span>}
              {m.text}
            </p>
          </div>
        ))}
        {busy && (
          <p className="flex w-fit items-center gap-2 rounded-3xl border border-line/70 bg-white px-4 py-3 text-sm text-muted">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            {feedback === null && founderTurns > 0 && finished ? t("coaching") : t("thinking")}
          </p>
        )}
        {failed && <p className="rounded-2xl bg-danger/10 p-3 text-sm text-danger">{t("failed")}</p>}
      </div>

      {feedback ? (
        <section className="animate-pop space-y-3 rounded-[2rem] bg-gradient-to-br from-sun-light via-white to-sage-light p-5 shadow-lift">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-coral-600">
            <Award className="size-4" aria-hidden />
            {t("feedbackTitle")}
          </p>
          <p className="flex gap-1" aria-label={t("stars", { count: feedback.stars })}>
            {[1, 2, 3, 4, 5].map((n) => <Star key={n} className={cn("size-7", n <= feedback.stars ? "fill-sun text-sun" : "text-line")} aria-hidden />)}
          </p>
          <p className="font-display text-xl font-bold text-forest">{feedback.headline}</p>
          <div>
            <p className="text-sm font-bold text-sage">{t("didWell")}</p>
            <ul className="list-inside list-disc text-sm text-ink">{feedback.strengths.map((s) => <li key={s}>{s}</li>)}</ul>
          </div>
          <div>
            <p className="text-sm font-bold text-coral-600">{t("tryNext")}</p>
            <ul className="list-inside list-disc text-sm text-ink">{feedback.tips.map((s) => <li key={s}>{s}</li>)}</ul>
          </div>
          <p className="rounded-2xl bg-white p-3 text-sm"><span className="font-bold text-forest">{t("sayThis")} </span>“{feedback.betterLine}”</p>
          <Button block variant="secondary" onClick={() => begin(role)}>
            <RotateCcw className="size-5" aria-hidden />
            {t("again")}
          </Button>
        </section>
      ) : (
        <div className="sticky bottom-24 space-y-2 rounded-3xl border border-line/70 bg-white/95 p-3 shadow-lift backdrop-blur">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => (listening ? speech.stop() : (speaker.stop(), speech.start("")))}
              disabled={busy || speech.status === "transcribing"}
              aria-label={listening ? t("stop") : t("speak")}
              className={cn("grid size-12 shrink-0 place-items-center rounded-full text-white shadow-soft", listening ? "bg-gradient-to-br from-berry to-coral-600" : "bg-gradient-to-br from-sun to-coral")}
            >
              {speech.status === "transcribing" ? <Loader2 className="size-5 animate-spin" aria-hidden /> : listening ? <Square className="size-4 fill-white" aria-hidden /> : <Mic className="size-5" aria-hidden />}
            </button>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void send(text)}
              placeholder={listening ? t("listening") : t("placeholder")}
              className="min-h-12 flex-1 rounded-full border-2 border-line px-4 focus:border-coral/60 focus:outline-none"
            />
            <button type="button" onClick={() => void send(text)} disabled={!text.trim() || busy} aria-label={t("send")} className="grid size-12 shrink-0 place-items-center rounded-full bg-forest text-white disabled:opacity-40">
              <Send className="size-5" aria-hidden />
            </button>
          </div>
          {founderTurns >= 2 && (
            <Button block variant={finished ? "primary" : "secondary"} onClick={getFeedback} disabled={busy}>
              <Award className="size-5" aria-hidden />
              {t("finish")}
            </Button>
          )}
        </div>
      )}
      <div ref={endRef} />
    </div>
  );
}
