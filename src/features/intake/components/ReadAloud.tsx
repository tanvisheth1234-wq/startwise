"use client";
// OWNER: T1. Placeholder until T1-14: renders nothing.
import type { Lang } from "@/contracts/profile";

export type ReadAloudProps = { text: string; lang: Lang; className?: string };

export function ReadAloud(_props: ReadAloudProps) {
  return null; // TODO(T1): speechSynthesis with a hi / mr / en voice; hide when no voice exists
}
