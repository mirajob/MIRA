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

export interface DisponibilitaProseContent {
  /** Tipo di opportunità: stage curriculare/extracurriculare, part-time, progetto — o "non in cerca"/"già occupato". */
  cosa_cerca: string | null;
  /** Settore o ruolo cercato, es. "venture capital", "marketing". */
  ambito: string | null;
  /** Il "quando": una data di inizio aperta ("da settembre 2026"), un intervallo ("da giugno ad agosto 2026"),
   * o uno stato speciale ("già occupato fino a dicembre", "non in cerca al momento"). */
  periodo: string | null;
  dove: string | null;
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

export interface FormazioneItem {
  id: string;
  esame: string;
  voto: string | null;
  cfu: number | null;
  anno: string | null;
  semestre: string | null;
  verified: boolean;
  origin: ItemOrigin;
}

export interface FormazioneProseContent {
  items: FormazioneItem[];
}

export type CompetenzaCategoria = "hard" | "academic";
export type HardSkillLivello = "beginner" | "intermediate" | "advanced";

export interface CompetenzaItem {
  id: string;
  testo: string;
  /** Sostituisce `tipo` (deprecato) — "hard" = strumenti/tecnologie, "academic" = da pattern sui voti. */
  categoria?: CompetenzaCategoria;
  /** Solo per le hard skill; null per le academic. */
  livello?: HardSkillLivello | null;
  evidenza_ref: string | null;
  verified: boolean;
  origin: ItemOrigin;
  /** @deprecated pre-redesign — righe vecchie hanno questo invece di `categoria`, mai scritto da codice nuovo. */
  tipo?: "teorica" | "applicata" | null;
}

export interface CompetenzeProseContent {
  /** Solo hard + academic — le soft skill sono in `soft_skills`. */
  items: CompetenzaItem[];
  /** Elenco delle frasi fisse (inglese) scelte nel quiz a scelta forzata a 5 domande. */
  soft_skills: string[] | null;
  /** @deprecated pre-quiz: paragrafo in prima persona sintetizzato da 2 domande AI aperte. Righe vecchie possono averlo senza `soft_skills` — mai scritto da codice nuovo. */
  soft_skills_testo?: string | null;
}

/** Righe pre-redesign hanno `tipo` ma non `categoria` — normalizza in lettura, nessuna migrazione DB necessaria (prose_content è jsonb). */
export function getCompetenzaCategoria(item: CompetenzaItem): CompetenzaCategoria {
  if (item.categoria) return item.categoria;
  return item.tipo === "teorica" ? "academic" : "hard";
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

export interface AutodescrizioneProseContent {
  testo: string | null;
}

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
