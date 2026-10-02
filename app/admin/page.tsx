// app/admin/page.tsx   OWNER: T2 — Phase 0 placeholder (team only)
import { notFound } from "next/navigation";
import { ComingSoon } from "@/components/ui";
import { isAdmin } from "@/lib/auth";

export default async function Page() {
  if (!(await isAdmin())) notFound();
  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <ComingSoon screen="admin" owner="T2" />
    </main>
  );
}
