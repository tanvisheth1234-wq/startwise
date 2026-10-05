"use client";
// Small, gentle animation building blocks (Motion). Server pages can use these wrappers directly.
// Everything respects the phone's "reduce motion" setting via <MotionRoot>.
import { MotionConfig, motion, type HTMLMotionProps } from "motion/react";
import type { ReactNode } from "react";

const EASE = [0.22, 1, 0.36, 1] as const; // soft "ease-out-quint"

/** Put once around the app: honours the user's reduced-motion preference. */
export function MotionRoot({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

/** Fades and lifts in when it first appears. */
export function FadeUp({ delay = 0, y = 14, className, children, ...rest }: HTMLMotionProps<"div"> & { delay?: number; y?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: EASE }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/** A list whose items appear one after another. Use <StaggerItem> for each child. */
export function Stagger({ gap = 0.07, delay = 0, as = "div", className, children }: { gap?: number; delay?: number; as?: "div" | "ul" | "ol"; className?: string; children: ReactNode }) {
  const Tag = as === "ul" ? motion.ul : as === "ol" ? motion.ol : motion.div;
  return (
    <Tag initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: gap, delayChildren: delay } } }} className={className}>
      {children}
    </Tag>
  );
}

export function StaggerItem({ as = "div", className, children }: { as?: "div" | "li"; className?: string; children: ReactNode }) {
  const Tag = as === "li" ? motion.li : motion.div;
  return (
    <Tag
      variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } } }}
      className={className}
    >
      {children}
    </Tag>
  );
}

/** Springs in with a little bounce: for reveals and celebrations. */
export function PopIn({ delay = 0, className, children }: { delay?: number; className?: string; children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 20, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** A line or bar that grows from the left to `to` (0 to 1), e.g. the filled part of the journey path. */
export function GrowX({ to, delay = 0, className }: { to: number; delay?: number; className?: string }) {
  return (
    <motion.span
      aria-hidden
      initial={{ scaleX: 0 }}
      animate={{ scaleX: Math.max(0, Math.min(1, to)) }}
      transition={{ duration: 0.9, delay, ease: EASE }}
      style={{ transformOrigin: "left" }}
      className={className}
    />
  );
}

/** Wraps a tappable thing so it gently grows on hover and squishes on tap. */
export function Tappable({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} transition={{ type: "spring", stiffness: 400, damping: 25 }} className={className}>
      {children}
    </motion.div>
  );
}
