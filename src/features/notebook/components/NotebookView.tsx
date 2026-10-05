"use client";
// Idea Notebook: drop a thought by voice or text in one tap; "Shape my thoughts" groups them,
// and any note or suggested action becomes a task.
import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ListPlus, Loader2, Send, Sparkles, Trash2, Wand2 } from "lucide-react";
import { Button, Celebrate, cn } from "@/components/ui";
import type { Lang } from "@/contracts/profile";
import { useSpeech } from "@/features/intake/hooks/useSpeech";
import { MicButton, SpeechErrorNote } from "@/features/intake/components/MicButton";
import { addNote, deleteNote, noteToTask, shapeMyThoughts, type Notebook } from "../actions";

/** "8 minutes ago" / "8 मिनट पहले" / "८ मिनिटांपूर्वी", using the browser's own translations. */
function timeAgo(iso: string, lang: Lang): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  const f = new Intl.RelativeTimeFormat(`${lang}-IN`, { numeric: "auto" });
  if (mins < 60) return f.format(-mins, "minute");
  if (mins < 60 * 24) return f.format(-Math.round(mins / 60), "hour");
  return f.format(-Math.round(mins / 1440), "day");
}

const NOTE_COLORS = ["bg-sun-light", "bg-berry-light", "bg-sky-light", "bg-sage-light", "bg-mint"];
const GROUP_STYLE: Record<string, string> = {
  customers: "bg-sky-light text-sky",
  product: "bg-sun-light text-[#8a5a00]",
  money: "bg-sage-light text-sage",
  worries: "bg-berry-light text-berry",
  ideas: "bg-mint text-coral-600",
};
const GROUP_EMOJI: Record<string, string> = { customers: "🙋", product: "🧁", money: "💰", worries: "💭", ideas: "💡" };

export function NotebookView({ planId, initial }: { planId: string; initial: Notebook }) {
  const t = useTranslations("notebook");
  const lang = useLocale() as Lang;
  const [nb, setNb] = useState(initial);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [fire, setFire] = useState(0);
  const [saving, startSave] = useTransition();
  const [shaping, startShape] = useTransition();
  const speech = useSpeech(lang, setDraft);
  const listening = speech.status === "listening" || speech.status === "recording";

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    speech.stop();
    setDraft("");
    startSave(async () => setNb(await addNote(planId, text)));
  };

  const toTask = (text: string) => {
    setAdded((s) => new Set(s).add(text));
    setFire((n) => n + 1);
    startSave(() => noteToTask(planId, text));
  };

  const byId = new Map(nb.notes.map((n) => [n.id, n]));

  return (
    <div className="space-y-5">
      <Celebrate fire={fire} message={t("addedToTasks")} />

      <section className="space-y-2 rounded-3xl border-2 border-dashed border-coral/30 bg-white p-3 shadow-soft">
        <div className="flex items-start gap-2">
          <MicButton size="sm" status={speech.status} level={speech.level} onStart={() => speech.start(draft)} onStop={speech.stop} />
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            rows={2}
            maxLength={600}
            placeholder={t("placeholder")}
            className="min-h-11 flex-1 resize-none bg-transparent p-2 text-base focus:outline-none"
          />
          <Button size="sm" onClick={submit} disabled={!draft.trim() || listening || saving} aria-label={t("add")}>
            <Send className="size-5" aria-hidden />
          </Button>
        </div>
        <SpeechErrorNote error={speech.error} />
      </section>

      {nb.notes.length >= 2 && (
        <Button
          block
          size="lg"
          variant="dark"
          disabled={shaping}
          onClick={() =>
            startShape(async () => {
              setError(null);
              const r = await shapeMyThoughts(planId);
              if (r.ok) setNb(r.notebook);
              else setError(t(`errors.${r.error}`));
            })
          }
        >
          {shaping ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Wand2 className="size-5" aria-hidden />}
          {shaping ? t("shaping") : t("shape")}
        </Button>
      )}
      {error && <p role="alert" className="rounded-2xl bg-danger/10 p-3 text-sm text-danger">{error}</p>}

      {nb.shaped && (
        <section className="animate-rise space-y-3 rounded-[2rem] bg-gradient-to-br from-sun/30 via-mint to-berry-light p-4">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-coral-600">
            <Sparkles className="size-4" aria-hidden />
            {t("shapedTitle")}
          </p>
          <p className="font-display text-lg font-bold leading-snug text-forest">{nb.shaped.summary}</p>
          <div className="space-y-2">
            {nb.shaped.groups.map((g) => (
              <div key={g.key} className="rounded-2xl bg-white/80 p-3">
                <p className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold", GROUP_STYLE[g.key])}>
                  {GROUP_EMOJI[g.key]} {t(`groups.${g.key}`)} · {g.noteIds.length}
                </p>
                <p className="mt-1 text-sm font-semibold text-forest">{g.insight}</p>
                <ul className="mt-1 space-y-0.5">
                  {g.noteIds.map((id) => byId.get(id) && <li key={id} className="truncate text-xs text-muted">“{byId.get(id)!.text}”</li>)}
                </ul>
              </div>
            ))}
          </div>
          {nb.shaped.actions.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-bold text-forest">{t("nextActions")}</p>
              {nb.shaped.actions.map((a) => (
                <button
                  key={a}
                  type="button"
                  disabled={added.has(a)}
                  onClick={() => toTask(a)}
                  className="flex min-h-12 w-full items-center gap-2 rounded-2xl bg-white px-3 text-left text-sm font-semibold text-forest shadow-soft disabled:text-sage"
                >
                  <ListPlus className="size-4 shrink-0 text-coral" aria-hidden />
                  <span className="flex-1">{a}</span>
                  <span className="text-xs text-muted">{added.has(a) ? t("added") : t("makeTask")}</span>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {nb.notes.length === 0 ? (
        <div className="rounded-3xl bg-white/70 p-6 text-center">
          <p className="text-4xl" aria-hidden>📝</p>
          <p className="mt-2 font-display text-lg font-bold text-forest">{t("emptyTitle")}</p>
          <p className="text-sm text-muted">{t("emptyBody")}</p>
        </div>
      ) : (
        <ul className="columns-2 gap-2 [&>li]:mb-2">
          {nb.notes.map((n, i) => (
            <li key={n.id} className={cn("group break-inside-avoid rounded-2xl p-3 shadow-soft", NOTE_COLORS[i % NOTE_COLORS.length], i % 3 === 1 ? "-rotate-1" : i % 3 === 2 ? "rotate-1" : "")}>
              <p className="whitespace-pre-wrap text-sm text-ink">{n.text}</p>
              <div className="mt-2 flex items-center justify-between gap-1">
                <span className="text-[10px] text-muted">{timeAgo(n.createdAt, lang)}</span>
                <span className="flex">
                  <button type="button" aria-label={t("makeTask")} disabled={added.has(n.text)} onClick={() => toTask(n.text)} className="grid size-8 place-items-center rounded-full text-forest/60 hover:bg-white/70 disabled:text-sage">
                    <ListPlus className="size-4" aria-hidden />
                  </button>
                  <button type="button" aria-label={t("delete")} onClick={() => startSave(async () => setNb(await deleteNote(planId, n.id)))} className="grid size-8 place-items-center rounded-full text-forest/60 hover:bg-white/70 hover:text-danger">
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
