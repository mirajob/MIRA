/**
 * L'onboarding guidato dell'associazione: la prima volta che il board entra, MIRA lo
 * accompagna a costruire le sezioni una alla volta e in ordine — come l'onboarding della
 * MiraCard. Finito (o saltato tutto), l'onboarding sparisce e restano le sezioni normali.
 *
 * Le tappe si costruiscono inline: pagina pubblica, team (collaboratori + membri), cicli.
 *
 * Modulo separato e non "use server": esporta costanti e tipi condivisi tra server e UI.
 */
export const ONBOARDING_STEPS = ["public_page", "team", "cycles"] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export interface OnboardingState {
  /** L'onboarding e' in corso: si mostra solo il percorso guidato, non le tab. */
  active: boolean;
  /** Indice della tappa corrente in ONBOARDING_STEPS. */
  step: number;
  completed: boolean;
}

/**
 * Legge lo stato dell'onboarding dal profilo associazione.
 *
 * Regola per le associazioni gia' esistenti prima di questa feature: hanno onboarding_state
 * vuoto ({}) e NON devono essere buttate in un onboarding — hanno gia' i loro contenuti. Solo
 * le associazioni che nascono con {step, completed} (vedi trigger) entrano nel percorso.
 */
export function readOnboardingState(raw: unknown): OnboardingState {
  const obj = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const hasStep = typeof obj.step === "number";
  const completed = Boolean(obj.completed);
  const step = hasStep ? (obj.step as number) : 0;
  return {
    active: hasStep && !completed,
    step: Math.max(0, Math.min(step, ONBOARDING_STEPS.length)),
    completed,
  };
}

export function onboardingProgressPct(step: number): number {
  return Math.round((Math.min(step, ONBOARDING_STEPS.length) / ONBOARDING_STEPS.length) * 100);
}
