import type { BaseFrame, CursorTarget } from "./demo-reel";

/**
 * Scenario AZIENDA del reel della landing.
 *
 * Riflette la ricerca aziende (una chat: descrivi il candidato ideale, MIRA mostra
 * i profili che corrispondono, ognuno con il MOTIVO del match e una dimensione —
 * competenze / disponibilità / entrambe — e li contatti per codice, anonimi).
 * Colloqui e business case sono la parte "vision" (non ancora costruita): mostrano
 * la direzione del prodotto.
 *
 * Niente punteggi numerici: si mostra perché MIRA propone ciascun candidato.
 * La descrizione dell'azienda include università, livello (triennale/magistrale),
 * profilo attitudinale e interessi, oltre a competenze e disponibilità.
 *
 * Filo narrativo + privacy: i candidati sono anonimi per codice; il match migliore
 * (C-014) è Giulia Ferrari — la studentessa dell'hero — e il suo nome si svela solo
 * quando accetta il contatto.
 */

export type CompanyBlock = "search" | "detail" | "chat" | "reveal";

export interface CompanyFrame extends BaseFrame {
  block: CompanyBlock;
  phase: string;
  cursor: CursorTarget;
}

export type MatchDimension = "skills" | "availability" | "both";

export interface CompanyData {
  name: string;
  monogram: string;
  brief: string;
  candidates: { code: string; degree: string; dimension: MatchDimension; reason: string }[];
  detail: {
    code: string;
    revealedName: string;
    degree: string;
    interests: string;
    reason: string;
  };
  chat: { companyMsg: string; candidateMsg: string; businessCase: string };
  conversations: { name: string; status: "interviewProposed" | "contacted" | "awaitingReply"; revealed: boolean }[];
}

export const companyData: CompanyData = {
  name: "Northwind Partners",
  monogram: "N",
  brief:
    "Analyst for our M&A team — Bocconi or similar, Bachelor or Master in finance, curious and rigorous, genuinely into markets. Fluent English, available for a summer internship in Milan.",
  candidates: [
    {
      code: "C-014",
      degree: "BSc Economics & Management · Bocconi",
      dimension: "both",
      reason: "Strong finance foundation and top grades, genuinely curious about markets, available from June in Milan.",
    },
    {
      code: "C-022",
      degree: "MSc Finance · Bocconi",
      dimension: "skills",
      reason: "Master's in finance with an M&A internship; fluent English and rigorous.",
    },
    {
      code: "C-031",
      degree: "BSc Management · Politecnico",
      dimension: "availability",
      reason: "Available immediately and Milan-based, with fast-growing finance skills.",
    },
  ],
  detail: {
    code: "C-014",
    revealedName: "Giulia Ferrari",
    degree: "BSc Economics & Management (CLEAM) · Bocconi",
    interests: "Runs an investing newsletter · follows markets closely · triathlete",
    reason:
      "Solid finance foundation with top-quartile grades, a genuine interest in markets, and availability that matches your summer analyst track.",
  },
  chat: {
    companyMsg: "Hi! We'd love to talk about a summer analyst role on our M&A team.",
    candidateMsg: "Hi Northwind — thanks for reaching out, I'd be glad to. When works for a call?",
    businessCase: "Business case · Market entry: Italy",
  },
  conversations: [
    { name: "Giulia Ferrari", status: "interviewProposed", revealed: true },
    { name: "C-022", status: "contacted", revealed: false },
    { name: "C-031", status: "awaitingReply", revealed: false },
  ],
};

/** Timeline dello scenario azienda (~20s). */
export const companyFrames: CompanyFrame[] = [
  { block: "search", phase: "compose", cursor: null, duration: 3400 },
  { block: "search", phase: "results", cursor: "candidate", tap: true, duration: 3600 },
  { block: "detail", phase: "view", cursor: "contact", tap: true, duration: 3200 },
  { block: "chat", phase: "reply", cursor: null, duration: 3000 },
  { block: "chat", phase: "case", cursor: "send", tap: true, duration: 2600 },
  { block: "reveal", phase: "panel", cursor: null, duration: 4000 },
];
