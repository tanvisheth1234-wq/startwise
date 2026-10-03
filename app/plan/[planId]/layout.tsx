// app/plan/[planId]/layout.tsx   (SHARED) — plan shell: loads plan, title, bottom nav from the registry
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PlanNav, type PlanNavItem } from "@/components/ui/PlanNav";
import { MODULES } from "@/features/registry";
import { requirePlan } from "@/lib/auth";

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
  const pathname = (await headers()).get("x-pathname") ?? "";
  const base = `/plan/${plan.id}`;

  // A draft plan must be confirmed on the profile card first.
  if (plan.status === "draft" && !pathname.startsWith(`${base}/profile`)) {
    redirect(`${base}/profile`);
  }

  const nav: PlanNavItem[] = [
    { href: base, label: t("nav.dashboard"), icon: "House", exact: true },
    ...MODULES.map((m) => ({
      href: `${base}/${m.route}`,
      label: t(m.labelKey.replace(/^common\./, "") as "nav.validate"),
      icon: m.icon,
    })),
  ];

  return (
    <div className="pb-24 print:pb-0">
      <div className="border-b border-line bg-white print:hidden">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-2">
          <h1 className="truncate text-base font-semibold text-forest">{plan.title}</h1>
        </div>
      </div>
      <main className="mx-auto max-w-3xl px-4 py-4">{children}</main>
      {plan.status !== "draft" && <PlanNav items={nav} label={plan.title} />}
    </div>
  );
}
