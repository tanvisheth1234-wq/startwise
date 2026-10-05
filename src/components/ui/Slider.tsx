"use client";
import { useId } from "react";
import { cn } from "./cn";

export type SliderProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  format?: (value: number) => string;
  className?: string;
};

export function Slider({ label, value, min, max, step = 1, onChange, format, className }: SliderProps) {
  const id = useId();
  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium text-ink">{label}</label>
        <output htmlFor={id} className="rounded-full bg-mint px-2.5 py-0.5 text-sm font-bold text-coral-600">{format ? format(value) : value}</output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-11 w-full cursor-pointer accent-coral"
      />
    </div>
  );
}
