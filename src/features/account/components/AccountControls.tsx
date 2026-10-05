"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ChevronRight, Loader2, Trash2 } from "lucide-react";
import { Badge, Button, Sheet } from "@/components/ui";
import { deleteMyData, deletePlan } from "../privacy";

type P = { id: string; title: string; status: string };

export function PlansList({ plans }: { plans: P[] }) {
  const t = useTranslations("account.page");
  const [list, setList] = useState(plans);
  const [, start] = useTransition();
  if (list.length === 0) return <p className="rounded-2xl bg-white/70 p-4 text-center text-muted">{t("noPlans")}</p>;
  return (
    <ul className="space-y-2">
      {list.map((p) => (
        <li key={p.id} className="flex items-center gap-2 rounded-2xl border border-line/70 bg-white p-2 pl-4 shadow-soft">
          <Link href={`/plan/${p.id}`} className="flex min-h-11 min-w-0 flex-1 items-center gap-2">
            <span className="flex-1 truncate font-semibold text-forest">{p.title}</span>
            <Badge tone={p.status === "draft" ? "sun" : "green"}>{t(p.status === "draft" ? "draft" : "active")}</Badge>
            <ChevronRight className="size-5 text-muted" aria-hidden />
          </Link>
          <button
            type="button"
            aria-label={t("deletePlan", { title: p.title })}
            onClick={() => {
              if (!confirm(t("confirmDeletePlan"))) return;
              setList((l) => l.filter((x) => x.id !== p.id));
              start(() => deletePlan(p.id));
            }}
            className="grid size-10 place-items-center rounded-full text-muted hover:bg-danger/10 hover:text-danger"
          >
            <Trash2 className="size-4" aria-hidden />
          </button>
        </li>
      ))}
    </ul>
  );
}

export function DeleteMyData() {
  const t = useTranslations("account.page");
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState(false);
  const [pending, start] = useTransition();
  return (
    <>
      <Button variant="danger" block onClick={() => setOpen(true)}>
        <Trash2 className="size-5" aria-hidden />
        {t("deleteAll")}
      </Button>
      <Sheet open={open} onClose={() => setOpen(false)} title={t("deleteAllTitle")} closeLabel={t("close")}>
        <div className="space-y-3">
          <p className="text-ink">{t("deleteAllBody")}</p>
          <label className="block space-y-1">
            <span className="text-sm font-semibold text-forest">{t("typeDelete")}</span>
            <input value={text} onChange={(e) => setText(e.target.value)} autoCapitalize="characters" className="min-h-11 w-full rounded-2xl border-2 border-line px-3 font-mono" />
          </label>
          {error && <p role="alert" className="text-sm text-danger">{t("typeDeleteError")}</p>}
          <Button
            variant="danger"
            block
            disabled={pending || text.trim().toUpperCase() !== "DELETE"}
            onClick={() =>
              start(async () => {
                const r = await deleteMyData(text);
                if (r && !r.ok) setError(true);
              })
            }
          >
            {pending && <Loader2 className="size-5 animate-spin" aria-hidden />}
            {t("deleteForever")}
          </Button>
        </div>
      </Sheet>
    </>
  );
}
