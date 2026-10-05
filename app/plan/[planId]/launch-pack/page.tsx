// app/plan/[planId]/launch-pack/page.tsx — Launch Pack preview + download (#41)
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { FileDown } from "lucide-react";
import { buttonClasses } from "@/components/ui";
import { Lang } from "@/contracts/profile";
import { LaunchPackDocument } from "@/features/launch-pack/Document";
import { requirePlan } from "@/lib/auth";

export default async function LaunchPackPage({ params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params;
  const plan = await requirePlan(planId);
  const parsed = Lang.safeParse(await getLocale());
  const lang = parsed.success ? parsed.data : plan.language;
  const t = await getTranslations("launchPack");

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-extrabold text-forest">{t("title")}</h1>
        <p className="text-muted">{t("subtitle")}</p>
      </header>
      <Link href={`/plan/${planId}/launch-pack/print`} target="_blank" className={buttonClasses("primary", "lg", "w-full")}>
        <FileDown className="size-5" aria-hidden />
        {t("download")}
      </Link>
      <p className="text-center text-xs text-muted">{t("downloadHint")}</p>
      <div className="rounded-[2rem] border border-line/70 bg-white p-4 shadow-soft">
        <LaunchPackDocument plan={plan} lang={lang} />
      </div>
    </div>
  );
}
