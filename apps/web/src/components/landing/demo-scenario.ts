/**
 * Dati e timeline del reel dimostrativo della landing.
 *
 * Lo SCENARIO è separato dal motore che lo anima (`landing-demo.tsx`): un motore
 * generico + N scenari. Oggi esiste solo lo scenario studente; domani si possono
 * aggiungere `associationScenario` (dashboard: candidature + valutazione) e
 * `companyScenario` (ricerca → card → contatto) con la stessa forma, senza toccare
 * il motore.
 *
 * Il CONTENUTO della card è sempre in inglese (la MIRA Card lo è per prodotto),
 * anche quando la chat/guida è in italiano. Qui i dati sono quindi hardcoded in
 * inglese; la "cornice" (testi guida, etichette bottoni) è invece localizzata e
 * vive nei messaggi i18n, non qui.
 */

export type StudentBlock =
  | "header"
  | "esperienze"
  | "disponibilita"
  | "competenze"
  | "lingue"
  | "profilo"
  | "reveal";

/** Bersaglio del cursore finto in un frame. */
export type CursorTarget = "upload" | "confirm" | "improve" | null;

export interface Frame {
  block: StudentBlock;
  /** Sotto-stato interno del blocco (es. header: intro → uploading → filled). */
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
  header: {
    course: string;
    university: string;
    level: string;
    year: string;
    average: string;
  };
  /** Testo grezzo che lo studente "scrive" (volutamente informale, misto IT). */
  experienceRaw: string;
  /** Come MIRA lo riscrive: bullet in stile CV inglese. */
  experienceRefined: string;
  experienceOrg: string;
  availability: string[];
  availabilityNote: string;
  plan: string;
  academicSkills: string[];
  hardSkills: string[];
  languages: string[];
  personalProfile: string;
}

/** Studente d'esempio, fisso. Contenuto card in inglese. */
export const studentData: StudentData = {
  name: "Giulia Ferrari",
  header: {
    course: "BSc Economics & Management (CLEAM)",
    university: "Università Bocconi",
    level: "Bachelor",
    year: "2nd year",
    average: "28.5/30",
  },
  experienceRaw:
    "ho aiutato a organizzare l'evento di orientamento per le matricole, eravamo un team di 4 persone",
  experienceRefined:
    "Led a 4-person team to organize the freshman orientation event for 300+ incoming students.",
  experienceOrg: "Bocconi Students Association",
  availability: ["Internship", "Strategy consulting", "Boutique firm", "Milan", "6 months", "From June"],
  availabilityNote: "Open to relocation for the right team.",
  plan: "On exchange next spring, then a master's in Finance — leaning toward consulting, still exploring.",
  academicSkills: ["Corporate Finance", "Financial Statement Analysis", "Statistics", "Microeconomics"],
  hardSkills: ["Excel", "Python", "PowerPoint", "Bloomberg"],
  languages: ["Italian — Native", "English — C1", "Spanish — B2"],
  personalProfile:
    "I've run a small investing newsletter for my friends for two years, and I follow markets more closely than most of my exams. Outside study I train for triathlons — the discipline carries into how I work. People who know me say I over-prepare and can't leave things half-done.",
};

/**
 * Timeline dello scenario studente. Beat "recitati" (leggibili) per Header,
 * Esperienze, Disponibilità e Profilo personale; Competenze e Lingue in montaggio
 * più veloce; chiusura con reveal della card completa.
 */
export const studentFrames: Frame[] = [
  { block: "header", phase: "intro", approved: 0, cursor: "upload", tap: true, duration: 2400 },
  { block: "header", phase: "uploading", approved: 0, cursor: null, duration: 1300 },
  { block: "header", phase: "filled", approved: 0, cursor: "confirm", tap: true, duration: 2600 },

  { block: "esperienze", phase: "ask", approved: 1, cursor: null, duration: 1300 },
  { block: "esperienze", phase: "typing", approved: 1, cursor: null, duration: 2400 },
  { block: "esperienze", phase: "improve", approved: 1, cursor: "improve", tap: true, duration: 1700 },
  { block: "esperienze", phase: "improved", approved: 1, cursor: "confirm", tap: true, duration: 2500 },

  { block: "disponibilita", phase: "ask", approved: 2, cursor: null, duration: 1200 },
  { block: "disponibilita", phase: "filled", approved: 2, cursor: "confirm", tap: true, duration: 3200 },

  { block: "competenze", phase: "filled", approved: 3, cursor: "confirm", tap: true, duration: 2000 },
  { block: "lingue", phase: "filled", approved: 4, cursor: "confirm", tap: true, duration: 1800 },
  { block: "profilo", phase: "filled", approved: 5, cursor: "confirm", tap: true, duration: 3400 },

  { block: "reveal", phase: "card", approved: 6, cursor: null, duration: 4200 },
];

export const TOTAL_BLOCKS = 6;
