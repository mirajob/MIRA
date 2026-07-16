import type { BaseFrame, CursorTarget } from "./demo-reel";

/**
 * Scenario ASSOCIAZIONE del reel della landing.
 *
 * Riflette il flusso reale della dashboard associazione: apri le candidature per la
 * tua associazione impostando posizioni, requisiti, descrizione ed eventuali domande
 * personalizzate, pubblichi con una finestra di date, ricevi le candidature, apri un
 * candidato e vedi la sua MIRA Card + le risposte + la valutazione AI, poi gestisci la
 * selezione (invita a colloquio, cambia stato, accetta/rifiuta).
 *
 * L'AI assiste, non decide: è la persona che clicca "invita/accetta".
 *
 * Associazione e candidati sono inventati. Filo narrativo: tra i candidati c'è
 * Giulia Ferrari, la stessa studentessa di cui si costruisce la card nell'hero.
 */

export type AssocBlock = "cycle" | "candidates" | "detail" | "pipeline";

export interface AssocFrame extends BaseFrame {
  block: AssocBlock;
  phase: string;
  cursor: CursorTarget;
}

export interface AssociationData {
  name: string;
  monogram: string;
  compose: string;
  cycleTitle: string;
  roles: string[];
  requirements: string[];
  questions: string[];
  openWindow: string;
  candidates: { name: string; role: string; match: string }[];
  detail: {
    name: string;
    course: string;
    motivationA: string;
    evalScore: string;
    evalBullets: string[];
  };
  pipeline: { review: string[]; interview: string[]; accepted: string[] };
}

export const associationData: AssociationData = {
  name: "Meridian Consulting Club",
  monogram: "M",
  compose: "Opening Analyst and Business Development roles — finance fundamentals, available from October.",
  cycleTitle: "Fall Recruitment 2026",
  roles: ["Analyst", "Business Development"],
  requirements: ["Finance fundamentals", "Available from October", "Analytical mindset"],
  questions: ["Why Meridian?", "Tell us about a time you led a team."],
  openWindow: "Open Oct 1 – Oct 20",
  candidates: [
    { name: "Giulia Ferrari", role: "Analyst", match: "92" },
    { name: "Marco Bianchi", role: "Business Development", match: "84" },
    { name: "Sofia Greco", role: "Analyst", match: "78" },
  ],
  detail: {
    name: "Giulia Ferrari",
    course: "BSc Economics & Management (CLEAM) · 28.5/30",
    motivationA: "I've followed your market-entry cases for a year and want to learn consulting by doing, not just reading about it.",
    evalScore: "8.6",
    evalBullets: [
      "Solid finance foundation; top-quartile GPA.",
      "Availability and goals match the analyst track.",
    ],
  },
  pipeline: {
    review: ["Sofia Greco"],
    interview: ["Giulia Ferrari", "Marco Bianchi"],
    accepted: [],
  },
};

/** Timeline dello scenario associazione (~20s). */
export const associationFrames: AssocFrame[] = [
  { block: "cycle", phase: "compose", cursor: null, duration: 3200 },
  { block: "cycle", phase: "building", cursor: "publish", tap: true, duration: 3400 },
  { block: "candidates", phase: "list", cursor: "candidate", tap: true, duration: 3200 },
  { block: "detail", phase: "view", cursor: null, duration: 3200 },
  { block: "detail", phase: "invite", cursor: "invite", tap: true, duration: 2600 },
  { block: "pipeline", phase: "board", cursor: null, duration: 4200 },
];
