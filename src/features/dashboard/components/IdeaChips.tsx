"use client";
// Each idea opens Talk with that question already asked, so a conversation starts in one tap.
import { MessageCircleHeart } from "lucide-react";

export function IdeaChips({ ideas }: { ideas: string[] }) {
  return (
    <ul className="space-y-2">
      {ideas.map((idea) => (
        <li key={idea}>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("sw:talk", { detail: { ask: idea } }))}
            className="flex min-h-12 w-full items-center gap-3 rounded-2xl bg-mint/70 px-3 py-2 text-left text-sm font-semibold text-forest transition-colors hover:bg-mint"
          >
            <MessageCircleHeart className="size-5 shrink-0 text-coral" aria-hidden />
            {idea}
          </button>
        </li>
      ))}
    </ul>
  );
}
