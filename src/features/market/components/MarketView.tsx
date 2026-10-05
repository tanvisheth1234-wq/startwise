"use client";
// Market check: a map of similar shops nearby, what that means, and the usual local price range.
import { useEffect, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { Loader2, MapPinned, Store } from "lucide-react";
import { Skeleton } from "@/components/ui";
import { getNearby, type Nearby } from "../actions";

const NearbyMap = dynamic(() => import("./NearbyMap"), { ssr: false, loading: () => <Skeleton className="h-72 w-full rounded-3xl" /> });

export function MarketView({ planId, initial }: { planId: string; initial: Nearby | null }) {
  const t = useTranslations("market");
  const [nearby, setNearby] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (initial) return;
    start(async () => {
      const r = await getNearby(planId);
      if (r.ok) setNearby(r.nearby);
      else setError(r.error);
    });
  }, [initial, planId]);

  const count = nearby?.places.length ?? 0;
  const named = nearby?.places.filter((p) => p.name).slice(0, 6) ?? [];

  return (
    <section className="space-y-3">
      {pending && !nearby && (
        <p className="flex items-center gap-2 rounded-3xl bg-white p-4 text-sm text-muted shadow-soft">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          {t("loading")}
        </p>
      )}
      {error && <p className="rounded-3xl bg-sun-light p-4 text-sm">{t(`errors.${error as "failed"}`)}</p>}
      {nearby && (
        <>
          <NearbyMap nearby={nearby} youLabel={t("you")} />
          <div className="rounded-3xl border border-line/70 bg-white p-4 shadow-soft">
            <p className="flex items-center gap-2 font-display text-lg font-bold text-forest">
              <MapPinned className="size-5 text-coral" aria-hidden />
              {t("count", { count, area: nearby.area })}
            </p>
            <p className="mt-1 text-sm text-muted">{count >= 8 ? t("busy") : count >= 3 ? t("some") : t("few")}</p>
            {named.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {named.map((p, i) => (
                  <li key={i} className="flex items-center gap-1 rounded-full bg-mint px-3 py-1 text-xs font-semibold text-forest">
                    <Store className="size-3" aria-hidden />
                    {p.name}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-xs text-muted">{t("note")}</p>
          </div>
        </>
      )}
    </section>
  );
}
