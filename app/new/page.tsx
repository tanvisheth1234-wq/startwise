// app/new/page.tsx   OWNER: T1 — Screen 2: Idea intake (voice/text + follow-ups)
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getIntakeState } from "@/features/intake/actions";
import { IntakeFlow } from "@/features/intake/components/IntakeFlow";
import { requireUser } from "@/lib/auth";

export default async function NewPlanPage({
  searchParams,
}: {
  searchParams: Promise<{ text?: string; mode?: string; plan?: string }>;
}) {
  const { text = "", mode, plan } = await searchParams;
  await requireUser("/new");
  const t = await getTranslations("intake");

  let initial = null;
  if (plan) {
    initial = await getIntakeState(plan); // 404s if not yours
    if (!initial) redirect(`/plan/${plan}`); // already confirmed
    if (initial.chat.done) redirect(`/plan/${plan}/profile`);
  }

  return (
    <main className="mx-auto max-w-md space-y-4 px-4 py-5 pb-10">
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-forest">{initial ? t("chatTitle") : t("title")}</h1>
        <p className="text-sm text-muted">{initial ? t("chatSubtitle") : t("subtitle")}</p>
      </div>
      <IntakeFlow initial={initial} initialText={text.slice(0, 1000)} autoListen={mode === "voice" && !initial} />
    </main>
  );
}
