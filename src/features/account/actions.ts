"use server";
// src/features/account/actions.ts   OWNER: T1
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { Lang } from "@/contracts/profile";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { getUser } from "@/lib/auth";
import { LOCALE_COOKIE } from "@/i18n/request";

const ONE_YEAR = 60 * 60 * 24 * 365;

/** Sets the UI language cookie and, when logged in, saves it as users.preferredLanguage. */
export async function setLanguage(lang: Lang): Promise<void> {
  const parsed = Lang.parse(lang);
  (await cookies()).set(LOCALE_COOKIE, parsed, { path: "/", maxAge: ONE_YEAR, sameSite: "lax" });

  const user = await getUser();
  if (user) {
    await db
      .update(users)
      .set({ preferredLanguage: parsed, updatedAt: new Date(), updatedBy: user.id })
      .where(eq(users.id, user.id));
  }
}
