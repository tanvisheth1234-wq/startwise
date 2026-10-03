"use client";
// OWNER: T1 — Screen 3: "What we understood", every value editable in place (#5, stage of #6)
import { useActionState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { AlertCircle, Check, Loader2 } from "lucide-react";
import { Button, Card, cn } from "@/components/ui";
import type { BusinessProfile } from "@/contracts/profile";
import { confirmProfile, type ConfirmState } from "../actions";
import type { FieldError } from "../lib/form";

type Field = keyof BusinessProfile;

const inputClass = "min-h-11 w-full rounded-xl border bg-white px-3 text-base";

export function ProfileCard({ planId, profile, confirmed }: { planId: string; profile: BusinessProfile; confirmed: boolean }) {
  const t = useTranslations("profile");
  const [state, action, pending] = useActionState<ConfirmState, FormData>(confirmProfile.bind(null, planId), {});
  // After a failed submit, show what the founder typed rather than the saved profile.
  const v = (field: Field, saved: string) => state.values?.[field] ?? saved;
  const missing = new Set<string>(profile.missingFields);
  if (!profile.product) missing.add("product");
  if (!profile.city) missing.add("city");
  if (profile.businessType === "other") missing.add("businessType");

  const row = (field: Field, control: ReactNode, hint?: string) => {
    const error = state.errors?.[field] as FieldError | undefined;
    const isMissing = missing.has(field) && !error;
    return (
      <div className={cn("space-y-1 rounded-xl p-2", isMissing && "bg-gold-light/25 ring-1 ring-gold/50")}>
        <label htmlFor={field} className="flex items-center justify-between gap-2 text-sm font-semibold text-forest">
          <span>{t(`fields.${field}`)}</span>
          {isMissing && <span className="text-xs font-semibold text-[#6e5328]">{t("addThis")}</span>}
        </label>
        {control}
        {hint && !error && <p className="text-xs text-muted">{hint}</p>}
        {error && (
          <p id={`${field}-error`} role="alert" className="flex items-center gap-1 text-sm text-danger">
            <AlertCircle className="size-4" aria-hidden />
            {t(`errors.${error}`)}
          </p>
        )}
      </div>
    );
  };

  const aria = (field: Field) => ({
    id: field,
    name: field,
    "aria-invalid": Boolean(state.errors?.[field]) || undefined,
    "aria-describedby": state.errors?.[field] ? `${field}-error` : undefined,
    className: cn(inputClass, state.errors?.[field] ? "border-danger" : "border-line"),
  });

  const choice = (field: Field, options: { value: string; label: string }[], current: string) => (
    <div role="radiogroup" id={field} className="flex flex-wrap gap-2">
      {options.map((o) => (
        <label
          key={o.value}
          className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-line bg-white px-3 text-sm font-medium has-[:checked]:border-teal has-[:checked]:bg-mint has-[:checked]:text-forest"
        >
          <input type="radio" name={field} value={o.value} defaultChecked={current === o.value} className="accent-teal" />
          {o.label}
        </label>
      ))}
    </div>
  );

  return (
    <form action={action} className="space-y-4" key={state.values ? JSON.stringify(state.values) : "saved"}>
      <Card className="space-y-1 p-2">
        {row("stage", choice("stage", [
          { value: "new_idea", label: t("stage.new_idea") },
          { value: "existing", label: t("stage.existing") },
        ], v("stage", profile.stage)))}
        {row("businessType", (
          <select {...aria("businessType")} defaultValue={v("businessType", profile.businessType === "other" ? "" : profile.businessType)}>
            <option value="" disabled>{t("choose")}</option>
            <option value="home_food">{t("types.home_food")}</option>
            <option value="tailoring_boutique">{t("types.tailoring_boutique")}</option>
            <option value="online_reselling">{t("types.online_reselling")}</option>
          </select>
        ))}
        {row("product", <input {...aria("product")} defaultValue={v("product", profile.product)} maxLength={120} />)}
        {row("city", <input {...aria("city")} defaultValue={v("city", profile.city)} maxLength={60} autoComplete="address-level2" />)}
        {row("locality", <input {...aria("locality")} defaultValue={v("locality", profile.locality ?? "")} maxLength={80} />)}
        {row("premises", choice("premises", [
          { value: "home", label: t("premises.home") },
          { value: "shop", label: t("premises.shop") },
        ], v("premises", profile.premises ?? "")))}
        {row("sellsOnline", choice("sellsOnline", [
          { value: "true", label: t("yes") },
          { value: "false", label: t("no") },
        ], v("sellsOnline", profile.sellsOnline === null ? "" : String(profile.sellsOnline))))}
        {row("targetCustomer", <input {...aria("targetCustomer")} defaultValue={v("targetCustomer", profile.targetCustomer ?? "")} maxLength={160} />)}
        {row("budgetInr", <input {...aria("budgetInr")} defaultValue={v("budgetInr", profile.budgetInr == null ? "" : String(profile.budgetInr))} inputMode="numeric" />, t("hints.rupees"))}
        {row("hoursPerDay", <input {...aria("hoursPerDay")} defaultValue={v("hoursPerDay", profile.hoursPerDay == null ? "" : String(profile.hoursPerDay))} inputMode="decimal" />)}
        {row("expectedMonthlySalesInr", <input {...aria("expectedMonthlySalesInr")} defaultValue={v("expectedMonthlySalesInr", profile.expectedMonthlySalesInr == null ? "" : String(profile.expectedMonthlySalesInr))} inputMode="numeric" />, t("hints.optionalSales"))}
      </Card>

      {state.errors && <p role="alert" className="rounded-lg bg-danger/10 p-2 text-sm text-danger">{t("fixErrors")}</p>}
      {state.failed && <p role="alert" className="rounded-lg bg-danger/10 p-2 text-sm text-danger">{t("saveFailed")}</p>}

      <Button type="submit" block size="lg" disabled={pending}>
        {pending ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Check className="size-5" aria-hidden />}
        {confirmed ? t("saveChanges") : t("confirm")}
      </Button>
    </form>
  );
}
