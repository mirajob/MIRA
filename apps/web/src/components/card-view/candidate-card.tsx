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

const PIANO_STATO_LABELS: Record<string, string> = {
  direzione_chiara: "Direzione chiara",
  ipotesi: "Alcune ipotesi",
  esplorazione: "In esplorazione",
};

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-white p-5">
      <p className="text-eyebrow text-navy/60 uppercase text-[10px] mb-2">{title}</p>
      {children}
    </div>
  );
}

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
}

/** Card read-only per la vista associazione: solo blocchi approved, filtrata per visibilità. */
export function CandidateCard(props: CandidateCardProps) {
  const showMedia = props.header?.visibility?.media_voti?.associazioni === true;
  const hasAny = Object.values(props).some(Boolean);

  if (!hasAny) {
    return (
      <div className="rounded-lg border border-border bg-white p-5">
        <p className="text-body-sm text-ink-secondary">Questo studente non ha ancora blocchi approvati nella card.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {props.header && (
        <Block title="Header">
          <div className="grid grid-cols-2 gap-2 text-body-sm">
            {props.header.data.corso && <div className="col-span-2"><span className="text-ink-tertiary">Corso:</span> <span className="text-ink">{props.header.data.corso}</span></div>}
            {props.header.data.livello && <div><span className="text-ink-tertiary">Livello:</span> <span className="text-ink">{props.header.data.livello}</span></div>}
            {props.header.data.anno && <div><span className="text-ink-tertiary">Anno:</span> <span className="text-ink">{props.header.data.anno}°</span></div>}
            {showMedia && props.header.data.media_voti != null && (
              <div><span className="text-ink-tertiary">Media:</span> <span className="text-ink font-medium">{Number(props.header.data.media_voti).toFixed(1)}/30</span></div>
            )}
          </div>
          {!showMedia && <p className="text-[10px] text-ink-tertiary italic pt-2 mt-2 border-t border-border">Media non condivisa dallo studente</p>}
        </Block>
      )}

      {props.disponibilita && (
        <Block title="Disponibilità">
          <div className="flex flex-wrap gap-1.5">
            {[props.disponibilita.data.cosa_cerca, props.disponibilita.data.da_quando, props.disponibilita.data.dove, props.disponibilita.data.vincoli]
              .filter(Boolean)
              .map((p, i) => (
                <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-petrol-50 text-petrol-700">{p}</span>
              ))}
          </div>
        </Block>
      )}

      {props.esperienze && props.esperienze.data.items.length > 0 && (
        <Block title="Esperienze">
          <div className="space-y-2">
            {props.esperienze.data.items.map((it) => (
              <div key={it.id}>
                <p className="text-body-sm font-medium text-ink">{it.titolo || it.organizzazione}</p>
                <p className="text-body-sm text-ink-secondary">{it.descrizione}</p>
              </div>
            ))}
          </div>
        </Block>
      )}

      {props.formazione && props.formazione.data.items.length > 0 && (
        <Block title="Formazione">
          <div className="space-y-1">
            {props.formazione.data.items.map((it) => (
              <div key={it.id} className="flex items-center justify-between text-body-sm">
                <span className="text-ink">{it.esame}</span>
                {/* Stesso toggle "Visibilità media voti" dell'Header: se lo studente non ha
                    condiviso la media, nemmeno i voti dei singoli esami vanno mostrati. */}
                {showMedia ? (
                  <span className="text-ink-secondary">{it.voto} <span className="text-xs text-success font-medium">verificata</span></span>
                ) : (
                  <span className="text-xs text-success font-medium">verificata</span>
                )}
              </div>
            ))}
          </div>
          {!showMedia && <p className="text-[10px] text-ink-tertiary italic pt-2 mt-2 border-t border-border">Voti non condivisi dallo studente</p>}
        </Block>
      )}

      {props.competenze && props.competenze.data.items.length > 0 && (
        <Block title="Competenze">
          <div className="space-y-2">
            {props.competenze.data.items.map((it) => (
              <div key={it.id} className="text-body-sm">
                <span className="text-ink">{it.testo}</span>
                {it.tipo && <span className="text-xs text-ink-tertiary"> ({it.tipo})</span>}
                {it.verified && <span className="text-xs text-success font-medium ml-1">verificata</span>}
              </div>
            ))}
          </div>
        </Block>
      )}

      {props.lingue && props.lingue.data.items.length > 0 && (
        <Block title="Lingue">
          <div className="flex flex-wrap gap-1.5">
            {props.lingue.data.items.map((it) => (
              <span key={it.id} className="text-xs px-2 py-0.5 rounded-full bg-petrol-50 text-petrol-700">{it.lingua} {it.livello}</span>
            ))}
          </div>
        </Block>
      )}

      {props.autodescrizione?.data.testo && (
        <Block title="Come si descrive">
          <p className="font-display italic text-body-sm text-ink">{props.autodescrizione.data.testo}</p>
        </Block>
      )}

      {props.interessi?.data.testo && (
        <Block title="Interessi">
          <p className="text-body-sm text-ink">{props.interessi.data.testo}</p>
        </Block>
      )}

      {props.pianoCarriera?.data.testo && (
        <Block title="Piano di carriera">
          <span className="text-xs px-2 py-0.5 rounded-full border border-border text-ink-secondary">
            {PIANO_STATO_LABELS[props.pianoCarriera.data.stato] ?? props.pianoCarriera.data.stato}
          </span>
          <p className="text-body-sm text-ink mt-1">{props.pianoCarriera.data.testo}</p>
        </Block>
      )}
    </div>
  );
}
