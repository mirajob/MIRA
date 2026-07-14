"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { updateCardBlockProseContent } from "@/lib/actions/card-blocks";
import { miraImprovePiano } from "@/lib/actions/onboarding-flow";
import { CardBlockHeader } from "./card-block-header";
import { MiraImproveButton } from "./mira-improve-button";
import type {
  CardBlockStatus,
  DisponibilitaProseContent,
  PianoCarrieraProseContent,
  PianoCarrieraStato,
} from "@mira/types";

/**
 * Blocco unito "Disponibilità e piano" (card rework 2026-07): due parti visive —
 * la disponibilità lavorativa con toggle attivo/non attivo, e piano/direzione dei
 * prossimi mesi. Sul DB restano due righe (`disponibilita` + `piano_carriera`),
 * salvate insieme e approvate insieme con un solo Conferma (alsoApprove).
 */
export function DisponibilitaEPianoBlock({
  disponibilita,
  piano,
  status,
  onApproved,
}: {
  disponibilita: DisponibilitaProseContent;
  piano: PianoCarrieraProseContent;
  /** Status combinato: approved solo se entrambe le righe lo sono. */
  status: CardBlockStatus;
  onApproved?: () => void;
}) {
  const t = useTranslations("CardBlocks");
  const c = useTranslations("Common");
  const [form, setForm] = useState(disponibilita);
  const [pianoTesto, setPianoTesto] = useState(piano.testo ?? "");
  const [pianoStato, setPianoStato] = useState<PianoCarrieraStato>(piano.stato ?? "esplorazione");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!dirty) setForm(disponibilita);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disponibilita]);
  useEffect(() => {
    if (!dirty) setPianoTesto(piano.testo ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [piano.testo]);

  function update<K extends keyof DisponibilitaProseContent>(key: K, value: DisponibilitaProseContent[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setDirty(true);
  }

  async function handleSave() {
    setSaving(true);
    // Se non attiva, i dettagli della ricerca non hanno senso e vengono azzerati —
    // mai lasciare tag residui tipo "not looking" nei campi testuali.
    const attiva = form.attiva !== false;
    const cleaned: DisponibilitaProseContent = attiva
      ? { ...form, attiva: form.attiva ?? null }
      : { attiva: false, cosa_cerca: null, ambito: null, periodo: form.periodo ?? null, durata: null, dove: null };
    await updateCardBlockProseContent("disponibilita", cleaned);
    await updateCardBlockProseContent("piano_carriera", { stato: pianoStato, testo: pianoTesto });
    setSaving(false);
    setDirty(false);
  }

  const attiva = form.attiva !== false;

  const fields: Array<{ key: keyof DisponibilitaProseContent; label: string; placeholder: string }> = [
    { key: "cosa_cerca", label: t("disponibilita.cosaCercaLabel"), placeholder: t("disponibilita.cosaCercaPlaceholder") },
    { key: "ambito", label: t("disponibilita.ambitoLabel"), placeholder: t("disponibilita.ambitoPlaceholder") },
    { key: "periodo", label: t("disponibilita.periodoLabel"), placeholder: t("disponibilita.periodoPlaceholder") },
    { key: "durata", label: t("disponibilita.durataLabel"), placeholder: t("disponibilita.durataPlaceholder") },
    { key: "dove", label: t("disponibilita.doveLabel"), placeholder: t("disponibilita.dovePlaceholder") },
  ];

  return (
    <div className="rounded-lg border border-border bg-white overflow-hidden">
      <CardBlockHeader
        title={t("titles.disponibilitaEPiano")}
        status={status}
        blockType="disponibilita"
        alsoApprove={["piano_carriera"]}
        onBeforeApprove={handleSave}
        onApproved={onApproved}
      />
      <div className="p-5 space-y-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={attiva}
            onChange={(e) => update("attiva", e.target.checked)}
            className="h-4 w-4 accent-petrol"
          />
          <span className="text-body-sm text-ink">{t("disponibilita.attivaLabel")}</span>
        </label>

        {attiva ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="text-ink-tertiary text-body-sm">{label}</label>
                <input
                  type="text"
                  value={(form[key] as string | null | undefined) ?? ""}
                  placeholder={placeholder}
                  onChange={(e) => update(key, e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-md border border-border text-body-sm text-ink focus:outline-none focus:ring-1 focus:ring-petrol/30"
                />
              </div>
            ))}
          </div>
        ) : (
          <div>
            <label className="text-ink-tertiary text-body-sm">{t("disponibilita.motivoLabel")}</label>
            <input
              type="text"
              value={form.periodo ?? ""}
              placeholder={t("disponibilita.motivoPlaceholder")}
              onChange={(e) => update("periodo", e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-md border border-border text-body-sm text-ink focus:outline-none focus:ring-1 focus:ring-petrol/30"
            />
          </div>
        )}

        <div>
          <label className="text-ink-tertiary text-body-sm">{t("disponibilita.pianoLabel")}</label>
          <textarea
            value={pianoTesto}
            placeholder={t("disponibilita.pianoPlaceholder")}
            maxLength={450}
            rows={3}
            onChange={(e) => {
              setPianoTesto(e.target.value);
              setDirty(true);
            }}
            className="mt-1 w-full px-3 py-2 rounded-md border border-border text-body-sm text-ink focus:outline-none focus:ring-1 focus:ring-petrol/30"
          />
          <div className="mt-2">
            <MiraImproveButton
              getText={() => pianoTesto}
              improve={async (text) => {
                const result = await miraImprovePiano({ testo: text });
                setPianoStato(result.stato);
                return result.testo;
              }}
              onImproved={(text) => {
                setPianoTesto(text);
                setDirty(true);
              }}
            />
          </div>
        </div>

        {dirty && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="text-body-sm font-medium text-white bg-petrol rounded-md px-4 py-2 hover:bg-petrol-700 transition-colors disabled:opacity-50"
          >
            {saving ? c("saving") : c("save")}
          </button>
        )}
      </div>
    </div>
  );
}

/** Le pill della disponibilità, deduplicate (case-insensitive): mai "not looking / not looking". */
export function disponibilitaPills(data: DisponibilitaProseContent): string[] {
  const raw = [data.cosa_cerca, data.ambito, data.periodo, data.durata ?? null, data.dove].filter(Boolean) as string[];
  const seen = new Set<string>();
  return raw.filter((p) => {
    const key = p.toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Resa di sola lettura del blocco unito, riusata dal Profilo e dalle viste associazione/azienda. */
export function DisponibilitaEPianoView({
  disponibilita,
  piano,
}: {
  disponibilita: DisponibilitaProseContent;
  piano: PianoCarrieraProseContent | null;
}) {
  const t = useTranslations("CardBlocks");
  const notActive = disponibilita.attiva === false;
  const pills = disponibilitaPills(disponibilita);

  return (
    <div className="p-4 space-y-3">
      <div>
        {/* Titolo solo "Disponibilità": qui sotto ci sono solo i dati di disponibilità, il
            piano ha la sua sezione (con titolo proprio) più in basso. */}
        <p className="text-eyebrow text-navy/60 uppercase mb-2">{t("titles.disponibilita")}</p>
        {notActive ? (
          <div className="flex flex-wrap gap-1.5">
            <span className="text-xs px-2 py-0.5 rounded-full bg-border/60 text-ink-secondary">
              {t("disponibilita.notActive")}
            </span>
            {disponibilita.periodo && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-petrol-50 text-petrol-700">{disponibilita.periodo}</span>
            )}
          </div>
        ) : pills.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {pills.map((p, i) => (
              <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-petrol-50 text-petrol-700">
                {p}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-body-sm text-ink-tertiary italic">{t("disponibilita.notSpecified")}</p>
        )}
      </div>
      {piano?.testo && (
        <div>
          <p className="text-eyebrow text-navy/60 uppercase mb-2">{t("titles.pianoCarriera")}</p>
          <p className="text-body-sm text-ink">{piano.testo}</p>
        </div>
      )}
    </div>
  );
}
