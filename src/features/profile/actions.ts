"use server";
// src/features/profile/actions.ts   OWNER: T1 — Screen 3: confirm the profile card
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { plans } from "@/db/schema";
import { roadmap } from "@/features/roadmap/api";
import { requirePlan, requireUser } from "@/lib/auth";
import { formDataToValues, parseProfileForm, type FieldErrors } from "./lib/form";

// values: what was submitted, so the card can show it again (React resets forms after an action).
export type ConfirmState = { errors?: FieldErrors; failed?: boolean; values?: Record<string, string> };

export async function confirmProfile(planId: string, _prev: ConfirmState, formData: FormData): Promise<ConfirmState> {
  const user = await requireUser();
  const plan = await requirePlan(planId);

  const raw = formDataToValues(formData);
  const values = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, typeof v === "string" ? v : ""]));
  const parsed = parseProfileForm(raw, plan.language);
  if (!parsed.ok) return { errors: parsed.errors, values };
  const profile = parsed.profile;

  await db
    .update(plans)
    .set({
      profile,
      stage: profile.stage,
      status: "confirmed",
      title: `${profile.product} · ${profile.city}`.slice(0, 120),
      updatedAt: new Date(),
      updatedBy: user.id,
    })
    .where(eq(plans.id, plan.id));

  try {
    // T2 builds the tasks and checklist from the confirmed profile (idempotent: safe to call again after edits).
    await roadmap.onProfileConfirmed(plan.id);
  } catch {
    return { failed: true, values };
  }
  // The plan shell (title, bottom nav) was rendered while the plan was a draft: refresh it.
  revalidatePath(`/plan/${plan.id}`, "layout");
  redirect(`/plan/${plan.id}`);
}
