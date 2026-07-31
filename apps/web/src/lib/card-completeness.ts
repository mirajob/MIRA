import { isLegacyAcademic } from "@mira/types";
import type {
  CompetenzaItem,
  DisponibilitaProseContent,
  EsperienzaItem,
  FormazioneItem,
  LinguaItem,
} from "@mira/types";

/**
 * Cosa manca DAVVERO a una card, guardando il contenuto e non lo stato del blocco.
 *
 * Lo stato non basta: un blocco può essere "approved" e vuoto (basta premere Conferma senza
 * scrivere niente, o passare dal completamento rapido), e allora nessun avviso scattava
 * mentre la card mostrava un buco. Qui conta solo se c'è qualcosa da leggere.
 */
export type CardSectionKey =
  | "disponibilita"
  | "esperienze"
  | "esami"
  | "competenze"
  | "lingue"
  | "profiloPersonale"
  | "pianoCarriera";

export interface CardContentInput {
  disponibilita?: DisponibilitaProseContent | null;
  esperienze?: EsperienzaItem[] | null;
  esami?: FormazioneItem[] | null;
  competenze?: CompetenzaItem[] | null;
  lingue?: LinguaItem[] | null;
  profiloPersonale?: string | null;
  pianoCarriera?: string | null;
}

/** L'ordine è quello in cui le sezioni compaiono nella card. */
export const CARD_SECTION_ORDER: CardSectionKey[] = [
  "disponibilita",
  "profiloPersonale",
  "esperienze",
  "esami",
  "competenze",
  "lingue",
  "pianoCarriera",
];

function hasText(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export function isSectionFilled(key: CardSectionKey, content: CardContentInput): boolean {
  switch (key) {
    case "disponibilita": {
      const d = content.disponibilita;
      if (!d) return false;
      // "Non in cerca" è una risposta completa, non un buco.
      if (d.attiva === false) return true;
      return hasText(d.cosa_cerca) || hasText(d.ambito) || hasText(d.periodo);
    }
    case "esperienze":
      return (content.esperienze ?? []).length > 0;
    case "esami":
      return (content.esami ?? []).length > 0;
    case "competenze":
      return (content.competenze ?? []).filter((it) => !isLegacyAcademic(it)).length > 0;
    case "lingue":
      return (content.lingue ?? []).length > 0;
    case "profiloPersonale":
      return hasText(content.profiloPersonale);
    case "pianoCarriera":
      return hasText(content.pianoCarriera);
  }
}

export function missingCardSections(content: CardContentInput): CardSectionKey[] {
  return CARD_SECTION_ORDER.filter((key) => !isSectionFilled(key, content));
}
