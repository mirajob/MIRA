"use client";

import { useRouter } from "next/navigation";
import { SessionForm, type SessionInitialValues } from "../../session-form";

/**
 * Involucro client attorno al form: serve solo a riportare alla pagina del round
 * quando la modifica è salvata o annullata.
 */
export function EditSessionForm({
  associationId,
  slug,
  sessionId,
  cycleId,
  initial,
}: {
  associationId: string;
  slug: string;
  sessionId: string;
  cycleId: string;
  initial: SessionInitialValues;
}) {
  const router = useRouter();

  return (
    <SessionForm
      associationId={associationId}
      slug={slug}
      cycleId={cycleId}
      sessionId={sessionId}
      initial={initial}
      onDone={() => router.push(`/association/${slug}/colloqui/${sessionId}`)}
    />
  );
}
