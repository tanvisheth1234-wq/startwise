import { cn } from "./cn";

/** StartWise mark: a seedling sprouting from a sun. Decorative, so hidden from screen readers. */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn("shrink-0", className)} aria-hidden>
      <defs>
        <linearGradient id="sw-sun" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFC24B" />
          <stop offset="1" stopColor="#EC6A3C" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="13" fill="url(#sw-sun)" />
      <path d="M20 31V19" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
      <path d="M20 21c0-5 3.5-8 9-8 0 5-3.5 8-9 8Z" fill="#fff" />
      <path d="M20 24c0-4-2.8-6.5-7.5-6.5 0 4 2.8 6.5 7.5 6.5Z" fill="#fff" opacity="0.85" />
    </svg>
  );
}
