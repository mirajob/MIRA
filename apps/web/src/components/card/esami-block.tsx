"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { uploadTranscript } from "@/lib/actions/transcript-upload";
import { CardBlockHeader } from "./card-block-header";
import { MediaVisibilityToggles } from "./media-visibility-toggles";
import { getCicloEsame } from "@mira/types";
import type { CardBlockStatus, CicloEsame, FormazioneItem, HeaderVisibility } from "@mira/types";

/**
 * Gli esami del libretto. Dal rework 2026-07-31 sono la parte teorica della card (cosa lo
 * studente ha studiato), quindi hanno una sezione propria sia in lettura sia in modifica,
 * nella stessa posizione in cui compaiono sulla card.
 *
 * In onboarding restano dentro il blocco Header (`EsamiEditor` incorporato lì): là il
 * percorso è a un blocco per volta e una sezione in più sarebbe un passaggio in più.
 *
 * Il contenuto non è scrivibile a mano: si aggiorna solo ricaricando il libretto.
 */
export function EsamiEditor({
  formazioneItems,
  allowPreviousDegree = false,
  livello,
  mediaVoti,
  showPurpose = true,
  visibility,
  onUploaded,
}: {
  formazioneItems: FormazioneItem[];
  /** Media calcolata dal libretto: si mostra qui, dove è stata prodotta. */
  mediaVoti?: number | null;
  /** Il libretto del corso precedente si carica solo dal Profilo, a card già costruita. */
  allowPreviousDegree?: boolean;
  livello?: string | null;
  /** In onboarding il perché lo dice già il riquadro di MIRA sopra il blocco. */
  showPurpose?: boolean;
  /** Se passata, gli interruttori su media e voti compaiono qui: è il momento in cui
   * lo studente si chiede chi vedrà i suoi voti. */
  visibility?: HeaderVisibility | null;
  /** In onboarding lo stato non arriva dai Server Component ma da loadOnboardingFlow():
   * senza questa callback il libretto veniva letto e salvato, ma la schermata restava
   * identica e sembrava che non fosse successo niente. */
  onUploaded?: () => void;
}) {
  const t = useTranslations("CardBlocks");
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [uploading, setUploading] = useState<CicloEsame | null>(null);
  const [error, setError] = useState<string | null>(null);
  const currentRef = useRef<HTMLInputElement>(null);
  const previousRef = useRef<HTMLInputElement>(null);

  const esamiAttuali = formazioneItems.filter((it) => getCicloEsame(it) === "attuale");
  const esamiPrecedenti = formazioneItems.filter((it) => getCicloEsame(it) === "precedente");

  // Il libretto sostituisce sempre l'intero elenco esami del SUO ciclo (mai un merge): un
  // libretto è per natura cumulativo, quindi ricaricarlo copre già i vecchi esami più gli
  // eventuali nuovi. Gli esami dell'altro ciclo restano dove sono.
  async function handleFile(e: React.ChangeEvent<HTMLInputElement>, ciclo: CicloEsame) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(ciclo);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("ciclo", ciclo);
    const result = await uploadTranscript(formData);

    if (result.error) {
      setError(result.error);
    } else {
      router.refresh();
      onUploaded?.();
    }

    setUploading(null);
    const ref = ciclo === "precedente" ? previousRef : currentRef;
    if (ref.current) ref.current.value = "";
  }

  const showPrevious =
    allowPreviousDegree && (livello === "magistrale" || livello === "phd" || esamiPrecedenti.length > 0);

  return (
    <div>
      {showPurpose && <p className="text-body-sm text-ink-secondary">{t("header.transcriptPurpose")}</p>}

      {mediaVoti != null && (
        <p className="mt-3 text-body-sm text-ink" title={t("header.mediaCambioNote")}>
          <span className="text-ink-tertiary">{t("header.mediaLabel")}: </span>
          <span className="font-medium">{Number(mediaVoti).toFixed(1)}/30</span>
        </p>
      )}

      {formazioneItems.length > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="mt-3 flex items-center gap-2 text-body-sm font-medium text-ink hover:text-petrol transition-colors"
        >
          <span>{expanded ? "▾" : "▸"}</span>
          <span>{t("header.esami", { count: formazioneItems.length })}</span>
        </button>
      )}
      {expanded && formazioneItems.length > 0 && (
        <div className="mt-3 space-y-3">
          {[
            { ciclo: "attuale" as const, items: esamiAttuali },
            { ciclo: "precedente" as const, items: esamiPrecedenti },
          ]
            .filter((g) => g.items.length > 0)
            .map((g) => (
              <div key={g.ciclo}>
                {esamiPrecedenti.length > 0 && (
                  <p className="text-eyebrow text-navy/60 uppercase mb-1">
                    {t(g.ciclo === "attuale" ? "formazione.cicloAttuale" : "formazione.cicloPrecedente")}
                  </p>
                )}
                <div className="space-y-1">
                  {g.items.map((it) => (
                    <div key={it.id} className="flex items-center justify-between gap-2 text-body-sm">
                      <span className="text-ink truncate">{it.esame}</span>
                      <span className="text-ink-secondary whitespace-nowrap">
                        {it.voto ?? "–"}
                        {it.cfu != null && <span className="text-xs text-ink-tertiary">{t("header.cfuSuffix", { cfu: it.cfu })}</span>}
                        <span className="ml-2 text-xs text-success font-medium">{t("header.examVerified")}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}

      <div className="mt-3">
        <input
          ref={currentRef}
          type="file"
          accept="application/pdf,image/png,image/jpeg,image/webp"
          onChange={(e) => handleFile(e, "attuale")}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => currentRef.current?.click()}
          disabled={uploading !== null}
          className="text-body-sm font-medium text-petrol hover:text-petrol-700 transition-colors disabled:opacity-50"
        >
          {uploading === "attuale"
            ? t("header.uploadingTranscript")
            : t(esamiAttuali.length > 0 ? "header.reuploadTranscriptLabel" : "header.uploadTranscriptLabel")}
        </button>
        {esamiAttuali.length > 0 && <p className="mt-1 text-xs text-ink-tertiary">{t("header.reuploadTranscriptNote")}</p>}
      </div>

      {/* Chi ha appena iniziato la magistrale ha quasi tutti gli esami nella triennale:
          senza questo caricamento la sua card sembrerebbe vuota di studi. */}
      {showPrevious && (
        <div className="mt-3 border-t border-border pt-3">
          <input
            ref={previousRef}
            type="file"
            accept="application/pdf,image/png,image/jpeg,image/webp"
            onChange={(e) => handleFile(e, "precedente")}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => previousRef.current?.click()}
            disabled={uploading !== null}
            className="text-body-sm font-medium text-petrol hover:text-petrol-700 transition-colors disabled:opacity-50"
          >
            {uploading === "precedente"
              ? t("header.uploadingTranscript")
              : t(esamiPrecedenti.length > 0 ? "header.reuploadPreviousTranscriptLabel" : "header.uploadPreviousTranscriptLabel")}
          </button>
          <p className="mt-1 text-xs text-ink-tertiary">{t("header.previousTranscriptNote")}</p>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-error">{t("header.transcriptUploadError", { error })}</p>}

      {visibility && (
        <div className="mt-4 border-t border-border pt-4">
          <MediaVisibilityToggles visibility={visibility} />
        </div>
      )}
    </div>
  );
}

/** Sezione a sé (Profilo): stessa posizione che gli esami hanno sulla card. */
export function EsamiBlock({
  formazioneItems,
  status,
  livello,
  mediaVoti,
  showPurpose = true,
  visibility,
  onUploaded,
  onApproved,
}: {
  formazioneItems: FormazioneItem[];
  status: CardBlockStatus;
  livello?: string | null;
  mediaVoti?: number | null;
  showPurpose?: boolean;
  visibility?: HeaderVisibility | null;
  onUploaded?: () => void;
  onApproved?: () => void;
}) {
  const t = useTranslations("CardBlocks");
  return (
    <div className="rounded-lg border border-border bg-white overflow-hidden">
      {/* Niente da salvare a mano: il pulsante serve solo a confermare che gli esami
          possono essere mostrati a chi legge la card. */}
      <CardBlockHeader
        title={t("titles.esami")}
        status={status}
        blockType="formazione"
        onBeforeApprove={async () => {}}
        onApproved={onApproved}
      />
      <div className="p-5">
        <EsamiEditor
          formazioneItems={formazioneItems}
          allowPreviousDegree
          livello={livello}
          mediaVoti={mediaVoti}
          showPurpose={showPurpose}
          visibility={visibility}
          onUploaded={onUploaded}
        />
      </div>
    </div>
  );
}

/** Resa di sola lettura per il Profilo. */
export function EsamiView({ formazioneItems }: { formazioneItems: FormazioneItem[] }) {
  const t = useTranslations("CardBlocks");
  const [expanded, setExpanded] = useState(false);
  const esamiPrecedenti = formazioneItems.filter((it) => getCicloEsame(it) === "precedente");

  return (
    <div className="p-4">
      <p className="text-eyebrow text-navy/60 uppercase mb-2">{t("titles.esami")}</p>
      {formazioneItems.length === 0 ? (
        <p className="text-body-sm text-ink-tertiary italic">{t("formazione.emptyView")}</p>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="flex items-center gap-1.5 text-xs text-petrol hover:text-petrol-700 transition-colors"
          >
            <span>{expanded ? "▾" : "▸"}</span>
            <span>{t("header.esami", { count: formazioneItems.length })}</span>
          </button>
          {expanded && (
            <div className="mt-2 space-y-1">
              {formazioneItems.map((it) => (
                <div key={it.id} className="flex items-center justify-between gap-2 text-body-sm">
                  <span className="text-ink truncate">
                    {it.esame}
                    {esamiPrecedenti.length > 0 && getCicloEsame(it) === "precedente" && (
                      <span className="ml-1 text-xs text-ink-tertiary">({t("formazione.cicloPrecedente")})</span>
                    )}
                  </span>
                  <span className="text-ink-secondary whitespace-nowrap">
                    {it.voto ?? "–"}
                    {it.cfu != null && <span className="text-xs text-ink-tertiary">{t("header.cfuSuffix", { cfu: it.cfu })}</span>}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
