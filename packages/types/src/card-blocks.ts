// MIRA Card data model — docs/MIRA_SPEC_rifacimento_card_onboarding.md, section 3.

export type CardBlockType =
  | "header"
  | "disponibilita"
  | "esperienze"
  | "formazione"
  | "competenze"
  | "lingue"
  | "autodescrizione"
  | "interessi"
  | "piano_carriera";

export type CardBlockStatus = "empty" | "draft" | "approved";

/** Where an item's data came from. Saved internally, never shown in UI (spec 3.2). */
export type ItemOrigin = "transcript" | "cv_upload" | "onboarding" | "manual";

export interface FormazionePrecedente {
  universita: string | null;
  corso: string | null;
  voto_laurea: string | null;
  tema_tesi: string | null;
  /** Media del corso precedente, scritta solo caricandone il libretto. */
  media_voti?: number | null;
}

export interface HeaderProseContent {
  universita: string | null;
  corso: string | null;
  livello: string | null;
  anno: number | null;
  /** Anno di immatricolazione al corso attuale. */
  anno_inizio: number | null;
  /** Anno di laurea previsto/atteso. */
  laurea_anno: number | null;
  media_voti: number | null;
  /** Solo per magistrale: la triennale fatta prima, raccolta come contesto. */
  formazione_precedente?: FormazionePrecedente | null;
}

export interface HeaderVisibility {
  media_voti: {
    associazioni: boolean;
    aziende: boolean;
  };
}

/** Come si lavora in un certo posto. Tre modi, non di più: il resto sono sfumature di questi. */
export type ModalitaLavoro = "in_presenza" | "ibrido" | "remoto";

/**
 * Il tipo di realtà in cui lo studente vorrebbe entrare. Le etichette leggibili stanno
 * nei messaggi i18n e sono scritte per chi non conosce il gergo: "startup" da sola non
 * dice niente a chi non è di area economica.
 */
export type TipoAzienda =
  | "startup"
  | "pmi"
  | "grande"
  | "multinazionale"
  | "boutique"
  | "pubblico_no_profit";

export const TIPI_AZIENDA: readonly TipoAzienda[] = [
  "startup",
  "pmi",
  "grande",
  "multinazionale",
  "boutique",
  "pubblico_no_profit",
] as const;

/**
 * Una finestra di disponibilità, a giorni pieni.
 *
 * Il giorno preciso conta davvero: chi finisce gli esami il 19 giugno è libero da quel
 * giorno, e prima del rework non aveva modo di dirlo. Le card convertite dal vecchio
 * testo, dove c'era solo il mese, partono dal primo e finiscono all'ultimo giorno.
 */
export interface FinestraDisponibilita {
  id: string;
  /** Data di inizio, formato yyyy-mm-dd. */
  da: string;
  /** Data di fine, yyyy-mm-dd. `null` = da quel giorno in poi, senza fine. */
  a: string | null;
}

export interface LuogoDisponibilita {
  id: string;
  /** Città, regione o stato, scritto a mano: nessun elenco può contenerli tutti. */
  posto: string;
  /** La modalità è per singolo posto: "Milano ibrido" e "Londra in presenza" convivono. */
  modalita: ModalitaLavoro;
}

export interface DisponibilitaProseContent {
  /** Toggle strutturato "in cerca sì/no" (card rework 2026-07): mai dedotto da tag testuali
   * tipo "not looking". null = non ancora chiesto (righe legacy pre-rework). */
  attiva?: boolean | null;

  // ——— Struttura (rework disponibilità 2026-08) ———
  /** Quando è libero: una o più finestre a date vere. */
  finestre?: FinestraDisponibilita[];
  /** Per quanto tempo, in mesi. Estremi inclusi; solo uno dei due = "almeno"/"al massimo". */
  durata_min_mesi?: number | null;
  durata_max_mesi?: number | null;
  /** "Non cerco solo uno stage: se funziona resto." Vale insieme alla durata, non al posto suo. */
  disponibile_a_restare?: boolean;
  /** Al massimo 3, scritti a mano: il matching legge le parole, non un elenco chiuso. */
  ambiti?: string[];
  tipi_azienda?: TipoAzienda[];
  luoghi?: LuogoDisponibilita[];

  // ——— Campi liberi pre-rework ———
  // Restano leggibili finché la card non viene convertita: nessuna card deve
  // svuotarsi da sola, e quello che non riusciamo a interpretare non si inventa.
  /** @deprecated sostituito da durata_min_mesi/durata_max_mesi e tipi_azienda. */
  cosa_cerca?: string | null;
  /** @deprecated sostituito da `ambiti`. */
  ambito?: string | null;
  /** Testo libero del "quando" (@deprecated per la ricerca: usare `finestre`).
   * Quando `attiva` è false resta in uso come motivo: "in Erasmus fino a marzo". */
  periodo?: string | null;
  /** @deprecated sostituito da durata_min_mesi/durata_max_mesi. */
  durata?: string | null;
  /** @deprecated sostituito da `luoghi`. */
  dove?: string | null;
}

