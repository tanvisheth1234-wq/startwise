// app/new/page.tsx — the first conversation (name → speak or text → idea → warm chat → make my plan)
import { redirect } from "next/navigation";
import { Conversation } from "@/features/intake/components/Conversation";
import { loadConversation } from "@/features/intake/conversation";
import { requireUser } from "@/lib/auth";

export default async function NewPlanPage({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  const { plan } = await searchParams;
  const user = await requireUser("/new");

  let initial = null;
  if (plan) {
    initial = await loadConversation(plan); // 404s if not hers
    if (!initial) redirect(`/plan/${plan}`); // already confirmed
  }

  return (
    <main className="mx-auto max-w-md px-4 lg:max-w-6xl lg:px-8">
      <Conversation initial={initial} knownName={user.isGuest ? undefined : user.name} />
    </main>
  );
}
