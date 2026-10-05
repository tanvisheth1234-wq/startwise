"use client";
// Order book: say or type an order; see what's due today and tomorrow; move it along
// new → baking → ready → delivered; mark paid; message the customer on WhatsApp.
import { useMemo, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CalendarPlus, Check, IndianRupee, Loader2, MessageCircle, Plus, Trash2, Wand2 } from "lucide-react";
import { Button, Celebrate, cn } from "@/components/ui";
import type { Lang } from "@/contracts/profile";
import { useSpeech } from "@/features/intake/hooks/useSpeech";
import { MicButton } from "@/features/intake/components/MicButton";
import { googleCalendarUrl } from "@/features/marketing/lib/calendar";
import { addOrder, deleteOrder, parseSpokenOrder, updateOrder, type Order, type OrderBook, type OrderStatus } from "../actions";

const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
const FLOW: OrderStatus[] = ["new", "baking", "ready", "delivered"];
const STATUS_STYLE: Record<OrderStatus, string> = {
  new: "bg-sky-light text-sky", baking: "bg-sun-light text-[#8a5a00]", ready: "bg-berry-light text-berry", delivered: "bg-sage-light text-sage",
};

type Draft = { customer: string; item: string; quantity: number; amountInr: number; advanceInr: number; dueDate: string; dueTime: string | null };

