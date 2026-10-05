"use client";
// src/components/ui/PlanNav.tsx   (SHARED) — the plan's bottom nav. Client-side so the active tab
// follows navigation (layouts are not re-rendered when moving between pages).
import { Fragment } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AudioLines, BookHeart, Calculator, FileDown, FlaskConical, HandCoins, House, ListChecks, MapPin, Megaphone, Scale, Users, type LucideIcon,
} from "lucide-react";
import type { ModuleIcon } from "@/features/registry";
import { cn } from "./cn";

const ICONS: Record<ModuleIcon | "House" | "BookHeart" | "Megaphone", LucideIcon> = {
  House, FlaskConical, MapPin, Scale, Calculator, HandCoins, ListChecks, Users, FileDown, BookHeart, Megaphone,
};

export type PlanNavItem = { href: string; label: string; icon: keyof typeof ICONS; exact?: boolean };

/** The raised round button in the middle of the bar: opens "Talk to StartWise". */
function TalkButton({ label }: { label: string }) {
  return (
    <li className="flex flex-1 justify-center">
      <button
        type="button"
        onClick={() => window.dispatchEvent(new Event("sw:talk"))}
        data-tour="talk"
        className="-mt-6 flex flex-col items-center gap-0.5 text-[11px] font-bold text-coral-600"
      >
        <span className="grid size-14 place-items-center rounded-full bg-gradient-to-br from-berry via-coral to-sun text-white shadow-lift ring-4 ring-cream transition-transform hover:scale-105">
          <AudioLines className="size-6" aria-hidden />
        </span>
        {label}
      </button>
    </li>
  );
}

export function PlanNav({ items, label, talkLabel }: { items: PlanNavItem[]; label: string; talkLabel?: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label={label} className="fixed inset-x-0 bottom-0 z-30 border-t border-line/70 bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md print:hidden">
      <ul className="mx-auto flex max-w-3xl justify-around">
        {items.map(({ href, label: text, icon, exact }, i) => {
          const active = exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
          const Icon = ICONS[icon];
          return (
            <Fragment key={href}>
            {talkLabel && i === Math.floor(items.length / 2) && <TalkButton label={talkLabel} />}
            <li className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-16 flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-bold",
                  active ? "text-coral-600" : "text-muted hover:text-forest",
                )}
              >
                <span className={cn("grid h-7 w-12 place-items-center rounded-full transition-colors", active && "bg-mint")}>
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="whitespace-nowrap">{text}</span>
              </Link>
            </li>
            </Fragment>
          );
        })}
      </ul>
    </nav>
  );
}
