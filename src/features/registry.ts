// src/features/registry.ts   (SHARED) — written once, read by the nav and dashboard
export const MODULES = [
  { key: "validate",       route: "validate",        icon: "FlaskConical", owner: "T1", labelKey: "common.nav.validate" },
  { key: "market",         route: "market",          icon: "MapPin",       owner: "T1", labelKey: "common.nav.market" },
  { key: "compliance",     route: "compliance",      icon: "Scale",        owner: "T2", labelKey: "common.nav.compliance" },
  { key: "money",          route: "money",           icon: "Calculator",   owner: "T2", labelKey: "common.nav.money" },
  { key: "funding",        route: "funding",         icon: "HandCoins",    owner: "T2", labelKey: "common.nav.funding" },
  { key: "roadmap",        route: "roadmap",         icon: "ListChecks",   owner: "T2", labelKey: "common.nav.roadmap" },
  { key: "firstCustomers", route: "first-customers", icon: "Users",        owner: "T1", labelKey: "common.nav.firstCustomers" },
  { key: "launchPack",     route: "launch-pack",     icon: "FileDown",     owner: "T1", labelKey: "common.nav.launchPack" },
] as const;

export type ModuleKey = (typeof MODULES)[number]["key"];
export type ModuleIcon = (typeof MODULES)[number]["icon"];
