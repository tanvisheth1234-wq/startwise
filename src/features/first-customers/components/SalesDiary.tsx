"use client";
// Voice sales diary: "Sold 2 cakes to Priya for 900" → logged, totals update, first sale celebrated.
// Plus a little customer list: who asked, who ordered, who to follow up with.
import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Loader2, MessageCircle, Plus, Send, Trash2, UserRound } from "lucide-react";
import { Button, Celebrate, cn } from "@/components/ui";
import type { Lang } from "@/contracts/profile";
import { useSpeech } from "@/features/intake/hooks/useSpeech";
import { MicButton, SpeechErrorNote } from "@/features/intake/components/MicButton";
import { addDiaryLine, deleteCustomer, deleteDiaryEntry, saveCustomer, type CustomerStatus, type Diary } from "../actions";

const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
const KIND_STYLE = { sale: "bg-sage-light text-sage", expense: "bg-berry-light text-berry", enquiry: "bg-sky-light text-sky", unclear: "bg-[#f3ece6] text-muted" };
const STATUS_STYLE: Record<CustomerStatus, string> = { asked: "bg-sky-light text-sky", ordered: "bg-sage-light text-sage", follow_up: "bg-sun-light text-[#8a5a00]" };

export function SalesDiary({ planId, initial, item }: { planId: string; initial: Diary; item: string | null }) {
  const t = useTranslations("firstCustomers.diary");
  const tc = useTranslations("common");
  const word = item ?? tc("items");
  const lang = useLocale() as Lang;
  const [d, setD] = useState(initial);
  const [text, setText] = useState("");
  const [newName, setNewName] = useState("");
  const [fire, setFire] = useState(0);
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  const speech = useSpeech(lang, setText);

  const month = new Date().toISOString().slice(0, 7);
  const thisMonth = d.entries.filter((e) => e.date.startsWith(month));
  const sales = thisMonth.filter((e) => e.kind === "sale").reduce((s, e) => s + (e.amountInr ?? 0), 0);
  const spent = thisMonth.filter((e) => e.kind === "expense").reduce((s, e) => s + (e.amountInr ?? 0), 0);
  const orders = thisMonth.filter((e) => e.kind === "sale").length;

  const submit = () => {
    const line = text.trim();
    if (!line) return;
    speech.stop();
    start(async () => {
      const r = await addDiaryLine(planId, line);
      if (r.ok) {
        setD(r.diary);
        setText("");
        if (r.firstSale) {
          setMsg(t("firstSale"));
          setFire((n) => n + 1);
        } else if (r.entry.kind === "sale") {
          setMsg(t("sale"));
          setFire((n) => n + 1);
        }
      }
    });
  };

  const cycle = (s: CustomerStatus): CustomerStatus => (s === "asked" ? "follow_up" : s === "follow_up" ? "ordered" : "asked");

  return (
    <div className="space-y-5">
      <Celebrate fire={fire} message={msg} />

      <section className="space-y-3 rounded-[2rem] border border-line/70 bg-white p-4 shadow-soft">
        <h2 className="font-display text-xl font-bold text-forest">{t("title")}</h2>
        <p className="text-sm text-muted">{t("subtitle", { item: word })}</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-2xl bg-sage-light p-2"><p className="text-[11px] font-semibold text-sage">{t("salesMonth")}</p><p className="font-display text-lg font-extrabold text-forest">{inr(sales)}</p></div>
          <div className="rounded-2xl bg-mint p-2"><p className="text-[11px] font-semibold text-coral-600">{t("orders")}</p><p className="font-display text-lg font-extrabold text-forest">{orders}</p></div>
          <div className="rounded-2xl bg-berry-light p-2"><p className="text-[11px] font-semibold text-berry">{t("spent")}</p><p className="font-display text-lg font-extrabold text-forest">{inr(spent)}</p></div>
        </div>
        <div className="flex items-start gap-2 rounded-3xl border-2 border-dashed border-coral/30 p-2">
          <MicButton size="sm" status={speech.status} level={speech.level} onStart={() => speech.start(text)} onStop={speech.stop} />
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            rows={2}
            maxLength={400}
            placeholder={t("placeholder", { item: word })}
            className="min-h-11 flex-1 resize-none p-2 text-base focus:outline-none"
          />
          <Button size="sm" onClick={submit} disabled={!text.trim() || pending} aria-label={t("add")}>
            {pending ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Send className="size-5" aria-hidden />}
          </Button>
        </div>
        <SpeechErrorNote error={speech.error} />
        {d.entries.length > 0 && (
          <ul className="space-y-1.5">
            {d.entries.slice(0, 8).map((e) => (
              <li key={e.id} className="flex items-center gap-2 rounded-2xl bg-mint/50 px-3 py-2 text-sm">
                <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold", KIND_STYLE[e.kind])}>{t(`kinds.${e.kind}`)}</span>
                <span className="min-w-0 flex-1 truncate">{e.item ?? e.text}{e.customer ? ` · ${e.customer}` : ""}</span>
                {e.amountInr !== null && <span className="font-bold text-forest">{inr(e.amountInr)}</span>}
                <button type="button" aria-label={t("delete")} onClick={() => start(async () => setD(await deleteDiaryEntry(planId, e.id)))} className="grid size-8 place-items-center rounded-full text-muted hover:text-danger">
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3 rounded-[2rem] border border-line/70 bg-white p-4 shadow-soft">
        <h2 className="font-display text-xl font-bold text-forest">{t("customersTitle")}</h2>
        <p className="text-sm text-muted">{t("customersHint")}</p>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const name = newName.trim();
            if (!name) return;
            setNewName("");
            start(async () => setD(await saveCustomer(planId, { name, status: "asked" })));
          }}
        >
          <input value={newName} onChange={(e) => setNewName(e.target.value)} maxLength={40} placeholder={t("namePlaceholder")} className="min-h-11 flex-1 rounded-full border-2 border-line px-4 focus:border-coral/60 focus:outline-none" />
          <Button type="submit" size="sm" variant="secondary" aria-label={t("addCustomer")}>
            <Plus className="size-5" aria-hidden />
          </Button>
        </form>
        {d.customers.length === 0 ? (
          <p className="rounded-2xl bg-mint/50 p-4 text-center text-sm text-muted">{t("noCustomers")}</p>
        ) : (
          <ul className="space-y-2">
            {d.customers.map((c) => (
              <li key={c.id} className="flex items-center gap-2 rounded-2xl border border-line/70 p-2">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-mint text-coral-600"><UserRound className="size-5" aria-hidden /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-forest">{c.name}</span>
                  <span className="block text-[11px] text-muted">{c.lastDate}</span>
                </span>
                <button
                  type="button"
                  onClick={() => start(async () => setD(await saveCustomer(planId, { id: c.id, name: c.name, status: cycle(c.status) })))}
                  className={cn("min-h-9 rounded-full px-3 text-xs font-bold", STATUS_STYLE[c.status])}
                >
                  {t(`status.${c.status}`)}
                </button>
                {c.status === "follow_up" && (
                  <a href={`https://wa.me/?text=${encodeURIComponent(t("followUpMessage", { name: c.name }))}`} target="_blank" rel="noopener noreferrer" aria-label={t("followUp")} className="grid size-9 place-items-center rounded-full bg-sage text-white">
                    <MessageCircle className="size-4" aria-hidden />
                  </a>
                )}
                <button type="button" aria-label={t("delete")} onClick={() => start(async () => setD(await deleteCustomer(planId, c.id)))} className="grid size-9 place-items-center rounded-full text-muted hover:text-danger">
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
