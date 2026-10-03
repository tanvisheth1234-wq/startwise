"use client";
// OWNER: T1 — Screen 2: confirm the idea, then answer follow-ups, then go to the profile card.
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  answerFollowUp, answerQuickReply, chooseBusinessType, skipFollowUps, startPlan,
  type IntakeResult, type IntakeState,
} from "../actions";
import { FollowUpChat } from "./FollowUpChat";
import { Transcript } from "./Transcript";

export function IntakeFlow({
  initial,
  initialText,
  autoListen,
}: {
  initial: IntakeState | null;
  initialText: string;
  autoListen: boolean;
}) {
  const t = useTranslations("intake");
  const router = useRouter();
  const [state, setState] = useState<IntakeState | null>(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  // Finished: on to the editable profile card.
  const done = state?.chat.done;
  const planId = state?.planId;
  useEffect(() => {
    if (done && planId) router.push(`/plan/${planId}/profile`);
  }, [done, planId, router]);

  const run = (fn: () => Promise<IntakeResult>) =>
    new Promise<IntakeResult>((resolve) => {
      setError(null);
      startTransition(async () => {
        const r = await fn();
        if (r.ok) {
          setState(r.state);
          // Keep the plan in the URL so a refresh resumes the chat.
          if (!state) router.replace(`/new?plan=${r.state.planId}`, { scroll: false });
        } else {
          setError(r.error);
        }
        resolve(r);
      });
    });

  if (!state) {
    return (
      <>
        <Transcript initialText={initialText} autoListen={autoListen} pending={busy} onConfirm={(text) => run(() => startPlan(text))} />
        {error && <p role="alert" className="mt-3 rounded-lg bg-danger/10 p-2 text-sm text-danger">{t(`errors.${error}`)}</p>}
      </>
    );
  }

  const id = state.planId;
  return (
    <FollowUpChat
      state={state}
      busy={busy || Boolean(done)}
      error={error}
      handlers={{
        answer: (text) => run(() => answerFollowUp(id, text)),
        quick: (field, chipId, label) => run(() => answerQuickReply(id, field, chipId, label)),
        chooseType: (type, label) => run(() => chooseBusinessType(id, type, label)),
        skip: () => run(() => skipFollowUps(id)),
      }}
    />
  );
}
