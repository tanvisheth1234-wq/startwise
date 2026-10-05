"use client";
// A small confetti burst for wins (a task done, a first order). Pure CSS, no library.
import { useEffect, useState } from "react";

const COLORS = ["#ec6a3c", "#ffc24b", "#c2477a", "#3f8a68", "#4c86c6"];

export function Celebrate({ fire, message }: { fire: number; message?: string }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (!fire) return;
    const on = setTimeout(() => setShown(fire), 0);
    const off = setTimeout(() => setShown(0), 1800);
    return () => {
      clearTimeout(on);
      clearTimeout(off);
    };
  }, [fire]);
  if (!shown) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-live="polite">
      {message && (
        <p className="absolute left-1/2 top-1/3 -translate-x-1/2 animate-pop rounded-full bg-white px-5 py-2 font-display text-lg font-bold text-forest shadow-lift">
          {message}
        </p>
      )}
      {Array.from({ length: 36 }, (_, i) => {
        const left = (i * 37) % 100;
        const delay = (i % 9) * 40;
        const size = 6 + (i % 4) * 2;
        return (
          <span
            key={`${shown}-${i}`}
            className="absolute top-[-10px] block rounded-sm"
            style={{
              left: `${left}%`,
              width: size,
              height: size * 1.6,
              background: COLORS[i % COLORS.length],
              animation: `confetti-fall 1.6s ${delay}ms cubic-bezier(.2,.6,.4,1) forwards`,
              transform: `rotate(${i * 29}deg)`,
            }}
          />
        );
      })}
      <style>{`@keyframes confetti-fall{0%{transform:translateY(0) rotate(0)}100%{transform:translateY(105vh) rotate(720deg);opacity:.6}}`}</style>
    </div>
  );
}
