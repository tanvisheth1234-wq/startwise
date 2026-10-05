"use client";
// While the AI works (8–16 s on the free tier): StartWise waters a little sprout and shares one
// useful tip at a time, so the wait feels like care, not a spinner.
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { cn } from "./cn";

export function GrowingWait({ message, className, overlay = false }: { message: string; className?: string; overlay?: boolean }) {
  const t = useTranslations("common.wait");
  const tips = t.raw("tips") as string[];
  // Start on a different tip each time; the clock is read once, after mount.
  const [i, setI] = useState(0);
  useEffect(() => {
    const first = setTimeout(() => setI(new Date().getSeconds() % tips.length), 0);
    const id = setInterval(() => setI((n) => (n + 1) % tips.length), 4200);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [tips.length]);

  const card = (
    <motion.div
      role="status"
      aria-live="polite"
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={cn("flex items-center gap-4 rounded-3xl border border-line/70 bg-white/95 p-4 shadow-soft", overlay && "w-full max-w-sm shadow-lift", className)}
    >
      <Sprout />
      <div className="min-w-0 flex-1 space-y-1">
        <p className="font-display font-bold text-forest">{message}</p>
        <div className="relative min-h-[3.75rem]">
          <AnimatePresence mode="wait">
            <motion.p
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35 }}
              className="text-sm leading-snug text-muted"
            >
              <span className="font-semibold text-coral-600">{t("tipLabel")}: </span>
              {tips[i]}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );

  if (!overlay) return card;
  return <div className="fixed inset-0 z-40 grid place-items-center bg-cream/80 p-6 backdrop-blur-sm">{card}</div>;
}

/** A tiny pot whose sprout keeps growing while the can waters it. */
function Sprout() {
  return (
    <svg viewBox="0 0 80 80" className="size-16 shrink-0" aria-hidden>
      <motion.g style={{ transformOrigin: "22px 30px" }} animate={{ rotate: [0, 22, 22, 0] }} transition={{ duration: 2.4, times: [0, 0.2, 0.8, 1], repeat: Infinity }}>
        <rect x={6} y={22} width={22} height={16} rx={5} fill="#ffc24b" />
        <path d="M27 30 L38 22" stroke="#ec6a3c" strokeWidth={4} strokeLinecap="round" />
        <path d="M6 26 C 0 26, 0 36, 6 36" stroke="#d9562a" strokeWidth={3} fill="none" />
      </motion.g>
      {[0, 1, 2].map((k) => (
        <motion.circle
          key={k}
          cx={40}
          cy={26}
          r={1.8}
          fill="#6aa8e8"
          animate={{ x: [0, 4, 8], y: [0, 12, 26], opacity: [0, 1, 0] }}
          transition={{ duration: 0.8, delay: 0.5 + k * 0.2, repeat: Infinity, repeatDelay: 1.0 }}
        />
      ))}
      <motion.path
        d="M52 62 L52 40"
        stroke="#3f8a68"
        strokeWidth={3.5}
        strokeLinecap="round"
        animate={{ pathLength: [0.3, 1, 1, 0.3] }}
        transition={{ duration: 4.8, times: [0, 0.45, 0.9, 1], repeat: Infinity }}
      />
      <motion.path
        d="M52 46 C 44 44, 41 38, 42 34 C 48 35, 52 40, 52 46 Z"
        fill="#3f8a68"
        style={{ transformOrigin: "52px 46px" }}
        animate={{ scale: [0, 1, 1, 0] }}
        transition={{ duration: 4.8, times: [0.2, 0.5, 0.9, 1], repeat: Infinity }}
      />
      <motion.path
        d="M52 42 C 60 40, 63 34, 62 30 C 56 31, 52 36, 52 42 Z"
        fill="#7cc19c"
        style={{ transformOrigin: "52px 42px" }}
        animate={{ scale: [0, 0, 1, 1, 0] }}
        transition={{ duration: 4.8, times: [0, 0.35, 0.6, 0.9, 1], repeat: Infinity }}
      />
      <path d="M40 64 L64 64 L61 76 L43 76 Z" fill="#ec6a3c" />
      <rect x={38} y={60} width={28} height={6} rx={3} fill="#d9562a" />
    </svg>
  );
}
