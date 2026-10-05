"use client";
// The StartWise plant: a watering can (StartWise) waters a seedling, the stem grows, and each branch
// is one part of the journey (test, costs, papers…). The flower at the top is the first customer.
//   mode "intro"    → everything grows in turn when scrolled into view (welcome page).
//   mode "progress" → her real plan: done branches are leaves, the current one is a bud, the rest are faint.
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useInView } from "motion/react";
import { Celebrate } from "./Celebrate";

export type PlantBranch = { key: string; label: string; href?: string; state: "done" | "current" | "todo" };

const X = 200;
const BASE = 368; // where the stem leaves the soil
const TOP = 74; // where the flower sits
const LEAF = "M0 0 C 8 -11, 26 -11, 34 0 C 26 11, 8 11, 0 0 Z";

const C = { sage: "#3f8a68", sageLight: "#7cc19c", coral: "#ec6a3c", coralDark: "#d9562a", sun: "#ffc24b", line: "#e6cdb9", cocoa: "#4a2c22", muted: "#9c8476", soil: "#6b4232", cream: "#fffaf4", water: "#6aa8e8" };

export function GrowingPlant({
  branches,
  bloom,
  mode,
  labelSize,
  rememberAs,
  grewText,
  className,
}: {
  branches: PlantBranch[];
  bloom: PlantBranch;
  mode: "intro" | "progress";
  labelSize?: number;
  /** Remembers which steps were done last visit (per plan), so a newly finished step grows in front of her. */
  rememberAs?: string;
  /** e.g. "Your plant grew a new leaf: {step}" */
  grewText?: string;
  className?: string;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const [fresh, setFresh] = useState<string[]>([]);
  const [cheer, setCheer] = useState(0);
  const lastVisit = useRef<string[] | null | undefined>(undefined);
  const doneKeys = [...branches, bloom].filter((b) => b.state === "done").map((b) => b.key).join(",");

  // Compare with last visit: anything newly done gets its own growing moment and a little celebration.
  useEffect(() => {
    if (!rememberAs) return;
    const now = doneKeys ? doneKeys.split(",") : [];
    try {
      // Read last visit only once, even if this effect runs again.
      if (lastVisit.current === undefined) {
        const saved = localStorage.getItem(rememberAs);
        lastVisit.current = saved === null ? null : saved ? saved.split(",") : [];
      }
      localStorage.setItem(rememberAs, now.join(","));
    } catch {
      return;
    }
    const before = lastVisit.current;
    if (before === null) return; // first visit: nothing to compare with
    const grew = now.filter((k) => !before.includes(k));
    if (grew.length === 0) return;
    // Regrow the new leaf at once; cheer as it unfolds.
    const t = setTimeout(() => setFresh(grew), 0);
    const c = setTimeout(() => setCheer((n) => n + 1), 1900);
    return () => {
      clearTimeout(t);
      clearTimeout(c);
    };
  }, [rememberAs, doneKeys]);
  const freshLabel = [...branches, bloom].find((b) => fresh.includes(b.key))?.label;
  const go = useInView(ref, { once: true, amount: 0.35 });
  const router = useRouter();
  const intro = mode === "intro";

  const n = branches.length;
  const lowest = BASE - 62;
  const highest = TOP + 62;
  const yAt = (i: number) => lowest - (i * (lowest - highest)) / Math.max(1, n - 1);

  // In "progress" the solid stem reaches the current branch (or the top when everything is done).
  const currentIdx = branches.findIndex((b) => b.state !== "done");
  const stemTo = intro || currentIdx === -1 ? TOP + 12 : yAt(currentIdx) - 4;
  const stemDur = intro ? 1.3 : 0.9;
  const branchDelay = (i: number, key?: string) => (intro ? 1.0 + i * 0.32 : key && fresh.includes(key) ? 1.6 : 0.7 + i * 0.18);
  const bloomDelay = branchDelay(n) + 0.2;

  const open = (b: PlantBranch) => b.href && router.push(b.href);
  const linkProps = (b: PlantBranch) =>
    !intro && b.href
      ? {
          role: "link",
          tabIndex: 0,
          "aria-label": b.label,
          onClick: () => open(b),
          onKeyDown: (e: React.KeyboardEvent) => (e.key === "Enter" || e.key === " ") && open(b),
          style: { cursor: "pointer" },
        }
      : {};

  return (
    <>
    {rememberAs && <Celebrate fire={cheer} message={freshLabel && grewText ? grewText.replace("{step}", freshLabel) : undefined} />}
    <svg ref={ref} viewBox="0 0 400 430" className={className} role="img" aria-label={[...branches, bloom].map((b) => b.label).join(", ")}>
      <defs>
        <linearGradient id="sw-pot" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={C.coral} />
          <stop offset="1" stopColor={C.coralDark} />
        </linearGradient>
        <linearGradient id="sw-can" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor={C.sun} />
          <stop offset="1" stopColor={C.coral} />
        </linearGradient>
      </defs>

      {/* soft ground shadow */}
      <ellipse cx={X} cy={422} rx={90} ry={7} fill={C.cocoa} opacity={0.08} />

      {/* faint path of the whole plant still to come */}
      {!intro && <line x1={X} y1={BASE} x2={X} y2={TOP + 12} stroke={C.line} strokeWidth={5} strokeDasharray="3 9" strokeLinecap="round" />}

      {/* stem */}
      <motion.path
        d={`M${X} ${BASE} L${X} ${stemTo}`}
        stroke={C.sage}
        strokeWidth={7}
        strokeLinecap="round"
        fill="none"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={go ? { pathLength: 1, opacity: 1 } : undefined}
        transition={{ duration: stemDur, delay: intro ? 0.6 : 0.3, ease: "easeOut" }}
      />

      {/* branches */}
      {branches.map((b, i) => {
        const y = yAt(i);
        const side = i % 2 === 0 ? -1 : 1;
        const end = { x: X + side * 78, y: y - 26 };
        const grown = intro || b.state !== "todo";
        const d = `M${X} ${y} Q ${X + side * 34} ${y - 2} ${end.x} ${end.y}`;
        const labelColor = intro ? C.cocoa : b.state === "done" ? C.sage : b.state === "current" ? C.coralDark : C.muted;
        return (
          <g key={`${b.key}-${fresh.includes(b.key)}`} {...linkProps(b)}>
            {grown ? (
              <motion.path d={d} stroke={C.sage} strokeWidth={5} strokeLinecap="round" fill="none" initial={{ pathLength: 0, opacity: 0 }} animate={go ? { pathLength: 1, opacity: 1 } : undefined} transition={{ duration: 0.45, delay: branchDelay(i, b.key) }} />
            ) : (
              <path d={d} stroke={C.line} strokeWidth={4} strokeLinecap="round" strokeDasharray="3 7" fill="none" />
            )}

            <g transform={`translate(${end.x} ${end.y}) rotate(${side > 0 ? -25 : 205})`}>
              {grown ? (
                <motion.path
                  d={LEAF}
                  fill={!intro && b.state === "current" ? C.coral : intro && i % 3 === 1 ? C.sageLight : C.sage}
                  style={{ transformOrigin: "0% 50%", transformBox: "fill-box" }}
                  initial={{ scale: 0 }}
                  animate={go ? (!intro && b.state === "current" ? { scale: [0, 1.15, 0.9, 1.1, 1] } : { scale: 1 }) : undefined}
                  transition={
                    !intro && b.state === "current"
                      ? { duration: 2.4, delay: branchDelay(i, b.key) + 0.35, repeat: Infinity, repeatType: "mirror" }
                      : { type: "spring", stiffness: 220, damping: 12, delay: branchDelay(i, b.key) + 0.35 }
                  }
                />
              ) : (
                <circle cx={4} cy={0} r={5} fill={C.line} />
              )}
            </g>

            {fresh.includes(b.key) &&
              [0, 1].map((k) => (
                <motion.circle
                  key={k}
                  cx={end.x + side * 16}
                  cy={end.y - 6}
                  fill="none"
                  stroke={C.sun}
                  strokeWidth={4}
                  initial={{ r: 4, opacity: 0 }}
                  animate={{ r: [4, 38], opacity: [0.9, 0] }}
                  transition={{ duration: 1.1, delay: 2.0 + k * 0.45, repeat: 2, repeatDelay: 0.6 }}
                />
              ))}
            {b.label && <motion.text
              x={end.x + side * 18}
              y={end.y - 20}
              textAnchor="middle"
              fontSize={labelSize ?? (intro ? 15 : 19)}
              fontWeight={700}
              fill={labelColor}
              stroke={C.cream}
              strokeWidth={5}
              paintOrder="stroke"
              style={{ fontFamily: "var(--font-display)" }}
              initial={{ opacity: 0, y: 6 }}
              animate={go ? { opacity: 1, y: 0 } : undefined}
              transition={{ duration: 0.4, delay: branchDelay(i, b.key) + 0.5 }}
            >
              {!intro && b.state === "done" ? `✓ ${b.label}` : b.label}
            </motion.text>}
          </g>
        );
      })}

      {/* the flower: first customer */}
      <g key={`bloom-${fresh.includes(bloom.key)}`} {...linkProps(bloom)}>
        {intro || bloom.state === "done" ? (
          <motion.g
            style={{ transformOrigin: `${X}px ${TOP}px` }}
            initial={{ scale: 0, rotate: -90 }}
            animate={go ? { scale: 1, rotate: 0 } : undefined}
            transition={{ type: "spring", stiffness: 140, damping: 10, delay: bloomDelay }}
          >
            <motion.g style={{ transformOrigin: `${X}px ${TOP}px` }} animate={go ? { rotate: 360 } : undefined} transition={{ duration: 40, repeat: Infinity, ease: "linear", delay: bloomDelay + 1 }}>
              {Array.from({ length: 7 }, (_, k) => {
                const a = (k / 7) * Math.PI * 2;
                return <ellipse key={k} cx={X + Math.cos(a) * 15} cy={TOP + Math.sin(a) * 15} rx={11} ry={8} transform={`rotate(${(a * 180) / Math.PI} ${X + Math.cos(a) * 15} ${TOP + Math.sin(a) * 15})`} fill={C.coral} opacity={0.92} />;
              })}
            </motion.g>
            <circle cx={X} cy={TOP} r={10} fill={C.sun} />
          </motion.g>
        ) : (
          <motion.circle
            cx={X}
            cy={TOP + 6}
            r={bloom.state === "current" ? 10 : 7}
            fill={bloom.state === "current" ? C.coral : C.line}
            initial={{ scale: 0 }}
            animate={go ? { scale: bloom.state === "current" ? [1, 1.2, 1] : 1 } : undefined}
            transition={bloom.state === "current" ? { duration: 1.8, repeat: Infinity } : { delay: bloomDelay }}
          />
        )}
        {bloom.label && <motion.text
          x={X}
          y={TOP - 30}
          textAnchor="middle"
          fontSize={labelSize ?? (intro ? 16 : 19)}
          fontWeight={800}
          fill={intro || bloom.state === "done" ? C.coralDark : bloom.state === "current" ? C.coralDark : C.muted}
          stroke={C.cream}
          strokeWidth={5}
          paintOrder="stroke"
          style={{ fontFamily: "var(--font-display)" }}
          initial={{ opacity: 0 }}
          animate={go ? { opacity: 1 } : undefined}
          transition={{ delay: bloomDelay + 0.3 }}
        >
          {bloom.label}
        </motion.text>}
      </g>

      {/* pot */}
      <path d="M152 374 L248 374 L238 420 L162 420 Z" fill="url(#sw-pot)" />
      <rect x={144} y={364} width={112} height={14} rx={6} fill={C.coralDark} />
      <ellipse cx={X} cy={366} rx={48} ry={5} fill={C.soil} />

      {/* watering can: StartWise taking care of her idea */}
      <motion.g
        initial={{ opacity: 0, x: -30 }}
        animate={go ? { opacity: 1, x: 0 } : undefined}
        transition={{ duration: 0.5 }}
      >
        <motion.g
          style={{ transformOrigin: "60px 328px" }}
          animate={go ? { rotate: intro ? [0, 28, 28, 28] : [0, 28, 28, 0] } : undefined}
          transition={{ duration: intro ? 1 : 4, times: intro ? [0, 0.5, 0.9, 1] : [0, 0.12, 0.85, 1], delay: 0.2 }}
        >
          <g transform="translate(28 292)">
            <path d="M0 22 C -16 22, -16 50, 0 50" stroke={C.coralDark} strokeWidth={6} fill="none" strokeLinecap="round" />
            <rect x={0} y={14} width={64} height={44} rx={11} fill="url(#sw-can)" />
            <rect x={8} y={8} width={48} height={9} rx={4} fill={C.coralDark} />
            <path d="M58 40 L94 14" stroke={C.coral} strokeWidth={8} strokeLinecap="round" />
            <circle cx={97} cy={12} r={6} fill={C.coralDark} />
            {/* the StartWise sprout on the can */}
            <path d="M32 50 L32 34 M32 38 C 26 30, 20 32, 18 28 M32 36 C 38 28, 44 30, 46 26" stroke="#fff" strokeWidth={3.5} fill="none" strokeLinecap="round" />
          </g>
        </motion.g>

        {/* water drops */}
        {[0, 1, 2, 3, 4].map((k) => (
          <motion.ellipse
            key={k}
            cx={132 + (k % 2) * 4}
            cy={341}
            rx={3.4}
            ry={4.6}
            fill={C.water}
            initial={{ opacity: 0 }}
            animate={go ? { x: [0, 20, 40], y: [0, 12, 30], opacity: [0, 1, 0] } : undefined}
            transition={{ duration: 0.9, delay: 0.7 + k * 0.18, repeat: intro ? Infinity : 3, repeatDelay: 0.0 }}
          />
        ))}
      </motion.g>
    </svg>
    </>
  );
}
