// app/plan/[planId]/profile/page.tsx   OWNER: T1 — Screen 3: editable profile card
import { getTranslations } from "next-intl/server";
import { MessageCircle } from "lucide-react";
import { mergeProfile } from "@/lib/ai/profile";
import { requirePlan } from "@/lib/auth";
import { BusinessReveal } from "@/features/profile/components/BusinessReveal";
import { ProfileCard } from "@/features/profile/components/ProfileCard";

export default async function ProfilePage({ params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params;
  const plan = await requirePlan(planId);
  const t = await getTranslations("profile");
  const profile = plan.profile ?? mergeProfile(undefined, {}, plan.language);
  const confirmed = plan.status === "confirmed";

  // New plan: the friendly "here's your business" reveal. Later edits: the full card.
  if (!confirmed) return <BusinessReveal planId={plan.id} profile={profile} />;

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-forest">{t("title")}</h2>
        <p className="text-sm text-muted">{confirmed ? t("subtitleEdit") : t("subtitle")}</p>
      </div>
      {plan.ideaText && (
        <p className="flex gap-2 rounded-xl bg-white p-3 text-sm text-muted">
          <MessageCircle className="mt-0.5 size-4 shrink-0 text-teal" aria-hidden />
          <span>
            <span className="font-semibold text-forest">{t("youSaid")} </span>“{plan.ideaText}”
          </span>
        </p>
      )}
      <ProfileCard planId={plan.id} profile={profile} confirmed={confirmed} />
    </div>
  );
}
