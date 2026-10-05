"use client";
// Beside the chat on a laptop: her business card filling itself in as StartWise understands her.
// Each new fact lands with a little glow, so she can see she is being listened to.
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { Home, Lightbulb, Loader2, MapPin, Sparkles, Store, Users, Wallet, type LucideIcon } from "lucide-react";
import { GrowingPlant, cn, type PlantBranch } from "@/components/ui";
import type { Known } from "../conversation";

const inr = (n: number) => "₹" + n.toLocaleString("en-IN");

export function TakingShape({ known, ready, building, onMake, makeLabel }: { known: Known | null; ready: boolean; building: boolean; onMake: () => void; makeLabel: string }) {
  const t = useTranslations("chat");
  const tr = useTranslations("profile.reveal");
  const tp = useTranslations("profile");
  const k = known;

  const where = k ? [k.locality, k.city].filter(Boolean).join(", ") : "";
  const rows: { key: string; icon: LucideIcon; label: string; value: string | null }[] = [
    { key: "idea", icon: Lightbulb, label: t("shapeIdea"), value: k?.product || null },
    { key: "where", icon: MapPin, label: tr("where"), value: where || null },
    { key: "from", icon: k?.premises === "shop" ? Store : Home, label: tr("worksFrom"), value: k?.premises ? tp(`premises.${k.premises}`) : null },
    { key: "who", icon: Users, label: tr("forWhom"), value: k?.targetCustomer || null },
    { key: "budget", icon: Wallet, label: tr("budget"), value: k?.budgetInr != null ? tr("upTo", { amount: inr(k.budgetInr) }) : null },
  ];
  const done = rows.filter((r) => r.value).length;

  // A tiny plant that grows a leaf for every fact she has shared.
  const leaves: PlantBranch[] = rows.slice(1).map((r) => ({ key: r.key, label: "", state: r.value ? "done" : "todo" }));

  return (
    <aside className="sticky top-24 space-y-4 rounded-[2rem] border border-line/70 bg-white/85 p-5 shadow-soft backdrop-blur" aria-live="polite">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 font-display text-xs font-bold uppercase tracking-widest text-coral-600">
            <Sparkles className="size-3.5" aria-hidden />
            {t("shapeTitle")}
          </p>
          <p className="mt-0.5 text-sm text-muted">{t("shapeSub")}</p>
        </div>
        <GrowingPlant key={done} mode="progress" branches={leaves} bloom={{ key: "bloom", label: "", state: ready ? "done" : "todo" }} className="-my-4 w-24 shrink-0" />
      </div>

      <ul className="space-y-2">
        {rows.map(({ key, icon: Icon, label, value }) => (
          <li key={key} className={cn("relative flex items-center gap-3 overflow-hidden rounded-2xl px-3 py-2.5 transition-colors duration-500", value ? "bg-mint/80" : "border border-dashed border-line bg-white/60")}>
            <Icon className={cn("size-5 shrink-0 transition-colors", value ? "text-coral" : "text-line")} aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-semibold text-muted">{label}</span>
              <AnimatePresence mode="wait" initial={false}>
                {value ? (
                  <motion.span
                    key={value}
                    initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    transition={{ type: "spring", stiffness: 220, damping: 20 }}
                    className="line-clamp-2 block font-semibold leading-snug text-forest first-letter:uppercase"
                  >
                    {value}
                  </motion.span>
                ) : (
                  <motion.span key="waiting" initial={{ opacity: 0 }} animate={{ opacity: [0.35, 0.8, 0.35] }} transition={{ duration: 2, repeat: Infinity }} className="block text-sm text-muted">
                    {t("shapeWaiting")}
                  </motion.span>
                )}
              </AnimatePresence>
            </span>
            {/* a soft sweep of light when a fact lands */}
            {value && (
              <motion.span
                key={`glow-${value}`}
                aria-hidden
                className="pointer-events-none absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-sun/50 to-transparent"
                initial={{ x: "-120%" }}
                animate={{ x: "260%" }}
                transition={{ duration: 1.1, ease: "easeOut" }}
              />
            )}
          </li>
        ))}
      </ul>

      <div className="space-y-1.5">
        <div className="flex justify-between text-xs font-semibold text-muted">
          <span>{t("shapeCount", { done, total: rows.length })}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-mint">
          <motion.div className="h-full rounded-full bg-gradient-to-r from-sun to-coral" initial={false} animate={{ width: `${(done / rows.length) * 100}%` }} transition={{ type: "spring", stiffness: 90, damping: 18 }} />
        </div>
      </div>

      <AnimatePresence>
        {ready && (
          <motion.div initial={{ opacity: 0, y: 12, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }} transition={{ type: "spring", stiffness: 220, damping: 18 }} className="space-y-2">
            <p className="text-sm font-semibold text-sage">{t("shapeReady")}</p>
            <motion.button
              type="button"
              onClick={onMake}
              disabled={building}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-br from-coral to-coral-600 font-display text-lg font-bold text-white shadow-lift disabled:opacity-70"
            >
              {building ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Sparkles className="size-5" aria-hidden />}
              {makeLabel}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  );
}
