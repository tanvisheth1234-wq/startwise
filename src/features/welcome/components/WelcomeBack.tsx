// Returning founder: one big "continue your plan" card with her next step, and a small "new idea" link.
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowRight, Plus } from "lucide-react";
import type { Lang } from "@/contracts/profile";
import { roadmap } from "@/features/roadmap/api";
import { getSection } from "@/features/validate/server/sections";

export type Founder = { name: string; voice: "speak" | "text" | null };

export async function WelcomeBack({ planId, title, lang }: { planId: string; title: string; lang: Lang }) {
  const t = await getTranslations("welcome");
  const [founder, next] = await Promise.all([
    getSection<Founder>(planId, "founder", "en").catch(() => null),
    roadmap.getNextStep(planId, lang).catch(() => null),
  ]);
  const name = founder?.content.name;

  return (
    <div className="flex min-h-[70dvh] flex-col justify-center gap-6">
      <h1 className="animate-rise text-center text-4xl font-extrabold leading-tight text-forest">
        {name ? t("backNamed", { name }) : t("back")} 👋
      </h1>
      <Link
        href={`/plan/${planId}`}
        className="group block animate-pop rounded-[2rem] bg-gradient-to-br from-coral via-coral-600 to-berry p-6 text-white shadow-lift transition-transform hover:-translate-y-1"
      >
        <p className="text-sm font-bold uppercase tracking-widest text-white/80">{t("continue")}</p>
        <p className="mt-1 font-display text-2xl font-extrabold leading-snug first-letter:uppercase">{title}</p>
        {next && (
          <p className="mt-4 rounded-2xl bg-white/15 p-3 text-white">
            <span className="block text-xs font-bold uppercase tracking-widest text-white/75">{t("nextStep")}</span>
            <span className="font-semibold">{next.title}</span>
          </p>
        )}
        <span className="mt-5 flex items-center justify-end gap-2 font-bold">
          {t("open")}
          <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" aria-hidden />
        </span>
      </Link>
      <Link href="/new" className="mx-auto flex min-h-11 items-center gap-1.5 rounded-full px-4 text-sm font-semibold text-muted hover:bg-mint">
        <Plus className="size-4" aria-hidden />
        {t("newIdea")}
      </Link>
    </div>
  );
}
