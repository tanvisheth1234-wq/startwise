"use client";
// The front door for every fresh visit, in English: a warm hello, then "which language do you prefer?".
// Choosing a language goes straight into the conversation, in that language.
// On a laptop the right side shows a little phone with a sample chat playing, so people see the idea at once.
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { ArrowRight, Loader2 } from "lucide-react";
import { GrowingPlant, type PlantBranch } from "@/components/ui";
import { setLanguage } from "@/features/account/actions";
import { LiveChatPreview } from "./LiveChatPreview";

const OPTIONS = [
  { lang: "en", label: "English", hello: "Hello" },
  { lang: "hi", label: "हिन्दी", hello: "नमस्ते" },
  { lang: "mr", label: "मराठी", hello: "नमस्कार" },
] as const;

// Ideas real women start with: floats past to say "any idea is welcome here".
const IDEAS = ["Tiffin service", "Blouse stitching", "Soy candles", "Home tuition", "Mango pickle", "Nail art", "Eggless cakes", "Crochet toys", "Plant nursery", "Saree resale", "Millet cookies", "Bridal makeup"];

// The welcome plant: every branch is something StartWise does with her.
const GROWTH: PlantBranch[] = [
  { key: "test", label: "7-day test", state: "done" },
  { key: "money", label: "Costs & price", state: "done" },
  { key: "papers", label: "Licences", state: "done" },
  { key: "funding", label: "Funding", state: "done" },
  { key: "marketing", label: "Marketing", state: "done" },
  { key: "orders", label: "Order book", state: "done" },
];
const BLOOM: PlantBranch = { key: "customer", label: "First customer", state: "done" };

const SPRING = { type: "spring", stiffness: 120, damping: 16 } as const;

export function LanguagePicker({ name, loggedIn = false }: { name?: string; loggedIn?: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <div className="relative">
      <Blobs />
      <div className="relative grid grid-cols-[minmax(0,1fr)] items-center gap-10 py-6 lg:min-h-[calc(100dvh-7.5rem)] lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.6fr)] lg:gap-10 lg:py-2">
        <div className="flex min-w-0 flex-col items-center gap-5 text-center lg:items-start lg:gap-4 lg:text-left">
          <div className="flex flex-col items-center gap-4 lg:flex-row lg:items-center lg:gap-6">
          {/* The plant grows first thing: StartWise waters her idea and every branch is a step we take together. */}
          <GrowingPlant mode="intro" branches={GROWTH} bloom={BLOOM} labelSize={21} className="-mb-3 w-[200px] shrink-0 sm:w-[270px] lg:mb-0 lg:w-[290px] [@media(min-width:1024px)_and_(max-height:720px)]:w-[230px]" />

          <div className="space-y-3">
            <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ ...SPRING, delay: 0.15 }} className="text-5xl font-extrabold leading-[1.05] text-forest lg:text-6xl">
              {loggedIn ? `Welcome${name ? `, ${name}` : ""}.` : "Namaste."}
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ ...SPRING, delay: 0.3 }} className="font-display text-2xl font-bold text-coral-600">
              {loggedIn ? (
                "Let's start your first idea."
              ) : (
                <>
                  I&apos;m StartWise, your business{" "}
                  <span className="relative inline-block">
                    saathi
                    <svg viewBox="0 0 120 14" className="absolute -bottom-2 left-0 w-full" aria-hidden>
                      <motion.path
                        d="M2 9 C 30 2, 60 14, 118 5"
                        fill="none"
                        stroke="#ffc24b"
                        strokeWidth="5"
                        strokeLinecap="round"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.9, delay: 0.9, ease: "easeOut" }}
                      />
                    </svg>
                  </span>
                  .
                </>
              )}
            </motion.p>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 0.6 }} className="mx-auto hidden max-w-md text-lg leading-relaxed text-ink sm:block lg:mx-0">
              Tell me your business idea in your own words, even if it&apos;s just a small thought. We&apos;ll talk it through together, and step by step I&apos;ll help you turn it into a real business.
            </motion.p>
          </div>
          </div>

          <IdeaRiver />

          <div className="w-full max-w-md space-y-3 lg:max-w-none">
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="font-display text-xl font-bold text-forest">
              Which language do you prefer?
            </motion.p>
            <ul className="grid grid-cols-3 gap-2 sm:gap-3">
              {OPTIONS.map((o, i) => (
                <motion.li key={o.lang} initial={{ opacity: 0, x: -60 }} animate={{ opacity: 1, x: 0 }} transition={{ ...SPRING, delay: 0.85 + i * 0.12 }}>
                  <motion.button
                    type="button"
                    lang={o.lang}
                    disabled={pending}
                    whileHover={{ scale: 1.03, y: -3 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() =>
                      start(async () => {
                        await setLanguage(o.lang);
                        router.push("/new");
                      })
                    }
                    className="group flex min-h-16 w-full items-center justify-center rounded-3xl border-2 border-line bg-white/90 px-2 sm:justify-between sm:px-5 shadow-soft backdrop-blur transition-colors hover:border-coral hover:bg-white disabled:opacity-60"
                  >
                    <span className="font-display text-xl font-extrabold text-forest sm:text-2xl">{o.label}</span>
                    <span className="hidden items-center gap-2 text-base text-muted sm:flex">
                      {o.hello}
                      <ArrowRight className="size-5 -translate-x-1 text-coral opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" aria-hidden />
                    </span>
                  </motion.button>
                </motion.li>
              ))}
            </ul>
            {pending && <Loader2 className="mx-auto size-6 animate-spin text-coral" aria-hidden />}
          </div>
          {!loggedIn && (
            <motion.a initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.3 }} href="/login" className="text-sm font-semibold text-muted underline-offset-2 hover:underline">
              I already have an account
            </motion.a>
          )}
        </div>

        <LiveChatPreview className="hidden lg:block [@media(max-height:720px)]:-my-12 [@media(max-height:720px)]:scale-[0.82]" />
      </div>
    </div>
  );
}

