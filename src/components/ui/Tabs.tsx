"use client";
import { useId, useState, type ReactNode } from "react";
import { cn } from "./cn";

export type TabItem = { key: string; label: ReactNode; content: ReactNode };

export function Tabs({ items, initialKey, className }: { items: TabItem[]; initialKey?: string; className?: string }) {
  const [active, setActive] = useState(initialKey ?? items[0]?.key);
  const id = useId();
  const current = items.find((i) => i.key === active) ?? items[0];

  return (
    <div className={className}>
      <div role="tablist" className="flex gap-1 overflow-x-auto rounded-xl bg-mint p-1">
        {items.map((item) => {
          const selected = item.key === current?.key;
          return (
            <button
              key={item.key}
              role="tab"
              type="button"
              id={`${id}-tab-${item.key}`}
              aria-selected={selected}
              aria-controls={`${id}-panel-${item.key}`}
              onClick={() => setActive(item.key)}
              className={cn(
                "min-h-11 flex-1 whitespace-nowrap rounded-lg px-3 text-sm font-semibold",
                selected ? "bg-white text-forest shadow-sm" : "text-muted hover:text-forest",
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {current && (
        <div role="tabpanel" id={`${id}-panel-${current.key}`} aria-labelledby={`${id}-tab-${current.key}`} className="pt-4">
          {current.content}
        </div>
      )}
    </div>
  );
}
