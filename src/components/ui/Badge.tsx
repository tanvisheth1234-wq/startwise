import type { HTMLAttributes } from "react";
import { cn } from "./cn";

export type BadgeTone = "green" | "teal" | "gold" | "grey" | "red";

const tones: Record<BadgeTone, string> = {
  green: "bg-mint text-forest",
  teal: "bg-teal/10 text-teal",
  gold: "bg-gold-light/40 text-[#6e5328]",
  grey: "bg-gray-100 text-gray-700",
  red: "bg-danger/10 text-danger",
};

export function Badge({ tone = "green", className, ...rest }: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", tones[tone], className)}
      {...rest}
    />
  );
}
