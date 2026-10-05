import type { ButtonHTMLAttributes } from "react";
import { cn } from "./cn";

export type ButtonVariant = "primary" | "secondary" | "gold" | "ghost" | "danger" | "dark";
export type ButtonSize = "md" | "lg" | "sm";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-gradient-to-br from-coral to-coral-600 text-white shadow-lift hover:brightness-105 active:scale-[0.98] disabled:from-coral/40 disabled:to-coral/40 disabled:shadow-none",
  secondary: "bg-white text-forest border border-line shadow-soft hover:bg-mint active:scale-[0.98] disabled:text-forest/50",
  gold: "bg-sun text-forest shadow-soft hover:brightness-105 active:scale-[0.98] disabled:opacity-50",
  ghost: "bg-transparent text-forest hover:bg-mint",
  danger: "bg-danger text-white hover:bg-danger/90 disabled:bg-danger/50",
  dark: "bg-forest text-white hover:bg-forest-700 active:scale-[0.98] disabled:bg-forest/50",
};

// Every size keeps the 44 px minimum tap target.
const sizes: Record<ButtonSize, string> = {
  sm: "min-h-11 px-3 text-sm",
  md: "min-h-11 px-4 text-base",
  lg: "min-h-14 px-6 text-lg",
};

/** Class names for a button look, so a <Link> can share it. */
export function buttonClasses(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition-all duration-150",
    "disabled:cursor-not-allowed",
    variants[variant],
    sizes[size],
    className,
  );
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
};

export function Button({ variant = "primary", size = "md", block, className, type = "button", ...rest }: ButtonProps) {
  return <button type={type} className={buttonClasses(variant, size, cn(block && "w-full", className))} {...rest} />;
}
