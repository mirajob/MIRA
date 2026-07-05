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

export interface HeaderProseContent {
  corso: string | null;
  livello: string | null;
  anno: number | null;
  laurea_anno: number | null;
  media_voti: number | null;
}

export interface HeaderVisibility {
  media_voti: {
    associazioni: boolean;
    aziende: boolean;
  };
}

export interface DisponibilitaProseContent {
  cosa_cerca: string | null;
  da_quando: string | null;
  dove: string | null;
  vincoli: string | null;
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

export interface CompetenzaItem {
  id: string;
  testo: string;
  tipo: "teorica" | "applicata" | null;
  evidenza_ref: string | null;
  verified: boolean;
  origin: ItemOrigin;
}

export interface CompetenzeProseContent {
  items: CompetenzaItem[];
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
