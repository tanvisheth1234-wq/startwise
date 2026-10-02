import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-2xl border border-line bg-white p-4 shadow-sm", className)} {...rest} />;
}

export function CardTitle({ children, className, as: Tag = "h2" }: { children: ReactNode; className?: string; as?: "h2" | "h3" | "h4" }) {
  return <Tag className={cn("text-lg font-semibold text-forest", className)}>{children}</Tag>;
}