export function OrderBookView({ planId, initial, today, item }: { planId: string; initial: OrderBook; today: string; item: string | null }) {
  const t = useTranslations("orders");
  const tc = useTranslations("common");
  const lang = useLocale() as Lang;
  const [book, setBook] = useState(initial);
  const [spoken, setSpoken] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [showDone, setShowDone] = useState(false);
  const [fire, setFire] = useState(0);
  const [pending, start] = useTransition();
  const speech = useSpeech(lang, setSpoken);
  const tomorrow = useMemo(() => {
    const d = new Date(`${today}T12:00:00`);
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }, [today]);

  const open = book.orders.filter((o) => o.status !== "delivered" || !o.paid).sort((a, b) => (a.dueDate + (a.dueTime ?? "")).localeCompare(b.dueDate + (b.dueTime ?? "")));
  const done = book.orders.filter((o) => o.status === "delivered" && o.paid);
  const dueToday = open.filter((o) => o.dueDate <= today && o.status !== "delivered").length;
  const dueTomorrow = open.filter((o) => o.dueDate === tomorrow).length;
  const toCollect = open.reduce((s, o) => s + (o.paid ? 0 : Math.max(0, o.amountInr - o.advanceInr)), 0);

  const fromVoice = () =>
    start(async () => {
      const r = await parseSpokenOrder(planId, spoken);
      if (r.ok) setDraft(r.order);
    });

  const save = () => {
    if (!draft || !draft.customer.trim() || !draft.item.trim()) return;
    const d = draft;
    setDraft(null);
    setSpoken("");
    start(async () => setBook(await addOrder(planId, { ...d, note: "" })));
  };

  const move = (o: Order) => {
    const next = FLOW[Math.min(FLOW.length - 1, FLOW.indexOf(o.status) + 1)];
    if (next === "delivered" && o.paid) setFire((n) => n + 1);
    start(async () => setBook(await updateOrder(planId, o.id, { status: next })));
  };
  const togglePaid = (o: Order) => {
    if (!o.paid && o.status === "delivered") setFire((n) => n + 1);
    start(async () => setBook(await updateOrder(planId, o.id, { paid: !o.paid })));
  };

  const whatsapp = (o: Order) => {
    const due = Math.max(0, o.amountInr - o.advanceInr);
    const msg = o.status === "ready" || o.status === "delivered"
      ? t("msgReady", { name: o.customer, item: o.item, amount: inr(due) })
      : t("msgConfirm", { name: o.customer, qty: o.quantity, item: o.item, date: o.dueDate, amount: inr(o.amountInr) });
    return `https://wa.me/?text=${encodeURIComponent(msg)}`;
  };

  const input = "min-h-11 w-full rounded-2xl border-2 border-line bg-white px-3 focus:border-coral/60 focus:outline-none";

  return (
    <div className="space-y-5">
      <Celebrate fire={fire} message={t("yay")} />

      <section className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-3xl bg-coral p-3 text-white shadow-lift"><p className="font-display text-3xl font-extrabold">{dueToday}</p><p className="text-xs font-semibold">{t("dueToday")}</p></div>
        <div className="rounded-3xl bg-white p-3 shadow-soft"><p className="font-display text-3xl font-extrabold text-forest">{dueTomorrow}</p><p className="text-xs font-semibold text-muted">{t("dueTomorrow")}</p></div>
        <div className="rounded-3xl bg-white p-3 shadow-soft"><p className="font-display text-2xl font-extrabold text-berry">{inr(toCollect)}</p><p className="text-xs font-semibold text-muted">{t("toCollect")}</p></div>
      </section>

      {!draft ? (
        <section className="space-y-2 rounded-3xl border-2 border-dashed border-coral/30 bg-white p-3 shadow-soft">
          <p className="text-sm font-bold text-forest">{t("newOrder")}</p>
          <div className="flex items-start gap-2">
            <MicButton size="sm" status={speech.status} level={speech.level} onStart={() => speech.start(spoken)} onStop={speech.stop} />
            <textarea value={spoken} onChange={(e) => setSpoken(e.target.value)} rows={2} placeholder={t("placeholder", { item: item ?? tc("items") })} className="min-h-11 flex-1 resize-none p-2 focus:outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button size="sm" onClick={fromVoice} disabled={!spoken.trim() || pending}>
              {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Wand2 className="size-4" aria-hidden />}
              {t("fill")}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setDraft({ customer: "", item: "", quantity: 1, amountInr: 0, advanceInr: 0, dueDate: tomorrow, dueTime: null })}>
              <Plus className="size-4" aria-hidden />
              {t("manual")}
            </Button>
          </div>
        </section>
      ) : (
        <section className="animate-pop space-y-2 rounded-3xl bg-white p-4 shadow-lift">
          <p className="text-sm font-bold text-forest">{t("check")}</p>
          <input className={input} value={draft.customer} onChange={(e) => setDraft({ ...draft, customer: e.target.value })} placeholder={t("customer")} aria-label={t("customer")} />
          <div className="grid grid-cols-[4rem_1fr] gap-2">
            <input className={input} inputMode="numeric" value={draft.quantity} onChange={(e) => setDraft({ ...draft, quantity: Number(e.target.value.replace(/\D/g, "")) || 1 })} aria-label={t("qty")} />
            <input className={input} value={draft.item} onChange={(e) => setDraft({ ...draft, item: e.target.value })} placeholder={t("item")} aria-label={t("item")} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs font-semibold text-muted">{t("amount")}<input className={input} inputMode="numeric" value={draft.amountInr} onChange={(e) => setDraft({ ...draft, amountInr: Number(e.target.value.replace(/\D/g, "")) || 0 })} /></label>
            <label className="text-xs font-semibold text-muted">{t("advance")}<input className={input} inputMode="numeric" value={draft.advanceInr} onChange={(e) => setDraft({ ...draft, advanceInr: Number(e.target.value.replace(/\D/g, "")) || 0 })} /></label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs font-semibold text-muted">{t("date")}<input type="date" className={input} value={draft.dueDate} onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })} /></label>
            <label className="text-xs font-semibold text-muted">{t("time")}<input type="time" className={input} value={draft.dueTime ?? ""} onChange={(e) => setDraft({ ...draft, dueTime: e.target.value || null })} /></label>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Button variant="secondary" onClick={() => setDraft(null)}>{t("cancel")}</Button>
            <Button onClick={save} disabled={!draft.customer.trim() || !draft.item.trim()}>
              <Check className="size-5" aria-hidden />
              {t("save")}
            </Button>
          </div>
        </section>
      )}

      {open.length === 0 ? (
        <p className="rounded-3xl bg-white/70 p-6 text-center text-muted">{t("empty")}</p>
      ) : (
        <ul className="stagger space-y-3">
          {open.map((o) => {
            const late = o.dueDate < today && o.status !== "delivered";
            const due = Math.max(0, o.amountInr - o.advanceInr);
            const cal = googleCalendarUrl(`🎂 ${o.quantity} × ${o.item} · ${o.customer}`, `${inr(o.amountInr)} · ${t("advance")}: ${inr(o.advanceInr)}`, `${o.dueDate.replaceAll("-", "")}T${(o.dueTime ?? "10:00").replace(":", "")}00`, 30);
            return (
              <li key={o.id} className={cn("space-y-3 rounded-3xl border bg-white p-4 shadow-soft", late ? "border-danger/40" : "border-line/70")}>
                <div className="flex items-start gap-3">
                  <div className={cn("grid size-14 shrink-0 place-items-center rounded-2xl text-center", o.dueDate <= today ? "bg-coral text-white" : "bg-mint text-forest")}>
                    <span className="leading-tight">
                      <span className="block text-[10px] font-bold uppercase">{o.dueDate === today ? t("today") : o.dueDate === tomorrow ? t("tomorrow") : new Intl.DateTimeFormat(`${lang}-IN`, { day: "numeric", month: "short" }).format(new Date(`${o.dueDate}T12:00:00`))}</span>
                      <span className="block font-display text-sm font-extrabold">{o.dueTime ?? "—"}</span>
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-lg font-bold leading-snug text-forest">{o.quantity} × {o.item}</p>
                    <p className="text-sm text-muted">{o.customer}{late ? ` · ${t("late")}` : ""}</p>
                  </div>
                  <button type="button" aria-label={t("delete")} onClick={() => start(async () => setBook(await deleteOrder(planId, o.id)))} className="grid size-9 place-items-center rounded-full text-muted hover:text-danger">
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" onClick={() => move(o)} disabled={o.status === "delivered"} className={cn("min-h-10 rounded-full px-4 text-sm font-bold", STATUS_STYLE[o.status])}>
                    {t(`status.${o.status}`)}{o.status !== "delivered" ? " →" : " ✓"}
                  </button>
                  <button type="button" onClick={() => togglePaid(o)} className={cn("flex min-h-10 items-center gap-1 rounded-full border-2 px-3 text-sm font-bold", o.paid ? "border-sage bg-sage text-white" : "border-berry/40 text-berry")}>
                    <IndianRupee className="size-4" aria-hidden />
                    {o.paid ? t("paid") : t("pending", { amount: inr(due) })}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <a href={whatsapp(o)} target="_blank" rel="noopener noreferrer" className="flex min-h-10 items-center justify-center gap-1 rounded-2xl bg-sage text-sm font-semibold text-white">
                    <MessageCircle className="size-4" aria-hidden />
                    {o.status === "ready" ? t("tellReady") : t("confirm")}
                  </a>
                  <a href={cal} target="_blank" rel="noopener noreferrer" className="flex min-h-10 items-center justify-center gap-1 rounded-2xl bg-forest text-sm font-semibold text-white">
                    <CalendarPlus className="size-4" aria-hidden />
                    {t("remind")}
                  </a>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {done.length > 0 && (
        <section className="space-y-2">
          <button type="button" onClick={() => setShowDone((s) => !s)} className="text-sm font-bold text-sage">
            {t("completed", { count: done.length, amount: inr(done.reduce((s, o) => s + o.amountInr, 0)) })}
          </button>
          {showDone && (
            <ul className="space-y-1.5">
              {done.map((o) => (
                <li key={o.id} className="flex items-center justify-between rounded-2xl bg-sage-light/60 px-3 py-2 text-sm">
                  <span>{o.quantity} × {o.item} · {o.customer}</span>
                  <span className="font-bold text-sage">{inr(o.amountInr)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
