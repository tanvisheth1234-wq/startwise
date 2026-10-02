// OWNER: T2 (simple version written by T1 in Phase 0)
import { ExternalLink } from "lucide-react";
import type { SourceRef } from "@/contracts/common";

export function SourceChip({ source }: { source: SourceRef }) {
  const verified = source.status === "verified";
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line bg-white px-3 text-xs font-semibold text-teal hover:bg-mint"
    >
      <ExternalLink className="size-3.5" aria-hidden />
      <span>{source.title}</span>
      <span className={verified ? "text-forest" : "text-gold"}>
        · {verified ? (source.lastVerified ?? "✓") : "?"}
      </span>
    </a>
  );
}
