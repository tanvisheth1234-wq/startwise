// app/layout.tsx   (SHARED) — root layout, fonts, NextIntl provider, header
import type { Metadata, Viewport } from "next";
import { Baloo_2, Noto_Sans, Noto_Sans_Devanagari } from "next/font/google";
import Link from "next/link";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { CircleUserRound, LogOut } from "lucide-react";
import { LanguageSwitch, MotionRoot } from "@/components/ui";
import { Logo } from "@/components/ui/Logo";
import { getUser } from "@/lib/auth";
import { signOut } from "@/lib/auth/actions";
import "./globals.css";

const latin = Noto_Sans({ subsets: ["latin"], variable: "--font-latin", display: "swap" });
const devanagari = Noto_Sans_Devanagari({ subsets: ["devanagari", "latin"], variable: "--font-devanagari", display: "swap" });
// Rounded, friendly headings that also cover Hindi and Marathi.
const baloo = Baloo_2({ subsets: ["latin", "devanagari"], weight: ["500", "600", "700", "800"], variable: "--font-baloo", display: "swap" });

export const metadata: Metadata = {
  title: "StartWise",
  description: "Start wise. Launch right. Turn a business idea into a tested, source-backed launch plan.",
  other: { google: "notranslate" }, // our Hindi/Marathi is already right; stop Chrome auto-translating it
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#FFFAF4",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const t = await getTranslations("common");
  const user = await getUser();

  return (
    <html lang={locale} translate="no" className={`${latin.variable} ${devanagari.variable} ${baloo.variable}`}>
      <body className="min-h-dvh antialiased">
        <NextIntlClientProvider>
          <MotionRoot>
          <header className="sticky top-0 z-30 border-b border-line/60 bg-cream/85 backdrop-blur-md print:hidden">
            <div className="mx-auto flex max-w-3xl items-center gap-2 px-3 py-2">
              <Link href="/" aria-label={t("header.home")} className="flex min-h-11 items-center gap-2">
                <Logo className="size-9" />
                <span className="font-display text-xl font-extrabold text-forest">{t("appName")}</span>
              </Link>
              <div className="ml-auto flex items-center gap-1">
                <LanguageSwitch />
                {user && !user.isGuest ? (
                  <>
                    <Link href="/account" aria-label={t("header.account")} className="grid min-h-11 min-w-11 place-items-center rounded-full text-forest hover:bg-mint">
                      <CircleUserRound className="size-6" aria-hidden />
                    </Link>
                    <form action={signOut}>
                      <button type="submit" aria-label={t("header.logout")} className="grid min-h-11 min-w-11 place-items-center rounded-full text-forest hover:bg-mint">
                        <LogOut className="size-5" aria-hidden />
                      </button>
                    </form>
                  </>
                ) : (
                  <Link href="/login" className="flex min-h-11 items-center rounded-full px-3 font-semibold text-forest hover:bg-mint">
                    {t("header.login")}
                  </Link>
                )}
              </div>
            </div>
          </header>
          {children}
        </MotionRoot>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
