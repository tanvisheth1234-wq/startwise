// src/i18n/request.ts   (SHARED) – every messages/<lang>/<ns>.json file must be listed here
import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

export const LOCALES = ["en", "hi", "mr"] as const;
export const NAMESPACES = ["common", "start", "intake", "profile", "dashboard", "validate", "market",
  "firstCustomers", "launchPack", "account", "compliance", "money", "funding", "roadmap", "admin", "notebook", "marketing", "talk", "practice", "orders", "chat", "welcome"] as const;
export const LOCALE_COOKIE = "NEXT_LOCALE";

export default getRequestConfig(async () => {
  const c = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale = (LOCALES as readonly string[]).includes(c ?? "") ? c! : "en";
  const entries = await Promise.all(NAMESPACES.map(async (ns) =>
    [ns, (await import(`../../messages/${locale}/${ns}.json`)).default] as const));
  return { locale, messages: Object.fromEntries(entries), timeZone: "Asia/Kolkata" };
});
