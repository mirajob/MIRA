import type { BaseFrame, CursorTarget } from "./demo-reel";

/**
 * Scenario ASSOCIAZIONE del reel della landing.
 *
 * Segue il flusso vero della dashboard, non una versione idealizzata: apri una
 * selezione con posizioni, requisiti e domande; le candidature arrivano già
 * divise per fase, ognuna con la MiraCard dello studente; crei un round di
 * colloqui scegliendo i giorni, ognuno del board segna quando c'è, i candidati
 * invitati prenotano da soli negli orari coperti; chi accetti entra fra i membri
 * e lo sistemi nelle sezioni dell'associazione.
 *
 * Niente valutazione automatica e nessun punteggio: sono stati tolti dal
 * prodotto, e mostrarli qui sarebbe una promessa che la dashboard non mantiene.
 *
 * Associazione e candidati sono inventati. Filo narrativo: fra i candidati c'è
 * Giulia Ferrari, la stessa studentessa di cui si costruisce la card nell'hero.
 */

export type AssocBlock = "cycle" | "candidates" | "slots" | "booking" | "members";

export interface AssocFrame extends BaseFrame {
  block: AssocBlock;
  phase: string;
  cursor: CursorTarget;
}

export interface AssociationData {
  name: string;
  compose: string;
  cycleTitle: string;
  roles: string[];
  requirements: string[];
  questions: string[];
  openWindow: string;
  candidates: { name: string; role: string }[];
  round: {
    title: string;
    mode: string;
    days: string;
    /** Le fasce del giorno mostrato, con le iniziali di chi del board le copre. */
    slots: { time: string; people: string[] }[];
    board: { initials: string; name: string }[];
  };
  booking: {
    candidate: string;
    when: string;
    interviewer: string;
    link: string;
  };
  members: { section: string; people: string[] }[];
}

export const associationData: AssociationData = {
  name: "Meridian Consulting Club",
  compose: "Opening Analyst and Business Development roles: finance fundamentals, available from October.",
  cycleTitle: "Fall Recruitment 2026",
  roles: ["Analyst", "Business Development"],
  requirements: ["Finance fundamentals", "Available from October", "Analytical mindset"],
  questions: ["Why Meridian?", "Tell us about a time you led a team."],
  openWindow: "Open Oct 1 to Oct 20",
  candidates: [
    { name: "Giulia Ferrari", role: "Analyst" },
    { name: "Marco Bianchi", role: "Business Development" },
    { name: "Sofia Greco", role: "Analyst" },
  ],
  round: {
    title: "First interview",
    mode: "Online",
    days: "Oct 22 and Oct 23",
    board: [
      { initials: "LR", name: "Luca Rossi" },
      { initials: "CM", name: "Chiara Monti" },
    ],
    slots: [
      { time: "14:00", people: ["LR"] },
      { time: "14:25", people: ["LR", "CM"] },
      { time: "14:50", people: ["CM"] },
      { time: "15:15", people: [] },
    ],
  },
  booking: {
    candidate: "Giulia Ferrari",
    when: "Wed 22 Oct, 14:25",
    interviewer: "Chiara Monti",
    link: "meet.jit.si/mira-a41f…",
  },
  members: [
    { section: "Board", people: ["Luca Rossi", "Chiara Monti"] },
    { section: "Analysts", people: ["Giulia Ferrari", "Marco Bianchi"] },
  ],
};

/** Timeline dello scenario associazione (~21s). */
export const associationFrames: AssocFrame[] = [
  { block: "cycle", phase: "compose", cursor: null, duration: 3000 },
  { block: "cycle", phase: "building", cursor: "publish", tap: true, duration: 3200 },
  { block: "candidates", phase: "list", cursor: null, duration: 3000 },
  { block: "slots", phase: "availability", cursor: "invite", tap: true, duration: 3800 },
  { block: "booking", phase: "booked", cursor: null, duration: 3600 },
  { block: "members", phase: "team", cursor: null, duration: 4000 },
];
