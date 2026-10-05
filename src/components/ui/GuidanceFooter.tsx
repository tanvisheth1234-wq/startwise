import { useTranslations } from "next-intl";
import { Info } from "lucide-react";
import { cn } from "./cn";

/** #45 "Guidance, not legal advice" line. Required on Compliance, Funding, Validate, Launch Pack, First customers. */
export function GuidanceFooter({ className }: { className?: string }) {
  const t = useTranslations("common");
  return (
    <p className={cn("mt-6 flex items-start gap-2 rounded-2xl bg-sun-light/70 p-3 text-sm text-ink", className)}>
      <Info className="mt-0.5 size-4 shrink-0 text-[#b07800]" aria-hidden />
      <span>{t("guidance")}</span>
    </p>
  );
}
