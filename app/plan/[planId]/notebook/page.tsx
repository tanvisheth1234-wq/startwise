// app/plan/[planId]/notebook/page.tsx — Idea Notebook
import { getTranslations } from "next-intl/server";
import { loadNotebook } from "@/features/notebook/actions";
import { NotebookView } from "@/features/notebook/components/NotebookView";
import { WorryBox } from "@/features/notebook/components/WorryBox";
import { requirePlan } from "@/lib/auth";

export default async function NotebookPage({ params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params;
  await requirePlan(planId);
  const t = await getTranslations("notebook");
  const nb = await loadNotebook(planId);

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-extrabold text-forest">{t("title")}</h1>
        <p className="text-muted">{t("subtitle")}</p>
      </header>
      <NotebookView planId={planId} initial={nb} />
      <WorryBox planId={planId} />
    </div>
  );
}
