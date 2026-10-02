// app/plan/[planId]/layout.tsx   (SHARED) — plan shell: loads plan, title, bottom nav from the registry
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  Calculator, FileDown, FlaskConical, HandCoins, House, ListChecks, MapPin, Scale, Users, type LucideIcon,
} from "lucide-react";
import { MODULES, type ModuleIcon } from "@/features/registry";
import { requirePlan } from "@/lib/auth";

const ICONS: Record<ModuleIcon, LucideIcon> = {
  FlaskConical, MapPin, Scale, Calculator, HandCoins, ListChecks, Users, FileDown,
};

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

  const nav = [
    { href: base, label: t("nav.dashboard"), Icon: House, active: pathname === base },
    ...MODULES.map((m) => ({
      href: `${base}/${m.route}`,
      label: t(m.labelKey.replace(/^common\./, "") as "nav.validate"),
      Icon: ICONS[m.icon],
      active: pathname.startsWith(`${base}/${m.route}`),
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

      {plan.status !== "draft" && (
        <nav
          aria-label={plan.title}
          className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white pb-[env(safe-area-inset-bottom)] print:hidden"
        >
          <ul className="mx-auto flex max-w-3xl overflow-x-auto">
            {nav.map(({ href, label, Icon, active }) => (
              <li key={href} className="shrink-0">
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-14 min-w-[4.5rem] flex-col items-center justify-center gap-0.5 px-2 text-[11px] font-semibold ${
                    active ? "text-forest" : "text-muted hover:text-forest"
                  }`}
                >
                  <Icon className={`size-5 ${active ? "text-gold" : ""}`} aria-hidden />
                  <span className="whitespace-nowrap">{label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