/** Ideas drifting sideways in a soft band: "any idea is welcome". */
function IdeaRiver() {
  const row = [...IDEAS, ...IDEAS];
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.6 }}
      className="relative w-full max-w-md overflow-hidden lg:max-w-[min(100%,46rem)] [mask-image:linear-gradient(90deg,transparent,black_12%,black_88%,transparent)]"
      aria-hidden
    >
      <motion.div className="flex w-max gap-2" animate={{ x: ["0%", "-50%"] }} transition={{ duration: 40, ease: "linear", repeat: Infinity }}>
        {row.map((idea, i) => (
          <span key={i} className="flex items-center gap-2 whitespace-nowrap rounded-full border border-line bg-white/80 px-3 py-1.5 text-sm font-semibold text-forest shadow-soft">
            <span className="size-1.5 rounded-full bg-coral" />
            {idea}
          </span>
        ))}
      </motion.div>
    </motion.div>
  );
}

/** Big soft colour blobs that drift slowly behind everything. */
function Blobs() {
  const blobs = [
    { c: "bg-sun/35", s: "size-80", p: "-left-24 -top-16", a: { x: [0, 40, 0], y: [0, 30, 0] }, d: 14 },
    { c: "bg-coral/25", s: "size-96", p: "-right-32 top-24", a: { x: [0, -50, 0], y: [0, 40, 0] }, d: 17 },
    { c: "bg-berry/15", s: "size-72", p: "left-1/3 bottom-0", a: { x: [0, 30, 0], y: [0, -40, 0] }, d: 19 },
  ];
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      <div className="relative mx-auto h-full max-w-6xl">
        {blobs.map((b, i) => (
          <motion.div key={i} className={`absolute rounded-full blur-3xl ${b.c} ${b.s} ${b.p}`} animate={b.a} transition={{ duration: b.d, repeat: Infinity, ease: "easeInOut" }} />
        ))}
      </div>
    </div>
  );
}
