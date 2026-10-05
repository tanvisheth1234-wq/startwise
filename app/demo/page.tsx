// app/demo/page.tsx — "See a live demo": the proxy has already started a guest session,
// so this page just asks the server to copy Sunita's plan for this visitor.
import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/ui";
import { DemoStarter } from "@/features/demo/DemoStarter";

export default async function DemoPage() {
  const t = await getTranslations("start.demo");
  return (
    <main className="mx-auto flex min-h-[70dvh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <Logo className="size-16 animate-breathe rounded-2xl" />
      <h1 className="text-2xl font-extrabold text-forest">{t("preparing")}</h1>
      <p className="text-muted">{t("preparingSub")}</p>
      <DemoStarter />
    </main>
  );
}
