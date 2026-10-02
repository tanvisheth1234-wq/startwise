import { useTranslations } from "next-intl";
import { Hammer } from "lucide-react";
import { EmptyState } from "./EmptyState";

export type ScreenKey =
  | "start" | "login" | "intake" | "profile" | "dashboard" | "validate" | "market" | "compliance"
  | "money" | "funding" | "roadmap" | "firstCustomers" | "launchPack" | "account" | "admin";

/** Phase 0 placeholder: "Compliance (T2): coming soon". */
export function ComingSoon({ screen, owner }: { screen: ScreenKey; owner: "T1" | "T2" }) {
  const t = useTranslations("common");
  return (
    <EmptyState
      icon={<Hammer className="size-8" aria-hidden />}
      title={t("comingSoon", { screen: t(`screens.${screen}`), owner })}
    />
  );
}
