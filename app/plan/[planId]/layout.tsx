// app/plan/[planId]/layout.tsx   (SHARED) — plan shell: loads plan, title, bottom nav from the registry
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PlanNav, type PlanNavItem } from "@/components/ui/PlanNav";
import { requirePlan } from "@/lib/auth";
import { TalkToStartWise } from "@/features/talk/components/TalkToStartWise";
import { itemWord } from "@/features/money/server/store";

export default async function PlanLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await params;
  const plan = await requirePlan(planId); // 404 if missing or not yours
  const t = await getTranslations("common");
  const tt = await getTranslations("talk");
  const pathname = (await headers()).get("x-pathname") ?? "";
  const base = `/plan/${plan.id}`;

  // A draft plan must be confirmed on the profile card first.
  if (plan.status === "draft" && !pathname.startsWith(`${base}/profile`)) {
    redirect(`${base}/profile`);
  }

  // Five doors only; everything else is one tap away on the home screen.
  const nav: PlanNavItem[] = [
    { href: base, label: t("nav.dashboard"), icon: "House", exact: true },
    { href: `${base}/roadmap`, label: t("nav.tasks"), icon: "ListChecks" },
    { href: `${base}/notebook`, label: t("nav.notebook"), icon: "BookHeart" },
    { href: `${base}/marketing`, label: t("nav.grow"), icon: "Megaphone" },
  ];

  return (
    <div className="pb-40 print:pb-0">
      <main className="mx-auto max-w-3xl px-4 py-4">{children}</main>
      {plan.status !== "draft" && <PlanNav items={nav} label={plan.title} talkLabel={tt("button")} />}
      {plan.status !== "draft" && <TalkToStartWise planId={plan.id} item={await itemWord(plan.id, plan.profile?.businessType ?? "other", plan.language)} />}
    </div>
  );
}
