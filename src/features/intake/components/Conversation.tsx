"use client";
// The first conversation, WhatsApp-style: name → speak or text? → her idea → a warm back-and-forth.
// When enough is known she can make her plan, or keep talking as long as she likes.
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { BookHeart, Loader2, Mic, Send, Sparkles, Square, Volume2, VolumeX } from "lucide-react";
import { motion } from "motion/react";
import { Logo, cn } from "@/components/ui";
import type { Lang } from "@/contracts/profile";
import { useSpeaker } from "@/features/talk/hooks/useSpeaker";
import { useSpeech } from "../hooks/useSpeech";
import { PUNE_AREAS } from "../lib/quickReplies";
import { continueConversation, finishConversation, startConversation, type Asking, type ConversationState, type Known } from "../conversation";
import { TakingShape } from "./TakingShape";
import type { ChatMessage } from "../server/chat";

type Step = "name" | "voice" | "idea" | "chat";

export function Conversation({ initial, knownName }: { initial: { state: ConversationState; name: string; voice: "speak" | "text" | null } | null; knownName?: string }) {
  const t = useTranslations("chat");
  const ti = useTranslations("intake");
  const lang = useLocale() as Lang;
  const router = useRouter();
  // Logged in with Google: we already know her name, so start at "speak or text?".
  const [step, setStep] = useState<Step>(initial ? "chat" : knownName ? "voice" : "name");
  const [name, setName] = useState(initial?.name ?? knownName ?? "");
  const [voice, setVoice] = useState<"speak" | "text">(initial?.voice ?? "text");
  const [messages, setMessages] = useState<ChatMessage[]>(initial?.state.messages ?? [{ role: "bot", text: knownName ? t("askVoice", { name: knownName }) : t("askName") }]);
  const [planId, setPlanId] = useState<string | null>(initial?.state.planId ?? null);
  const [ready, setReady] = useState(initial?.state.ready ?? false);
  const [asking, setAsking] = useState<Asking>(initial?.state.asking ?? null);
  const [city, setCity] = useState(initial?.state.city ?? "");
  const [known, setKnown] = useState<Known | null>(initial?.state.known ?? null);
  const [notesSaved, setNotesSaved] = useState(0);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [building, setBuilding] = useState(false);
  const speech = useSpeech(lang, setText);
  const speaker = useSpeaker(lang);
  const endRef = useRef<HTMLDivElement>(null);
  const lastSent = useRef({ text: "", at: 0 });
  const listening = speech.status === "listening" || speech.status === "recording";
  const last = messages[messages.length - 1];
  const lastSaid = (step === "idea" || step === "chat") && last?.role === "user" ? last.text : "";

  const bot = useCallback(async (reply: string, speakIt: boolean) => {
    setMessages((m) => [...m, { role: "bot", text: reply }]);
    if (speakIt) await speaker.speak(reply);
  }, [speaker]);

  // again: resend her last message after a failed reply, without adding it to the chat twice.
  const send = useCallback(async (raw: string, again = false) => {
    const said = raw.trim();
    if (!said || busy) return;
    // Safety net: never send the same words twice within a few seconds (double taps, voice + typing).
    if (!again && lastSent.current.text === said && Date.now() - lastSent.current.at < 8000) return;
    lastSent.current = { text: said, at: Date.now() };
    setText("");
    setError(false);
    speaker.stop();

    if (step === "name") {
      const n = said.split(/\s+/).slice(0, 3).join(" ");
      setName(n);
      setMessages((m) => [...m, { role: "user", text: said }, { role: "bot", text: t("askVoice", { name: n }) }]);
      setStep("voice");
      return;
    }
    if (step === "voice") return; // answered with the two buttons
    if (step === "idea" || step === "chat") {
      const intro = again ? messages.slice(0, -1) : messages;
      if (!again) setMessages((m) => [...m, { role: "user", text: said }]);
      setBusy(true);
      const r = planId ? await continueConversation(planId, said) : await startConversation(name, voice, intro, said);
      setBusy(false);
      if (!r.ok) {
        setError(true);
        return;
      }
      if (!planId) {
        setPlanId(r.state.planId);
        // Keep the plan in the address so a refresh resumes the chat, without reloading.
        window.history.replaceState(null, "", `/new?plan=${r.state.planId}`);
      }
      setStep("chat");
      setReady(r.state.ready);
      setAsking(r.state.asking);
      setCity(r.state.city);
      setKnown(r.state.known);
      if (r.state.savedNotes) setNotesSaved((n) => n + r.state.savedNotes);
      await bot(r.state.messages[r.state.messages.length - 1].text, voice === "speak");
    }
  }, [busy, step, t, messages, planId, name, voice, bot, speaker]);

  const chooseVoice = async (v: "speak" | "text") => {
    setVoice(v);
    setMessages((m) => [...m, { role: "user", text: v === "speak" ? t("voiceSpeak") : t("voiceText") }]);
    setStep("idea");
    await bot(t("askIdea", { name }), v === "speak");
  };

  // Speaking: send automatically when she stops talking.
  const prev = useRef(speech.status);
  useEffect(() => {
    const was = prev.current;
    prev.current = speech.status;
    if (was !== "idle" && speech.status === "idle" && text.trim()) void send(text);
  }, [speech.status, text, send]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, busy, ready]);

  const makePlan = async () => {
    if (!planId) return;
    setBuilding(true);
    speaker.stop();
    const { guest } = await finishConversation(planId);
    const next = `/plan/${planId}/profile`;
    router.push(guest ? `/login?mode=save&next=${encodeURIComponent(next)}` : next);
  };

  const chips: string[] =
    step === "chat" && asking === "premises" ? [ti("chips.home"), ti("chips.shop")]
    : step === "chat" && asking === "budgetInr" ? [ti("chips.b10k"), ti("chips.b25k"), ti("chips.b50k"), ti("chips.b1l"), t("notSure")]
    : step === "chat" && asking === "locality" && /pune|pimpri/i.test(city) ? PUNE_AREAS.slice(0, 6)
    : [];

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-10">
    <div className="flex min-h-[calc(100dvh-4.5rem)] min-w-0 flex-col">
      <div className="flex items-center justify-between py-2">
        <p className="font-display text-lg font-bold text-forest">{name ? t("titleNamed", { name }) : t("title")}</p>
        {step !== "name" && step !== "voice" && (
          <button
            type="button"
            onClick={() => {
              const v = voice === "speak" ? "text" : "speak";
              setVoice(v);
              if (v === "text") speaker.stop();
            }}
            aria-pressed={voice === "speak"}
            aria-label={voice === "speak" ? t("voiceOff") : t("voiceOn")}
            className={cn("flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold", voice === "speak" ? "bg-coral text-white" : "bg-white text-muted shadow-soft")}
          >
            {voice === "speak" ? <Volume2 className="size-4" aria-hidden /> : <VolumeX className="size-4" aria-hidden />}
            {voice === "speak" ? t("speaking") : t("silent")}
          </button>
        )}
      </div>

      <ol className="flex-1 space-y-3 pb-4" aria-live="polite">
        {messages.map((m, i) => (
          <motion.li
            key={i}
            initial={{ opacity: 0, y: 12, x: m.role === "user" ? 16 : -16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            className={cn("flex items-end gap-2", m.role === "user" ? "justify-end" : "justify-start")}
          >
            {m.role === "bot" && <Logo className="size-8" />}
            <p className={cn("max-w-[82%] whitespace-pre-wrap rounded-3xl px-4 py-3 text-[1.05rem] leading-relaxed shadow-soft", m.role === "user" ? "rounded-br-md bg-gradient-to-br from-coral to-coral-600 text-white" : "rounded-bl-md border border-line/70 bg-white text-ink")}>
              {m.text}
            </p>
          </motion.li>
        ))}
        {busy && (
          <motion.li initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex items-end gap-2">
            <Logo className="size-8" />
            <p className="flex items-center gap-1 rounded-3xl rounded-bl-md border border-line/70 bg-white px-4 py-4" aria-label={t("typing")}>
              {[0, 1, 2].map((d) => <span key={d} className="size-2 animate-bounce rounded-full bg-coral/70" style={{ animationDelay: `${d * 150}ms` }} />)}
            </p>
          </motion.li>
        )}
        {error && (
          <li className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-sun-light p-3 text-sm">
            <span>{lastSaid ? t("errorRetry") : t("error")}</span>
            {lastSaid && (
              <button type="button" onClick={() => void send(lastSaid, true)} className="min-h-10 rounded-full bg-coral px-4 font-semibold text-white">
                {t("tryAgain")}
              </button>
            )}
          </li>
        )}
        {notesSaved > 0 && (
          <li className="flex justify-center">
            <span className="flex items-center gap-1.5 rounded-full bg-sun-light px-3 py-1 text-xs font-semibold text-[#8a5a00]">
              <BookHeart className="size-3.5" aria-hidden />
              {t("notesSaved", { count: notesSaved })}
            </span>
          </li>
        )}
      </ol>

      {step === "voice" && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="grid grid-cols-2 gap-2 pb-4">
          <button type="button" onClick={() => void chooseVoice("speak")} className="flex min-h-16 flex-col items-center justify-center rounded-3xl bg-white font-display text-lg font-bold text-forest shadow-soft hover:bg-mint">
            <Volume2 className="size-6 text-coral" aria-hidden />
            {t("voiceSpeak")}
          </button>
          <button type="button" onClick={() => void chooseVoice("text")} className="flex min-h-16 flex-col items-center justify-center rounded-3xl bg-white font-display text-lg font-bold text-forest shadow-soft hover:bg-mint">
            <VolumeX className="size-6 text-muted" aria-hidden />
            {t("voiceText")}
          </button>
        </motion.div>
      )}

      {ready && step === "chat" && !busy && (
        <motion.div initial={{ opacity: 0, scale: 0.9, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: "spring", stiffness: 240, damping: 18 }} className="space-y-2 pb-3 lg:hidden">
          <motion.button
            type="button"
            onClick={makePlan}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            animate={building ? undefined : { boxShadow: ["0 8px 24px -8px rgba(236,106,60,0.45)", "0 10px 34px -6px rgba(236,106,60,0.75)", "0 8px 24px -8px rgba(236,106,60,0.45)"] }}
            transition={{ boxShadow: { duration: 2.4, repeat: Infinity, ease: "easeInOut" } }}
            disabled={building}
            className="flex min-h-16 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-br from-coral to-coral-600 font-display text-xl font-bold text-white shadow-lift disabled:opacity-70"
          >
            {building ? <Loader2 className="size-6 animate-spin" aria-hidden /> : <Sparkles className="size-6" aria-hidden />}
            {t("makePlan")}
          </motion.button>
          <p className="text-center text-xs text-muted">{t("orKeepTalking")}</p>
        </motion.div>
      )}

      {step !== "voice" && (
        <div className="sticky bottom-0 space-y-2 bg-gradient-to-t from-cream via-cream to-cream/0 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3">
          {chips.length > 0 && !busy && (
            <div className="flex flex-wrap gap-2">
              {chips.map((c) => (
                <button key={c} type="button" onClick={() => void send(c)} className="min-h-11 animate-pop rounded-full border-2 border-coral/30 bg-white px-4 text-sm font-semibold text-coral-600 shadow-soft hover:border-coral">
                  {c}
                </button>
              ))}
            </div>
          )}
          <form
            className="flex items-center gap-2 rounded-full border-2 border-line bg-white p-1.5 shadow-soft transition-shadow focus-within:border-coral/60 focus-within:shadow-[0_0_0_4px_rgb(236_106_60/0.15)]"
            onSubmit={(e) => {
              e.preventDefault();
              void send(text);
            }}
          >
            {step !== "name" && (
              <button
                type="button"
                onClick={() => (listening ? speech.stop() : (speaker.stop(), speech.start(text)))}
                disabled={busy || speech.status === "transcribing"}
                aria-label={listening ? ti("voice.stop") : ti("voice.start")}
                className={cn("grid size-11 shrink-0 place-items-center rounded-full text-white", listening ? "bg-gradient-to-br from-berry to-coral-600" : "bg-gradient-to-br from-sun to-coral")}
              >
                {speech.status === "transcribing" ? <Loader2 className="size-5 animate-spin" aria-hidden /> : listening ? <Square className="size-4 fill-white" aria-hidden /> : <Mic className="size-5" aria-hidden />}
              </button>
            )}
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={step === "name" ? 40 : 1000}
              autoFocus={step === "name"}
              placeholder={listening ? t("listening") : step === "name" ? t("namePlaceholder") : t("placeholder")}
              aria-label={t("placeholder")}
              className="min-h-11 min-w-0 flex-1 bg-transparent px-2 text-base focus:outline-none"
            />
            <button type="submit" disabled={!text.trim() || busy} aria-label={t("send")} className="grid size-11 shrink-0 place-items-center rounded-full bg-forest text-white disabled:opacity-30">
              <Send className="size-5" aria-hidden />
            </button>
          </form>
        </div>
      )}
      <div ref={endRef} />
    </div>
    <div className="hidden lg:block">
      <TakingShape known={known} ready={ready && step === "chat"} building={building} onMake={makePlan} makeLabel={t("makePlan")} />
    </div>
    </div>
  );
}
