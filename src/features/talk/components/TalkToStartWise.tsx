"use client";
// "Talk to StartWise": a floating button that opens a hands-free voice conversation about your plan.
// Speak → it answers out loud from your real plan → it listens again. It can open screens,
// add tasks and log sales for you.
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight, AudioLines, Check, Copy, Loader2, MessageCircle, Mic, Square, X } from "lucide-react";
import { cn } from "@/components/ui";
import type { Lang } from "@/contracts/profile";
import { useSpeech } from "@/features/intake/hooks/useSpeech";
import { talkTurn, type TalkMessage } from "../actions";
import { useSpeaker } from "../hooks/useSpeaker";
import { screenHref, type Screen } from "../lib/screens";

type Bubble = TalkMessage & { open?: Screen | null; did?: ("task" | "diary")[] };

export function TalkToStartWise({ planId, item }: { planId: string; item: string | null }) {
  const t = useTranslations("talk");
  const lang = useLocale() as Lang;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [thread, setThread] = useState<Bubble[]>([]);
  const [thinking, setThinking] = useState(false);
  const [handsFree, setHandsFree] = useState(true);
  const [failed, setFailed] = useState(false);
  const speech = useSpeech(lang, setText);
  const speaker = useSpeaker(lang);
  const endRef = useRef<HTMLDivElement>(null);
  const threadRef = useRef(thread);
  useEffect(() => {
    threadRef.current = thread;
  }, [thread]);

  const listening = speech.status === "listening" || speech.status === "recording";
  const state = thinking ? "thinking" : speaker.speaking ? "speaking" : listening ? "listening" : speech.status === "transcribing" ? "hearing" : "idle";

  const send = useCallback(async (said: string) => {
    const clean = said.trim();
    if (!clean) return;
    setText("");
    setFailed(false);
    const history = threadRef.current.map(({ role, text: m }) => ({ role, text: m }));
    setThread((th) => [...th, { role: "user", text: clean }]);
    setThinking(true);
    const r = await talkTurn(planId, history, clean, lang);
    setThinking(false);
    if (!r.ok) {
      setFailed(true);
      return;
    }
    setThread((th) => [...th, { role: "assistant", text: r.reply, open: r.open, did: r.did }]);
    if (r.did.length) router.refresh();
    await speaker.speak(r.reply);
    if (handsFree && !r.open) speech.start("");
  }, [planId, lang, router, speaker, speech, handsFree]);

  // When the mic stops and the words are in, send them (no extra tap needed).
  const prev = useRef(speech.status);
  useEffect(() => {
    const was = prev.current;
    prev.current = speech.status;
    if (was !== "idle" && speech.status === "idle" && text.trim() && open) void send(text);
  }, [speech.status, text, open, send]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [thread.length, thinking]);

  const close = () => {
    speech.stop();
    speaker.stop();
    setOpen(false);
  };

  const tc = useTranslations("common");
  const [copied, setCopied] = useState<number | null>(null);
  const suggestions = [t("s1"), t("s2"), t("s3"), t("s4", { item: item ?? tc("items") })];
  // Opened from the round Talk button in the middle of the bottom bar (no floating button over content).
  useEffect(() => {
    // An idea card can open Talk with a question already asked: new CustomEvent("sw:talk", { detail: { ask } }).
    const onOpen = (e: Event) => {
      setOpen(true);
      setThread((th) => (th.length === 0 ? [{ role: "assistant", text: t("hello") }] : th));
      const ask = (e as CustomEvent<{ ask?: string } | undefined>).detail?.ask;
      if (ask) void send(ask);
    };
    window.addEventListener("sw:talk", onOpen);
    return () => window.removeEventListener("sw:talk", onOpen);
  }, [t, send]);

  return (
    <>

      {open && (
        <div role="dialog" aria-modal="true" aria-label={t("title")} className="fixed inset-0 z-50 flex flex-col bg-gradient-to-b from-forest via-[#5a2f3f] to-[#2a1a22] text-white">
          <div className="flex items-center justify-between px-4 pb-2 pt-[calc(0.75rem+env(safe-area-inset-top))]">
            <p className="font-display text-lg font-bold">{t("title")}</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setHandsFree((h) => !h)}
                aria-pressed={handsFree}
                className={cn("min-h-9 rounded-full px-3 text-xs font-bold", handsFree ? "bg-white text-forest" : "bg-white/15 text-white")}
              >
                {handsFree ? t("handsFreeOn") : t("handsFreeOff")}
              </button>
              <button type="button" onClick={close} aria-label={t("close")} className="grid size-10 place-items-center rounded-full bg-white/15">
                <X className="size-5" aria-hidden />
              </button>
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-2">
            {thread.map((m, i) => (
              <div key={i} className={cn("flex animate-rise", m.role === "user" ? "justify-end" : "justify-start")}>
                <div className={cn("max-w-[85%] space-y-2 rounded-3xl px-4 py-3", m.role === "user" ? "rounded-br-md bg-white/15" : "rounded-bl-md bg-white text-ink")}>
                  <p className={cn(m.role === "assistant" && "font-display text-lg leading-snug")}>{m.text}</p>
                  {/* Anything StartWise writes can go straight to WhatsApp (thank-you notes, offers…). */}
                  {m.role === "assistant" && i > 0 && (
                    <div className="flex gap-3 text-xs font-semibold text-muted">
                      <button type="button" onClick={() => void navigator.clipboard?.writeText(m.text).then(() => setCopied(i))} className="flex min-h-8 items-center gap-1 hover:text-forest">
                        {copied === i ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
                        {copied === i ? tc("actions.copied") : tc("actions.copy")}
                      </button>
                      <a href={`https://wa.me/?text=${encodeURIComponent(m.text)}`} target="_blank" rel="noopener noreferrer" className="flex min-h-8 items-center gap-1 hover:text-forest">
                        <MessageCircle className="size-3.5" aria-hidden />
                        WhatsApp
                      </a>
                    </div>
                  )}
                  {m.did?.includes("task") && <p className="flex items-center gap-1 text-xs font-bold text-sage"><Check className="size-3.5" aria-hidden />{t("addedTask")}</p>}
                  {m.did?.includes("diary") && <p className="flex items-center gap-1 text-xs font-bold text-sage"><Check className="size-3.5" aria-hidden />{t("logged")}</p>}
                  {m.open && (
                    <button
                      type="button"
                      onClick={() => {
                        close();
                        router.push(screenHref(planId, m.open!));
                      }}
                      className="flex min-h-10 items-center gap-1.5 rounded-full bg-coral px-4 text-sm font-bold text-white"
                    >
                      {t(`screens.${m.open}`)}
                      <ArrowRight className="size-4" aria-hidden />
                    </button>
                  )}
                </div>
              </div>
            ))}
            {thinking && (
              <div className="flex justify-start">
                <p className="flex items-center gap-2 rounded-3xl rounded-bl-md bg-white/15 px-4 py-3 text-sm">
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  {t("thinking")}
                </p>
              </div>
            )}
            {failed && <p className="rounded-2xl bg-white/15 p-3 text-sm">{t("failed")}</p>}
            {thread.length <= 1 && !thinking && (
              <div className="flex flex-wrap gap-2 pt-2">
                {suggestions.map((s) => (
                  <button key={s} type="button" onClick={() => void send(s)} className="min-h-10 rounded-full border border-white/30 bg-white/10 px-3 text-sm font-semibold">
                    {s}
                  </button>
                ))}
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div className="flex flex-col items-center gap-3 px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-3">
            {(listening || speech.status === "transcribing") && text && <p className="max-w-sm text-center text-white/80">“{text}”</p>}
            <button
              type="button"
              onClick={() => {
                if (speaker.speaking) speaker.stop();
                else if (listening) speech.stop();
                else speech.start("");
              }}
              disabled={thinking || speech.status === "transcribing"}
              aria-label={listening ? t("stop") : t("speak")}
              className="relative grid size-28 place-items-center"
            >
              <span
                className={cn("absolute inset-0 rounded-full transition-transform duration-100", state === "speaking" ? "animate-ping bg-sun/30" : "bg-white/10")}
                style={listening ? { transform: `scale(${0.8 + speech.level * 0.6})`, background: "rgb(255 194 75 / 0.25)" } : undefined}
                aria-hidden
              />
              <span
                className={cn(
                  "relative grid size-24 place-items-center rounded-full shadow-lift transition-all",
                  state === "listening" ? "bg-gradient-to-br from-sun to-coral" : state === "speaking" ? "bg-gradient-to-br from-sage to-sky" : "bg-gradient-to-br from-coral to-berry",
                  state === "idle" && "animate-breathe",
                )}
              >
                {state === "thinking" || state === "hearing" ? <Loader2 className="size-10 animate-spin" aria-hidden />
                  : state === "speaking" ? <AudioLines className="size-10" aria-hidden />
                  : listening ? <Square className="size-9 fill-white" aria-hidden />
                  : <Mic className="size-11" aria-hidden />}
              </span>
            </button>
            <p className="text-sm font-semibold text-white/80" aria-live="polite">{t(`state.${state}`)}</p>
          </div>
        </div>
      )}
    </>
  );
}
