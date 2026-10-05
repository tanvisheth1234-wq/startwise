// Screens the voice assistant may open, mapped to their route under /plan/[id].
export const SCREENS = ["home", "tasks", "validate", "money", "compliance", "funding", "market", "marketing", "notebook", "first-customers", "launch-pack", "practice", "orders"] as const;
export type Screen = (typeof SCREENS)[number];

export function screenHref(planId: string, s: Screen): string {
  const route = s === "home" ? "" : s === "tasks" ? "roadmap" : s;
  return `/plan/${planId}${route ? `/${route}` : ""}`;
}
