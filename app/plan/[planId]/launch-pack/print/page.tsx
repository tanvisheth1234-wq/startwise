// app/plan/[planId]/launch-pack/print/page.tsx — A4 print layout; opens the browser's "Save as PDF".
// Uses the page's own fonts (Noto Sans Devanagari, Baloo 2), so Hindi and Marathi print correctly.
import { getLocale } from "next-intl/server";
import { Lang } from "@/contracts/profile";
import { LaunchPackDocument } from "@/features/launch-pack/Document";
import { PrintOnLoad } from "@/features/launch-pack/PrintOnLoad";
import { requirePlan } from "@/lib/auth";

export default async function LaunchPackPrint({ params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params;
  const plan = await requirePlan(planId);
  const parsed = Lang.safeParse(await getLocale());
  const lang = parsed.success ? parsed.data : plan.language;

  return (
    <div className="mx-auto max-w-[800px] bg-white p-6 print:p-0">
      <style>{`
        @page { size: A4; margin: 14mm; }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .lp-section { break-before: auto; }
          .lp-cover { break-after: page; min-height: 60vh; }
        }
      `}</style>
      <PrintOnLoad />
      <LaunchPackDocument plan={plan} lang={lang} />
    </div>
  );
}
