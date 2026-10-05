import type { HTMLAttributes } from "react";
import { cn } from "./cn";

export type BadgeTone = "green" | "teal" | "gold" | "grey" | "red" | "berry" | "sky" | "sun";

const tones: Record<BadgeTone, string> = {
  green: "bg-sage-light text-sage",
  teal: "bg-sage-light text-sage",
  gold: "bg-gold-light/60 text-coral-600",
  grey: "bg-[#f3ece6] text-muted",
  red: "bg-danger/10 text-danger",
  berry: "bg-berry-light text-berry",
  sky: "bg-sky-light text-sky",
  sun: "bg-sun-light text-[#8a5a00]",
};

export function Badge({ tone = "green", className, ...rest }: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", tones[tone], className)}
      {...rest}
    />
  );
}
