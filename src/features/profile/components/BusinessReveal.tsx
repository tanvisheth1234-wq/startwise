"use client";
// OWNER: T1 — Screen 3 for a new plan: "Here's your business" in plain words, one big button,
// and the full editable card only if the founder wants to change something.
import { useActionState, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { Lang } from "@/contracts/profile";
import { ReadAloud } from "@/features/intake/ui";
import { Check, Clock, Home, Loader2, MapPin, Pencil, Sparkles, Store, Users, Wallet } from "lucide-react";
import { Button, cn } from "@/components/ui";
import type { BusinessProfile } from "@/contracts/profile";
import { confirmProfile, type ConfirmState } from "../actions";
import { ProfileCard } from "./ProfileCard";

const inr = (n: number) => "₹" + n.toLocaleString("en-IN");

/** Profile → the same string values the editable card submits. */
function hiddenValues(p: BusinessProfile): Record<string, string> {
  return {
    stage: p.stage,
    businessType: p.businessType,
    product: p.product,
    city: p.city,
    locality: p.locality ?? "",
    premises: p.premises ?? "",
    sellsOnline: p.sellsOnline === null ? "" : String(p.sellsOnline),
    targetCustomer: p.targetCustomer ?? "",
    budgetInr: p.budgetInr == null ? "" : String(p.budgetInr),
    hoursPerDay: p.hoursPerDay == null ? "" : String(p.hoursPerDay),
    expectedMonthlySalesInr: p.expectedMonthlySalesInr == null ? "" : String(p.expectedMonthlySalesInr),
  };
}

export function BusinessReveal({ planId, profile }: { planId: string; profile: BusinessProfile }) {
  const t = useTranslations("profile.reveal");
  const tp = useTranslations("profile");
  const lang = useLocale() as Lang;
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState<ConfirmState, FormData>(confirmProfile.bind(null, planId), {});

  // Something essential is missing (or the quick confirm failed validation): show the full card.
  const needsCard = !profile.product || !profile.city || Boolean(state.errors);
  if (editing || needsCard) {
    return <ProfileCard planId={planId} profile={profile} confirmed={false} />;
  }

  const where = [profile.locality, profile.city].filter(Boolean).join(", ");
  const facts = [
    { icon: profile.premises === "shop" ? Store : Home, label: t("worksFrom"), value: profile.premises ? tp(`premises.${profile.premises}`) : t("notSure") },
    { icon: MapPin, label: t("where"), value: where || t("notSure") },
    { icon: Users, label: t("forWhom"), value: profile.targetCustomer || t(`defaultCustomer.${profile.businessType}`) },
    { icon: Wallet, label: t("budget"), value: profile.budgetInr != null ? t("upTo", { amount: inr(profile.budgetInr) }) : t("notSure") },
    ...(profile.hoursPerDay != null ? [{ icon: Clock, label: t("hours"), value: t("hoursValue", { count: profile.hoursPerDay }) }] : []),
  ];

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-sun via-coral to-berry p-[3px] shadow-lift animate-pop">
        <div className="rounded-[calc(2rem-3px)] bg-white p-5">
          <p className="flex items-center gap-1.5 font-display text-sm font-bold uppercase tracking-widest text-coral-600">
            <Sparkles className="size-4" aria-hidden />
            {t("eyebrow")}
          </p>
          <h2 className="mt-1 text-3xl font-extrabold leading-tight first-letter:uppercase text-forest">{profile.product}</h2>
          {profile.businessType !== "other" && <p className="mt-1 text-muted">{tp(`types.${profile.businessType as "home_food"}`)}</p>}

          <ul className="stagger mt-4 grid grid-cols-[minmax(0,1fr)] gap-2">
            {facts.map(({ icon: Icon, label, value }) => (
              <li key={label} className="flex items-center gap-3 rounded-2xl bg-mint/70 px-3 py-2.5">
                <Icon className="size-5 shrink-0 text-coral" aria-hidden />
                <span className="min-w-0">
                  <span className="block text-xs font-semibold text-muted">{label}</span>
                  <span className="block font-semibold text-forest first-letter:uppercase">{value}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="rounded-3xl border-2 border-dashed border-sage/40 bg-sage-light/60 p-4">
        <p className="text-xs font-bold uppercase tracking-widest text-sage">{t("firstStepLabel")}</p>
        <p className="mt-1 font-display text-lg font-bold text-forest">{t("firstStep")}</p>
        <p className="text-sm text-muted">{t("firstStepWhy")}</p>
        <ReadAloud text={`${t("eyebrow")}: ${profile.product}. ${facts.map((f) => `${f.label}: ${f.value}`).join(". ")}. ${t("firstStepLabel")}: ${t("firstStep")}. ${t("firstStepWhy")}`} lang={lang} className="mt-2" />
      </section>

      <form action={action} className="space-y-3">
        {Object.entries(hiddenValues(profile)).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
        {state.failed && <p role="alert" className="rounded-2xl bg-danger/10 p-3 text-sm text-danger">{tp("saveFailed")}</p>}
        <Button type="submit" block size="lg" disabled={pending}>
          {pending ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Check className="size-5" aria-hidden />}
          {pending ? t("building") : tp("confirm")}
        </Button>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className={cn("flex min-h-11 w-full items-center justify-center gap-2 text-sm font-semibold text-muted hover:text-forest")}
        >
          <Pencil className="size-4" aria-hidden />
          {t("change")}
        </button>
      </form>
    </div>
  );
}
