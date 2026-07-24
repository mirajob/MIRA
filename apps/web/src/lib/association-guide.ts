/**
 * Le tappe del percorso guidato dell'associazione (Panoramica), in ordine. Il completamento
 * di ciascuna e' derivato dai dati reali (vedi /association/[slug]/page.tsx); qui c'e' solo
 * l'elenco e i tipi, condivisi tra server action e UI.
 *
 * Modulo separato e non "use server": i file "use server" non possono esportare costanti.
 */
export const GUIDE_STEPS = ["public_page", "collaborators", "members", "cycles"] as const;
export type GuideStep = (typeof GUIDE_STEPS)[number];

export interface GuideStepState {
  step: GuideStep;
  /** Condizione reale soddisfatta (pagina pubblicata, cicli creati, ...). */
  done: boolean;
  /** Il board ha scelto di saltarla. */
  skipped: boolean;
  /** Dove porta la tappa. */
  href: string;
}

export function guideProgressPct(steps: GuideStepState[]): number {
  if (steps.length === 0) return 0;
  const settled = steps.filter((s) => s.done || s.skipped).length;
  return Math.round((settled / steps.length) * 100);
}

/** La prima tappa non ancora fatta ne' saltata: quella che la guida evidenzia. */
export function nextGuideStep(steps: GuideStepState[]): GuideStep | null {
  return steps.find((s) => !s.done && !s.skipped)?.step ?? null;
}
