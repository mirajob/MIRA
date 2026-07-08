import { HeaderView } from "../card/header-block";
import { DisponibilitaView } from "../card/disponibilita-block";
import { EsperienzeView } from "../card/esperienze-block";
import { CompetenzeView } from "../card/competenze-block";
import { ProseView } from "../card/prose-block";
import type {
  HeaderProseContent,
  HeaderVisibility,
  DisponibilitaProseContent,
  FormazioneItem,
  EsperienzaItem,
  CompetenzaItem,
  LinguaItem,
  InteressiProseContent,
  AutodescrizioneProseContent,
  PianoCarrieraProseContent,
} from "@mira/types";

interface CandidateCardProps {
  header?: { data: HeaderProseContent; visibility: HeaderVisibility };
  disponibilita?: { data: DisponibilitaProseContent };
  esperienze?: { data: { items: EsperienzaItem[] } };
  formazione?: { data: { items: FormazioneItem[] } };
  competenze?: { data: { items: CompetenzaItem[] } };
  lingue?: { data: { items: LinguaItem[] } };
  interessi?: { data: InteressiProseContent };
  autodescrizione?: { data: AutodescrizioneProseContent };
  pianoCarriera?: { data: PianoCarrieraProseContent };
  /** Chi sta guardando la card — decide quale flag di visibilità dei voti applicare. Default: associazioni. */
  audience?: "associazioni" | "aziende";
}

/**
 * Card read-only per la vista associazione/azienda: solo blocchi approved, filtrata per visibilità.
 * Riusa gli stessi componenti View del Profilo studente — un'unica fonte per come "appare"
 * la card, invece di una resa duplicata che può andare fuori sincro visivo.
 */
export function CandidateCard(props: CandidateCardProps) {
  const showMedia = props.header?.visibility?.media_voti?.[props.audience ?? "associazioni"] === true;
  const hasAny = Object.values(props).some(Boolean);

  if (!hasAny) {
    return (
      <div className="rounded-xl border border-border bg-white p-5">
        <p className="text-body-sm text-ink-secondary">Questo studente non ha ancora blocchi approvati nella card.</p>
      </div>
    );
  }

  const hasInteressiOPiano = props.interessi?.data.testo || props.pianoCarriera?.data.testo;

  return (
    <div className="rounded-xl border border-border bg-white overflow-hidden divide-y divide-border">
      {props.header && (
        <HeaderView
          data={props.header.data}
          formazioneItems={props.formazione?.data.items ?? []}
          showMedia={showMedia}
        />
      )}

      {props.disponibilita && <DisponibilitaView data={props.disponibilita.data} />}

      {props.esperienze && props.esperienze.data.items.length > 0 && (
        <EsperienzeView items={props.esperienze.data.items} />
      )}

      {props.competenze && props.competenze.data.items.length > 0 && (
        <CompetenzeView items={props.competenze.data.items} />
      )}

      {props.lingue && props.lingue.data.items.length > 0 && (
        <div className="p-5">
          <p className="text-eyebrow text-navy/60 uppercase mb-2">Lingue</p>
          <div className="flex flex-wrap gap-1.5">
            {props.lingue.data.items.map((it) => (
              <span key={it.id} className="text-xs px-2 py-0.5 rounded-full bg-petrol-50 text-petrol-700">
                {it.lingua} {it.livello}
              </span>
            ))}
          </div>
        </div>
      )}

      {props.autodescrizione?.data.testo && (
        <ProseView title="Come si descrive" testo={props.autodescrizione.data.testo} serif />
      )}

      {hasInteressiOPiano && (
        <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border">
          {props.pianoCarriera?.data.testo && (
            <ProseView
              title="Piano di carriera"
              testo={props.pianoCarriera.data.testo}
              stato={props.pianoCarriera.data.stato}
            />
          )}
          {props.interessi?.data.testo && <ProseView title="Interessi" testo={props.interessi.data.testo} />}
        </div>
      )}
    </div>
  );
}
