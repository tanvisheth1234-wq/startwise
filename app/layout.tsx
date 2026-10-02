// app/layout.tsx   (SHARED) — root layout, fonts, NextIntl provider, header
import type { Metadata, Viewport } from "next";
import { Noto_Sans, Noto_Sans_Devanagari } from "next/font/google";
import Link from "next/link";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { CircleUserRound, LogOut } from "lucide-react";
import { LanguageSwitch } from "@/components/ui";
import { getUser } from "@/lib/auth";
import { signOut } from "@/lib/auth/actions";
import "./globals.css";

const latin = Noto_Sans({ subsets: ["latin"], variable: "--font-latin", display: "swap" });
const devanagari = Noto_Sans_Devanagari({ subsets: ["devanagari", "latin"], variable: "--font-devanagari", display: "swap" });

export const metadata: Metadata = {
  title: "StartWise",
  description: "Start wise. Launch right. Turn a business idea into a tested, source-backed launch plan.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1E3A2C",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const t = await getTranslations("common");
  const user = await getUser();

  return (
    <html lang={locale} className={`${latin.variable} ${devanagari.variable}`}>
      <body className="min-h-dvh antialiased">
        <NextIntlClientProvider>
          <header className="sticky top-0 z-30 border-b border-forest-700 bg-forest text-white print:hidden">
            <div className="mx-auto flex max-w-3xl items-center gap-2 px-3 py-2">
              <Link href="/" aria-label={t("header.home")} className="flex min-h-11 items-center gap-2 font-bold">
                <span className="grid size-8 place-items-center rounded-lg bg-gold text-sm">SW</span>
                <span className="text-lg">{t("appName")}</span>
              </Link>
              <div className="ml-auto flex items-center gap-1">
                <LanguageSwitch />
                {user ? (
                  <>
                    <Link href="/account" aria-label={t("header.account")} className="grid min-h-11 min-w-11 place-items-center rounded-lg hover:bg-forest-700">
                      <CircleUserRound className="size-6" aria-hidden />
                    </Link>
                    <form action={signOut}>
                      <button type="submit" aria-label={t("header.logout")} className="grid min-h-11 min-w-11 place-items-center rounded-lg hover:bg-forest-700">
                        <LogOut className="size-5" aria-hidden />
                      </button>
                    </form>
                  </>
                ) : (
                  <Link href="/login" className="flex min-h-11 items-center rounded-lg px-3 font-semibold hover:bg-forest-700">
                    {t("header.login")}
                  </Link>
                )}
              </div>
            </div>
          </header>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
