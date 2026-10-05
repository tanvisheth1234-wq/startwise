// app/page.tsx — the front door.
// Logged-in founder → "Welcome back" + continue her plan. Guest or new visitor → a warm hello in
// English and "which language do you prefer?", which goes straight into the conversation.
import { getLocale } from "next-intl/server";
import { Lang } from "@/contracts/profile";
import { listPlans } from "@/features/account/server/plans";
import { LanguagePicker } from "@/features/welcome/components/LanguagePicker";
import { WelcomeBack } from "@/features/welcome/components/WelcomeBack";
import { getUser } from "@/lib/auth";

export default async function StartPage() {
  const user = await getUser();
  // Like most apps: only a logged-in founder is remembered. A guest always starts fresh.
  const plans = user && !user.isGuest ? await listPlans(user.id, 1) : [];
  const parsed = Lang.safeParse(await getLocale());
  const lang = parsed.success ? parsed.data : "en";
  const latest = plans.find((p) => p.status === "confirmed") ?? plans[0];

  return (
    <main className={latest?.status === "confirmed" ? "mx-auto max-w-md px-4 pb-12 pt-4" : "mx-auto max-w-6xl overflow-x-clip px-4 pb-12 pt-4 lg:px-8"}>
      {latest?.status === "confirmed" ? (
        <WelcomeBack planId={latest.id} title={latest.title} lang={lang} />
      ) : (
        <LanguagePicker loggedIn={Boolean(user && !user.isGuest)} name={user?.name} />
      )}
    </main>
  );
}
