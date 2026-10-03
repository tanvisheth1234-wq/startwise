"use client";
// src/components/ui/PlanNav.tsx   (SHARED) — the plan's bottom nav. Client-side so the active tab
// follows navigation (layouts are not re-rendered when moving between pages).
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calculator, FileDown, FlaskConical, HandCoins, House, ListChecks, MapPin, Scale, Users, type LucideIcon,
} from "lucide-react";
import type { ModuleIcon } from "@/features/registry";
import { cn } from "./cn";

const ICONS: Record<ModuleIcon | "House", LucideIcon> = {
  House, FlaskConical, MapPin, Scale, Calculator, HandCoins, ListChecks, Users, FileDown,
};

export type PlanNavItem = { href: string; label: string; icon: ModuleIcon | "House"; exact?: boolean };

export function PlanNav({ items, label }: { items: PlanNavItem[]; label: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label={label} className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white pb-[env(safe-area-inset-bottom)] print:hidden">
      <ul className="mx-auto flex max-w-3xl overflow-x-auto">
        {items.map(({ href, label: text, icon, exact }) => {
          const active = exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
          const Icon = ICONS[icon];
          return (
            <li key={href} className="shrink-0">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 min-w-[4.5rem] flex-col items-center justify-center gap-0.5 px-2 text-[11px] font-semibold",
                  active ? "text-forest" : "text-muted hover:text-forest",
                )}
              >
                <Icon className={cn("size-5", active && "text-gold")} aria-hidden />
                <span className="whitespace-nowrap">{text}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
