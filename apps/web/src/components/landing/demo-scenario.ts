/**
 * Dati e timeline del reel dimostrativo della landing.
 *
 * Lo SCENARIO è separato dal motore che lo anima (`landing-demo.tsx`): un motore
 * generico + N scenari (studente, associazione, azienda).
 *
 * L'ordine dei beat è quello VERO dell'onboarding (vedi `derivePhase` in
 * `lib/actions/onboarding-flow.ts`): disponibilità e piano, esperienze, studi,
 * gate della candidatura, esami (facoltativi), competenze, lingue, profilo
 * personale. Il libretto NON è più la prima cosa che si chiede: chiederlo per
 * primo faceva abbandonare, e il reel non può raccontare un percorso che non
 * esiste più.
 *
 * Il CONTENUTO della card è sempre in inglese (la MIRA Card lo è per prodotto),
 * anche quando la chat/guida è in italiano: qui i dati sono quindi in inglese,
 * tranne i testi "grezzi" che lo studente scrive di suo pugno prima che
 * ✦ Migliora con MIRA li riscriva. La cornice localizzata (guide, etichette dei
 * bottoni) vive nei messaggi i18n, non qui.
 */

import type { CursorTarget } from "./demo-reel";

export type StudentBlock =
  | "disponibilita"
  | "esperienze"
  | "studi"
  | "gate"
  | "esami"
  | "competenze"
  | "lingue"
  | "profilo"
  | "reveal";

export interface Frame {
  block: StudentBlock;
  /** Sotto-stato interno del blocco (es. esperienze: ask → reading → filled). */
  phase: string;
  /** Quanti blocchi risultano confermati a questo frame (guida la barra e lo stack). */
  approved: number;
  /** Dove va il cursore finto in questo frame. */
  cursor: CursorTarget;
  /** Se true, il cursore fa un "tap" verso la fine del frame. */
  tap?: boolean;
  /** Durata del frame in ms. */
  duration: number;
}

export interface StudentData {
  name: string;
  /** I quattro campi della disponibilità, gli stessi del blocco vero. */
  availability: { cosaCerca: string; ambito: string; periodo: string; dove: string };
  /** Le pill che finiscono sulla card. */
  availabilityPills: string[];
  plan: string;
  /** Le esperienze come le tira fuori il CV, già in inglese. */
  experiences: { title: string; org: string; period: string }[];
  studi: { course: string; university: string; level: string; years: string };
  exams: { name: string; grade: string }[];
  average: string;
  hardSkills: { name: string; level: string }[];
  languages: string[];
  /** Come lo scrive lo studente, in italiano e senza filtri. */
  personalProfileRaw: string;
  /** Come lo riscrive ✦ Migliora con MIRA: prima persona, inglese. */
  personalProfile: string;
}

/** Studente d'esempio, fisso. Contenuto card in inglese. */
export const studentData: StudentData = {
  name: "Giulia Ferrari",
  availability: {
    cosaCerca: "Internship",
    ambito: "Strategy consulting",
    periodo: "From June, 6 months",
    dove: "Milan",
  },
  availabilityPills: ["Internship", "Strategy consulting", "From June", "Milan"],
  plan: "On exchange next spring, then a master's in Finance. Leaning toward consulting, still exploring.",
  experiences: [
    {
      title: "Led a 4-person team for the freshman orientation event (300+ students)",
      org: "Bocconi Students Association",
      period: "2025 – 2026",
    },
    {
      title: "Equity research on three listed retail companies, presented to the club",
      org: "Investment Club",
      period: "2025",
    },
  ],
  studi: {
    course: "BSc Economics & Management (CLEAM)",
    university: "Università Bocconi",
    level: "Bachelor",
    years: "2024 – 2027",
  },
  exams: [
    { name: "Corporate Finance", grade: "30" },
    { name: "Financial Statement Analysis", grade: "29" },
    { name: "Statistics", grade: "28" },
    { name: "Microeconomics", grade: "30L" },
  ],
  average: "28.5/30",
  hardSkills: [
    { name: "Excel", level: "Advanced" },
    { name: "Python", level: "Intermediate" },
    { name: "Financial statement analysis", level: "Advanced" },
    { name: "Bloomberg", level: "Basic" },
  ],
  languages: ["Italian · Native", "English · C1 (IELTS 7.5)", "Spanish · B2"],
  personalProfileRaw:
    "seguo i mercati da anni, ho una newsletter di investimenti per i miei amici, e mi alleno per il triathlon quasi ogni giorno",
  personalProfile:
    "I've run a small investing newsletter for my friends for two years, and I follow markets more closely than most of my exams. Outside study I train for triathlons, and the discipline carries into how I work. People who know me say I over-prepare and can't leave things half-done.",
};

/**
 * Timeline dello scenario studente. I beat parlati (disponibilità, esperienze,
 * profilo personale) hanno più respiro; competenze e lingue sono un montaggio
 * veloce. Chiusura con il reveal della card completa.
 */
export const studentFrames: Frame[] = [
  { block: "disponibilita", phase: "intro", approved: 0, cursor: null, duration: 2400 },
  { block: "disponibilita", phase: "filled", approved: 0, cursor: "confirm", tap: true, duration: 3000 },

  { block: "esperienze", phase: "ask", approved: 1, cursor: "upload", tap: true, duration: 2400 },
  { block: "esperienze", phase: "reading", approved: 1, cursor: null, duration: 1400 },
  { block: "esperienze", phase: "filled", approved: 1, cursor: "confirm", tap: true, duration: 2800 },

  { block: "studi", phase: "filled", approved: 2, cursor: "confirm", tap: true, duration: 2600 },

  { block: "gate", phase: "unlocked", approved: 3, cursor: "confirm", tap: true, duration: 2800 },

  { block: "esami", phase: "ask", approved: 3, cursor: "upload", tap: true, duration: 2200 },
  { block: "esami", phase: "reading", approved: 3, cursor: null, duration: 1300 },
  { block: "esami", phase: "filled", approved: 3, cursor: "confirm", tap: true, duration: 2400 },

  { block: "competenze", phase: "filled", approved: 3, cursor: "confirm", tap: true, duration: 2200 },
  { block: "lingue", phase: "filled", approved: 4, cursor: "confirm", tap: true, duration: 1800 },

  { block: "profilo", phase: "typing", approved: 5, cursor: null, duration: 2600 },
  { block: "profilo", phase: "improve", approved: 5, cursor: "improve", tap: true, duration: 1700 },
  { block: "profilo", phase: "improved", approved: 5, cursor: "confirm", tap: true, duration: 2600 },

  { block: "reveal", phase: "card", approved: 6, cursor: null, duration: 4500 },
];

export const TOTAL_BLOCKS = 6;
