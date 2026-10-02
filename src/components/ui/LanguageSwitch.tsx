"use client";
import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Languages } from "lucide-react";
import { setLanguage } from "@/features/account/actions";
import { cn } from "./cn";

const LANGS = ["en", "hi", "mr"] as const;

/** Sets the NEXT_LOCALE cookie (and the user's saved preference) and re-renders in the new language. */
export function LanguageSwitch({ className }: { className?: string }) {
  const t = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <label className={cn("relative inline-flex items-center", className)}>
      <span className="sr-only">{t("header.language")}</span>
      <Languages className="pointer-events-none absolute left-2.5 size-4 text-forest" aria-hidden />
      <select
        value={locale}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value as (typeof LANGS)[number];
          startTransition(async () => {
            await setLanguage(next);
            router.refresh();
          });
        }}
        className="min-h-11 appearance-none rounded-xl border border-line bg-white py-1 pl-8 pr-3 text-sm font-semibold text-forest"
      >
        {LANGS.map((l) => (
          <option key={l} value={l} lang={l}>
            {t(`languages.${l}`)}
          </option>
        ))}
      </select>
    </label>
  );
}
