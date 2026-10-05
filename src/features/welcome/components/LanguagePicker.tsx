"use client";
// The front door for every fresh visit, in English: a warm hello, then "which language do you prefer?".
// Choosing a language goes straight into the conversation, in that language.
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { FadeUp, Logo, PopIn, Stagger, StaggerItem, Tappable } from "@/components/ui";
import { setLanguage } from "@/features/account/actions";

const OPTIONS = [
  { lang: "en", label: "English", hello: "Hello" },
  { lang: "hi", label: "हिन्दी", hello: "नमस्ते" },
  { lang: "mr", label: "मराठी", hello: "नमस्कार" },
] as const;

export function LanguagePicker({ name, loggedIn = false }: { name?: string; loggedIn?: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <div className="flex min-h-[75dvh] flex-col items-center justify-center gap-7 text-center">
      <PopIn>
        <Logo className="size-20 animate-float" />
      </PopIn>
      <FadeUp delay={0.15} className="space-y-3">
        <h1 className="text-4xl font-extrabold leading-tight text-forest">{loggedIn ? `Welcome${name ? `, ${name}` : ""}! 👋` : "Namaste! 🙏"}</h1>
        <p className="font-display text-2xl font-bold text-coral-600">{loggedIn ? "Let's start your first idea." : "I'm StartWise, your business saathi."}</p>
        <p className="mx-auto max-w-sm text-lg leading-relaxed text-ink">
          Tell me your business idea in your own words, even if it&apos;s just a small thought. We&apos;ll talk it through together, and step by step I&apos;ll help you turn it into a real business.
        </p>
      </FadeUp>
      <div className="w-full max-w-xs space-y-3">
        <FadeUp delay={0.35}>
          <p className="font-display text-xl font-bold text-forest">Which language do you prefer?</p>
        </FadeUp>
        <Stagger as="ul" delay={0.45} gap={0.09} className="space-y-3">
          {OPTIONS.map((o) => (
            <StaggerItem as="li" key={o.lang}>
              <Tappable>
              <button
                type="button"
                lang={o.lang}
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    await setLanguage(o.lang);
                    router.push("/new");
                  })
                }
                className="flex min-h-16 w-full items-center justify-between rounded-3xl border-2 border-line bg-white px-6 shadow-soft transition-colors hover:border-coral disabled:opacity-60"
              >
                <span className="font-display text-2xl font-extrabold text-forest">{o.label}</span>
                <span className="text-lg text-muted">{o.hello} 👋</span>
              </button>
              </Tappable>
            </StaggerItem>
          ))}
        </Stagger>
        {pending && <Loader2 className="mx-auto size-6 animate-spin text-coral" aria-hidden />}
      </div>
      {!loggedIn && <a href="/login" className="text-sm font-semibold text-muted underline-offset-2 hover:underline">I already have an account</a>}
    </div>
  );
}