export interface EsperienzaItem {
  id: string;
  titolo: string;
  ruolo: string;
  organizzazione: string;
  periodo: string;
  descrizione: string;
  verified: boolean;
  origin: ItemOrigin;
}

export interface EsperienzeProseContent {
  items: EsperienzaItem[];
}

/** Da quale libretto arriva un esame. Assente = corso attuale (righe pre 2026-07-31). */
export type CicloEsame = "attuale" | "precedente";

export interface FormazioneItem {
  id: string;
  esame: string;
  voto: string | null;
  cfu: number | null;
  anno: string | null;
  semestre: string | null;
  verified: boolean;
  origin: ItemOrigin;
  /** Chi è appena passato alla magistrale può caricare anche il libretto della triennale:
   * i due elenchi convivono nello stesso blocco, distinti da qui. */
  ciclo?: CicloEsame;
}

export function getCicloEsame(item: FormazioneItem): CicloEsame {
  return item.ciclo === "precedente" ? "precedente" : "attuale";
}

export interface FormazioneProseContent {
  items: FormazioneItem[];
}

export type HardSkillLivello = "beginner" | "intermediate" | "advanced";

/**
 * Una competenza della card. Dal 2026-07-31 esistono SOLO hard skill: cosa lo studente sa
 * usare (strumenti, software, metodi applicati). La parte teorica non si dichiara più qui,
 * la certifica l'elenco esami del blocco `formazione`.
 */
export interface CompetenzaItem {
  id: string;
  testo: string;
  livello?: HardSkillLivello | null;
  evidenza_ref: string | null;
  verified: boolean;
  origin: ItemOrigin;
  /** @deprecated righe non ancora ripulite dalla migrazione 20260731000004 — vedi isLegacyAcademic(). */
  categoria?: string;
  /** @deprecated pre-redesign, sostituito da `categoria` e a sua volta abbandonato. */
  tipo?: "teorica" | "applicata" | null;
}

export interface CompetenzeProseContent {
  /** Solo hard skill: niente academic (rework 2026-07-31), niente soft (rework 2026-07). */
  items: CompetenzaItem[];
  /** @deprecated card rework 2026-07: il quiz soft skill è stato rimosso; le soft skill non
   * compaiono più nella card. Righe legacy possono ancora avere valori — mai scritto/mostrato da codice nuovo. */
  soft_skills?: string[] | null;
  /** @deprecated pre-quiz: paragrafo in prima persona sintetizzato da 2 domande AI aperte. Righe vecchie possono averlo senza `soft_skills` — mai scritto da codice nuovo. */
  soft_skills_testo?: string | null;
}

/**
 * Vecchia "competenza accademica", cancellata dalle card dalla migrazione 20260731000004.
 * Serve solo come rete di sicurezza in lettura: se il deploy precede l'esecuzione della
 * migrazione, o se una riga sfugge, non deve ricomparire tra le hard skill.
 */
export function isLegacyAcademic(item: CompetenzaItem): boolean {
  return item.categoria === "academic" || item.tipo === "teorica";
}

export interface LinguaItem {
  id: string;
  lingua: string;
  livello: string;
  certificazione: string | null;
  verified: boolean;
  origin: ItemOrigin;
}

export interface LingueProseContent {
  items: LinguaItem[];
}

/** Card rework 2026-07: questa riga DB ospita il blocco "Profilo personale" (interessi +
 * autodescrizione uniti in un'unica prosa). Il block_type resta "autodescrizione" per non
 * migrare l'enum Postgres. */
export interface AutodescrizioneProseContent {
  testo: string | null;
}

/** @deprecated card rework 2026-07: gli interessi sono confluiti nel Profilo personale
 * (riga "autodescrizione"). La riga "interessi" resta solo come dato legacy in lettura. */
export interface InteressiProseContent {
  testo: string | null;
}

export type PianoCarrieraStato = "direzione_chiara" | "ipotesi" | "esplorazione";

export interface PianoCarrieraProseContent {
  stato: PianoCarrieraStato;
  testo: string | null;
}

export interface ProseContentByBlockType {
  header: HeaderProseContent;
  disponibilita: DisponibilitaProseContent;
  esperienze: EsperienzeProseContent;
  formazione: FormazioneProseContent;
  competenze: CompetenzeProseContent;
  lingue: LingueProseContent;
  autodescrizione: AutodescrizioneProseContent;
  interessi: InteressiProseContent;
  piano_carriera: PianoCarrieraProseContent;
}

export interface CardBlock<T extends CardBlockType = CardBlockType> {
  id: string;
  student_profile_id: string;
  block_type: T;
  prose_content: ProseContentByBlockType[T];
  structured_data: Record<string, unknown>;
  status: CardBlockStatus;
  visibility: Record<string, unknown>;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}
