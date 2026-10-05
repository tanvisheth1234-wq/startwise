"use client";
// The welcome screen's little phone: a sample conversation that plays itself on a loop,
// so a first-time visitor sees what talking to StartWise feels like before typing anything.
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { MapPin, Mic, Sparkles, Users, Wallet } from "lucide-react";
import { Logo, cn } from "@/components/ui";

type Line = { from: "bot" | "you"; text: string } | { from: "card" };

const SCRIPT: Line[] = [
  { from: "bot", text: "Namaste! What's the idea on your mind?" },
  { from: "you", text: "I make really good mango pickle. Can I sell it?" },
  { from: "bot", text: "Homemade achaar, lovely. Who do you picture buying it first?" },
  { from: "you", text: "Ladies in my building and office people" },
  { from: "bot", text: "Let's test it with 10 people this week, with no big spending. Here's your business." },
  { from: "card" },
];

// How long each kind of line stays before the next one comes (ms).
const PAUSE: Record<Line["from"], number> = { bot: 2300, you: 1600, card: 5200 };

export function LiveChatPreview({ className }: { className?: string }) {
  const [shown, setShown] = useState(0);
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    if (shown >= SCRIPT.length) {
      const reset = setTimeout(() => setShown(0), 2600);
      return () => clearTimeout(reset);
    }
    // Give each line time to be read, then "type" the next bot reply for a moment before it appears.
    const read = shown === 0 ? 600 : PAUSE[SCRIPT[shown - 1].from];
    const botNext = SCRIPT[shown].from === "bot";
    const typingAt = setTimeout(() => setTyping(botNext), Math.max(0, read - 1100));
    const id = setTimeout(() => {
      setTyping(false);
      setShown((n) => n + 1);
    }, read);
    return () => {
      clearTimeout(typingAt);
      clearTimeout(id);
    };
  }, [shown]);

  const visible = SCRIPT.slice(0, shown);
  const nextIsYou = SCRIPT[shown]?.from === "you";

  return (
    <div className={cn("relative mx-auto w-[300px]", className)} aria-hidden>
      {/* soft glow behind the phone */}
      <div className="absolute -inset-10 rounded-full bg-gradient-to-br from-sun/40 via-coral/30 to-berry/30 blur-3xl" />
      <motion.div
        initial={{ opacity: 0, y: 40, rotate: 4 }}
        animate={{ opacity: 1, y: 0, rotate: 2 }}
        transition={{ type: "spring", stiffness: 70, damping: 14, delay: 0.3 }}
        className="relative rounded-[2.6rem] border-[10px] border-forest bg-cream shadow-[0_30px_80px_-20px_rgba(74,44,34,0.55)]"
      >
        <div className="mx-auto mt-2 h-5 w-24 rounded-full bg-forest" />
        <div className="flex items-center gap-2 border-b border-line/70 px-4 pb-2 pt-3">
          <Logo className="size-7" />
          <div className="leading-tight">
            <p className="font-display text-sm font-bold text-forest">StartWise</p>
            <p className="flex items-center gap-1 text-[10px] font-semibold text-sage">
              <span className="size-1.5 animate-pulse rounded-full bg-sage" /> your business saathi
            </p>
          </div>
        </div>
        <div className="flex h-[440px] flex-col justify-end gap-2 overflow-hidden px-3 pb-4">
          <AnimatePresence initial={false}>
            {visible.map((l, i) =>
              l.from === "card" ? (
                <motion.div
                  key={`card-${i}`}
                  layout
                  initial={{ opacity: 0, scale: 0.6, rotateX: 60 }}
                  animate={{ opacity: 1, scale: 1, rotateX: 0 }}
                  transition={{ type: "spring", stiffness: 160, damping: 14 }}
                  className="rounded-2xl bg-gradient-to-br from-sun via-coral to-berry p-[2px] shadow-lift"
                >
                  <div className="space-y-1.5 rounded-[14px] bg-white p-3">
                    <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-coral-600">
                      <Sparkles className="size-3" /> Here&apos;s your business
                    </p>
                    <p className="font-display text-lg font-extrabold leading-none text-forest">Homemade mango achaar</p>
                    {[
                      { icon: Users, t: "Neighbours & office folks" },
                      { icon: MapPin, t: "From home" },
                      { icon: Wallet, t: "Start under ₹3,000" },
                    ].map(({ icon: Icon, t }, k) => (
                      <motion.p
                        key={t}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.35 + k * 0.18 }}
                        className="flex items-center gap-2 rounded-lg bg-mint px-2 py-1 text-xs font-semibold text-forest"
                      >
                        <Icon className="size-3.5 text-coral" /> {t}
                      </motion.p>
                    ))}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key={`${l.from}-${i}`}
                  layout
                  initial={{ opacity: 0, y: 16, x: l.from === "you" ? 20 : -20, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 260, damping: 22 }}
                  className={cn("flex items-end gap-1.5", l.from === "you" ? "justify-end" : "justify-start")}
                >
                  {l.from === "bot" && <Logo className="size-5 shrink-0" />}
                  <p
                    className={cn(
                      "max-w-[85%] rounded-2xl px-3 py-2 text-[13px] leading-snug shadow-soft",
                      l.from === "you" ? "rounded-br-sm bg-gradient-to-br from-coral to-coral-600 text-white" : "rounded-bl-sm border border-line/70 bg-white text-ink",
                    )}
                  >
                    {l.text}
                  </p>
                </motion.div>
              ),
            )}
            {typing && (
              <motion.div key="typing" layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-end gap-1.5">
                <Logo className="size-5" />
                <span className="flex gap-1 rounded-2xl rounded-bl-sm border border-line/70 bg-white px-3 py-2.5">
                  {[0, 1, 2].map((d) => (
                    <motion.span key={d} className="size-1.5 rounded-full bg-coral" animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: d * 0.15 }} />
                  ))}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="mx-3 mb-4 flex items-center gap-2 rounded-full border border-line bg-white px-3 py-2 text-xs text-muted">
          <span className="flex-1">{nextIsYou ? "typing…" : "Type or tap the mic…"}</span>
          <span className="grid size-7 place-items-center rounded-full bg-gradient-to-br from-sun to-coral text-white">
            <Mic className="size-3.5" />
          </span>
        </div>
      </motion.div>
    </div>
  );
}

