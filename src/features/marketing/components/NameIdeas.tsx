"use client";
// "Need a name?": five brand names with taglines. Tapping one hands it to the price card.
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Wand2 } from "lucide-react";
import { Button, GrowingWait } from "@/components/ui";
import type { NameIdeas } from "@/lib/ai/extras";
import { generateNames } from "../actions";

export function NameIdeasCard({ planId, initial }: { planId: string; initial: NameIdeas | null }) {
  const t = useTranslations("marketing.names");
  const tc = useTranslations("common.wait");
  const [ideas, setIdeas] = useState(initial);
  const [failed, setFailed] = useState(false);
  const [pending, start] = useTransition();

  return (
    <section className="space-y-3 rounded-3xl border border-line/70 bg-white p-4 shadow-soft">
      <h2 className="font-display text-xl font-bold text-forest">{t("title")}</h2>
      <p className="text-sm text-muted">{t("subtitle")}</p>
      {ideas && (
        <ul className="stagger space-y-2">
          {ideas.names.map((n) => (
            <li key={n.name}>
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent("sw:brand", { detail: { name: n.name, tagline: n.tagline } }))}
                className="w-full rounded-2xl bg-gradient-to-r from-mint to-sun-light p-3 text-left transition-transform hover:-translate-y-0.5"
              >
                <span className="block font-display text-lg font-extrabold text-coral-600">{n.name}</span>
                <span className="block text-sm font-semibold italic text-forest">“{n.tagline}”</span>
                <span className="block text-xs text-muted">{n.why}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <Button
        variant={ideas ? "secondary" : "primary"}
        block
        disabled={pending}
        onClick={() =>
          start(async () => {
            setFailed(false);
            const r = await generateNames(planId);
            if (r.ok) setIdeas(r.ideas);
            else setFailed(true);
          })
        }
      >
        {pending ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Wand2 className="size-5" aria-hidden />}
        {ideas ? t("more") : t("make")}
      </Button>
      {pending && <GrowingWait message={tc("thinking")} />}
      {ideas && <p className="text-center text-xs text-muted">{t("tapHint")}</p>}
      {failed && <p role="alert" className="text-sm text-danger">{t("failed")}</p>}
    </section>
  );
}
