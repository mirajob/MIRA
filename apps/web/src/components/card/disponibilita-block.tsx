"use client";

import { useState, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { updateCardBlockProseContent } from "@/lib/actions/card-blocks";
import { miraImprovePiano } from "@/lib/actions/onboarding-flow";
import { CardBlockHeader } from "./card-block-header";
import { MiraImproveButton } from "./mira-improve-button";
import { DateField } from "@/components/date-field";
import {
  MAX_AMBITI,
  formatFinestra,
  formatDurata,
  hasLegacyDisponibilita,
  legacyPills,
  newId,
} from "@/lib/disponibilita";
import { TIPI_AZIENDA } from "@mira/types";
import type {
  CardBlockStatus,
  DisponibilitaProseContent,
  FinestraDisponibilita,
  LuogoDisponibilita,
  ModalitaLavoro,
  PianoCarrieraProseContent,
  PianoCarrieraStato,
  TipoAzienda,
} from "@mira/types";

/**
 * Blocco "Disponibilità e piano".
 *
 * Rework 2026-08: la disponibilità non è più un pugno di caselle di testo libero.
 * Quando si è liberi sono date vere scelte sul calendario (anche più periodi, anche
 * senza fine), la durata sono mesi, i luoghi hanno ognuno la propria modalità e il
 * tipo di azienda si sceglie da un elenco. Restano scritti a mano solo ambiti e
 * luoghi, che nessun elenco può contenere per intero: MIRA legge le parole, quindi
 * un errore di battitura non rompe il matching.
 *
 * Sul DB restano due righe (`disponibilita` + `piano_carriera`), salvate insieme e
 * approvate insieme con un solo Conferma (alsoApprove).
 */

const DURATA_SCELTE = [1, 3, 6, 12] as const;
const MODALITA: ModalitaLavoro[] = ["in_presenza", "ibrido", "remoto"];

export function DisponibilitaEPianoBlock({
  disponibilita,
  piano,
  status,
  showPiano = true,
  onApproved,
}: {
  disponibilita: DisponibilitaProseContent;
  piano: PianoCarrieraProseContent;
  /** Status combinato: approved solo se entrambe le righe lo sono. */
  status: CardBlockStatus;
  /** Sul Profilo il piano ha una sezione propria (come sulla card) e qui va nascosto:
   * l'onboarding invece li tiene insieme, con un solo Conferma. */
  showPiano?: boolean;
  onApproved?: () => void;
}) {
  const t = useTranslations("CardBlocks");
  const locale = useLocale();
  const [form, setForm] = useState(disponibilita);
  const [pianoTesto, setPianoTesto] = useState(piano.testo ?? "");
  const [pianoStato, setPianoStato] = useState<PianoCarrieraStato>(piano.stato ?? "esplorazione");
  const [ambitoBozza, setAmbitoBozza] = useState("");
  const [dirty, setDirty] = useState(false);

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

  const finestre = form.finestre ?? [];
  const ambiti = form.ambiti ?? [];
  const luoghi = form.luoghi ?? [];
  const tipi = form.tipi_azienda ?? [];
  const attiva = form.attiva !== false;
  const legacy = hasLegacyDisponibilita(form);

  // ——— Finestre ———
  function addFinestra() {
    update("finestre", [...finestre, { id: newId(), da: "", a: null }]);
  }
  function patchFinestra(id: string, patch: Partial<FinestraDisponibilita>) {
    update("finestre", finestre.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }
  function removeFinestra(id: string) {
    update("finestre", finestre.filter((f) => f.id !== id));
  }

  // ——— Ambiti ———
  function addAmbito() {
    const testo = ambitoBozza.trim();
    if (!testo || ambiti.length >= MAX_AMBITI) return;
    if (ambiti.some((a) => a.toLowerCase() === testo.toLowerCase())) {
      setAmbitoBozza("");
      return;
    }
    update("ambiti", [...ambiti, testo]);
    setAmbitoBozza("");
  }

  // ——— Luoghi ———
  function addLuogo() {
    update("luoghi", [...luoghi, { id: newId(), posto: "", modalita: "in_presenza" }]);
  }
  function patchLuogo(id: string, patch: Partial<LuogoDisponibilita>) {
    update("luoghi", luoghi.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }
  function removeLuogo(id: string) {
    update("luoghi", luoghi.filter((l) => l.id !== id));
  }

  function toggleTipo(tipo: TipoAzienda) {
    update("tipi_azienda", tipi.includes(tipo) ? tipi.filter((x) => x !== tipo) : [...tipi, tipo]);
  }

  async function handleSave() {
    // Non in cerca: i dettagli della ricerca non hanno senso e vengono azzerati. Resta
    // il motivo (campo `periodo`), che è l'unica cosa utile da leggere in quel caso.
    const cleaned: DisponibilitaProseContent = attiva
      ? {
          attiva: form.attiva ?? null,
          finestre: finestre.filter((f) => f.da),
          durata_min_mesi: form.durata_min_mesi ?? null,
          durata_max_mesi: form.durata_max_mesi ?? null,
          disponibile_a_restare: form.disponibile_a_restare ?? false,
          ambiti,
          tipi_azienda: tipi,
          luoghi: luoghi.filter((l) => l.posto.trim()),
        }
      : {
          attiva: false,
          finestre: [],
          durata_min_mesi: null,
          durata_max_mesi: null,
          disponibile_a_restare: false,
          ambiti: [],
          tipi_azienda: [],
          luoghi: [],
          periodo: form.periodo ?? null,
        };
    await updateCardBlockProseContent("disponibilita", cleaned);
    if (showPiano) {
      await updateCardBlockProseContent("piano_carriera", { stato: pianoStato, testo: pianoTesto });
    }
    setDirty(false);
  }

  const fieldClass =
    "w-full px-3 py-2 rounded-md border border-border text-body-sm text-ink focus:outline-none focus:ring-1 focus:ring-petrol/30";

  return (
    <div className="rounded-lg border border-border bg-white overflow-hidden">
      <CardBlockHeader
        title={showPiano ? t("titles.disponibilitaEPiano") : t("titles.disponibilita")}
        status={status}
        blockType="disponibilita"
        alsoApprove={showPiano ? ["piano_carriera"] : undefined}
        onBeforeApprove={handleSave}
        onApproved={onApproved}
      />
      <div className="p-5 space-y-5">
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
          <>
            {/* Quello che era scritto a mano prima del rework: si vede finché non lo
                si sostituisce, così nessuno perde quello che aveva già messo. */}
            {legacy && (
              <div className="rounded-md border border-warning/40 bg-warning-bg px-3 py-2">
                <p className="text-body-sm text-ink">{t("disponibilita.legacyNotice")}</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {legacyPills(form).map((p, i) => (
                    <span key={i} className="rounded-full bg-white/70 px-2 py-0.5 text-xs text-ink-secondary">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* ——— Quando ——— */}
            <section>
              <p className="text-body-sm font-medium text-navy">{t("disponibilita.quandoLabel")}</p>
              <p className="mt-0.5 text-body-sm text-ink-tertiary">{t("disponibilita.quandoHint")}</p>

              <div className="mt-2 space-y-2">
                {finestre.map((f) => (
                  <div key={f.id} className="flex flex-wrap items-center gap-2">
                    <div className="min-w-[130px] flex-1">
                      <DateField
                        value={f.da || null}
                        onChange={(iso) => patchFinestra(f.id, { da: iso, a: f.a && f.a < iso ? null : f.a })}
                        placeholder={t("disponibilita.fromPlaceholder")}
                        ariaLabel={t("disponibilita.fromLabel")}
                      />
                    </div>
                    <span className="text-body-sm text-ink-tertiary">{t("disponibilita.toLabel")}</span>
                    <div className="min-w-[130px] flex-1">
                      {f.a === null ? (
                        <button
                          type="button"
                          onClick={() => patchFinestra(f.id, { a: f.da || "" })}
                          className="w-full rounded-md border border-dashed border-border px-3 py-2 text-left text-body-sm text-ink-tertiary hover:border-border-strong"
                        >
                          {t("disponibilita.openEnded")}
                        </button>
                      ) : (
                        <DateField
                          value={f.a || null}
                          onChange={(iso) => patchFinestra(f.id, { a: iso })}
                          min={f.da || undefined}
                          placeholder={t("disponibilita.toPlaceholder")}
                          ariaLabel={t("disponibilita.toLabel")}
                        />
                      )}
                    </div>
                    <label className="flex items-center gap-1.5 text-body-sm text-ink-secondary">
                      <input
                        type="checkbox"
                        checked={f.a === null}
                        onChange={(e) => patchFinestra(f.id, { a: e.target.checked ? null : f.da || "" })}
                        className="h-4 w-4 accent-petrol"
                      />
                      {t("disponibilita.noEndLabel")}
                    </label>
                    <button
                      type="button"
                      onClick={() => removeFinestra(f.id)}
                      aria-label={t("disponibilita.removePeriod")}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-ink-tertiary transition-colors hover:bg-navy-50 hover:text-navy"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <line x1="6" y1="6" x2="18" y2="18" />
                        <line x1="18" y1="6" x2="6" y2="18" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addFinestra}
                className="mt-2 text-body-sm text-petrol transition-colors hover:text-petrol-700"
              >
                {finestre.length === 0 ? t("disponibilita.addFirstPeriod") : t("disponibilita.addPeriod")}
              </button>
            </section>

            {/* ——— Per quanto ——— */}
            <section>
              <p className="text-body-sm font-medium text-navy">{t("disponibilita.durataLabel")}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <select
                  value={form.durata_min_mesi ?? ""}
                  onChange={(e) => update("durata_min_mesi", e.target.value ? Number(e.target.value) : null)}
                  className="rounded-md border border-border px-3 py-2 text-body-sm text-ink focus:outline-none focus:ring-1 focus:ring-petrol/30"
                >
                  <option value="">{t("disponibilita.durataMinPlaceholder")}</option>
                  {DURATA_SCELTE.map((n) => (
                    <option key={n} value={n}>{t("disponibilita.mesi", { n })}</option>
                  ))}
                </select>
                <span className="text-body-sm text-ink-tertiary">{t("disponibilita.toLabel")}</span>
                <select
                  value={form.durata_max_mesi ?? ""}
                  onChange={(e) => update("durata_max_mesi", e.target.value ? Number(e.target.value) : null)}
                  className="rounded-md border border-border px-3 py-2 text-body-sm text-ink focus:outline-none focus:ring-1 focus:ring-petrol/30"
                >
                  <option value="">{t("disponibilita.durataMaxPlaceholder")}</option>
                  {DURATA_SCELTE.map((n) => (
                    <option key={n} value={n}>{t("disponibilita.mesi", { n })}</option>
                  ))}
                </select>
              </div>
              <label className="mt-2 flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.disponibile_a_restare ?? false}
                  onChange={(e) => update("disponibile_a_restare", e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-petrol"
                />
                <span className="text-body-sm text-ink">{t("disponibilita.restareLabel")}</span>
              </label>
            </section>

            {/* ——— Ambiti ——— */}
            <section>
              <p className="text-body-sm font-medium text-navy">{t("disponibilita.ambitiLabel")}</p>
              <p className="mt-0.5 text-body-sm text-ink-tertiary">{t("disponibilita.ambitiHint")}</p>

              {ambiti.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {ambiti.map((a) => (
                    <span key={a} className="flex items-center gap-1 rounded-full bg-petrol-50 px-2.5 py-1 text-body-sm text-petrol-700">
                      {a}
                      <button
                        type="button"
                        onClick={() => update("ambiti", ambiti.filter((x) => x !== a))}
                        aria-label={t("disponibilita.removeAmbito", { ambito: a })}
                        className="text-petrol-700/60 transition-colors hover:text-petrol-700"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                          <line x1="6" y1="6" x2="18" y2="18" />
                          <line x1="18" y1="6" x2="6" y2="18" />
                        </svg>
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {ambiti.length < MAX_AMBITI && (
                <div className="mt-2 flex gap-2">
                  <input
                    type="text"
                    value={ambitoBozza}
                    placeholder={t("disponibilita.ambitiPlaceholder")}
                    onChange={(e) => setAmbitoBozza(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addAmbito();
                      }
                    }}
                    className={fieldClass}
                  />
                  <button
                    type="button"
                    onClick={addAmbito}
                    disabled={!ambitoBozza.trim()}
                    className="shrink-0 rounded-md border border-border px-3 py-2 text-body-sm text-navy transition-colors hover:bg-navy-50 disabled:opacity-40"
                  >
                    {t("disponibilita.addAmbito")}
                  </button>
                </div>
              )}
            </section>

            {/* ——— Tipo di azienda ——— */}
            <section>
              <p className="text-body-sm font-medium text-navy">{t("disponibilita.tipiLabel")}</p>
              <p className="mt-0.5 text-body-sm text-ink-tertiary">{t("disponibilita.tipiHint")}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {TIPI_AZIENDA.map((tipo) => {
                  const on = tipi.includes(tipo);
                  return (
                    <button
                      key={tipo}
                      type="button"
                      onClick={() => toggleTipo(tipo)}
                      aria-pressed={on}
                      className={`rounded-full border px-3 py-1 text-body-sm transition-colors duration-100 ${
                        on ? "border-petrol bg-petrol-50 text-petrol-700" : "border-border text-ink-secondary hover:border-border-strong"
                      }`}
                    >
                      {t(`disponibilita.tipiAzienda.${tipo}`)}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => update("tipi_azienda", tipi.length === TIPI_AZIENDA.length ? [] : [...TIPI_AZIENDA])}
                  className="rounded-full border border-dashed border-border px-3 py-1 text-body-sm text-ink-tertiary transition-colors hover:border-border-strong hover:text-navy"
                >
                  {t("disponibilita.tipiAll")}
                </button>
              </div>
            </section>

            {/* ——— Dove ——— */}
            <section>
              <p className="text-body-sm font-medium text-navy">{t("disponibilita.luoghiLabel")}</p>
              <p className="mt-0.5 text-body-sm text-ink-tertiary">{t("disponibilita.luoghiHint")}</p>

              <div className="mt-2 space-y-2">
                {luoghi.map((l) => (
                  <div key={l.id} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={l.posto}
                      placeholder={t("disponibilita.luogoPlaceholder")}
                      onChange={(e) => patchLuogo(l.id, { posto: e.target.value })}
                      className={fieldClass}
                    />
                    <select
                      value={l.modalita}
                      onChange={(e) => patchLuogo(l.id, { modalita: e.target.value as ModalitaLavoro })}
                      className="shrink-0 rounded-md border border-border px-3 py-2 text-body-sm text-ink focus:outline-none focus:ring-1 focus:ring-petrol/30"
                    >
                      {MODALITA.map((m) => (
                        <option key={m} value={m}>{t(`disponibilita.modalita.${m}`)}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => removeLuogo(l.id)}
                      aria-label={t("disponibilita.removeLuogo")}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-ink-tertiary transition-colors hover:bg-navy-50 hover:text-navy"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <line x1="6" y1="6" x2="18" y2="18" />
                        <line x1="18" y1="6" x2="6" y2="18" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addLuogo}
                className="mt-2 text-body-sm text-petrol transition-colors hover:text-petrol-700"
              >
                {luoghi.length === 0 ? t("disponibilita.addFirstLuogo") : t("disponibilita.addLuogo")}
              </button>
            </section>
          </>
        ) : (
          <div>
            <label className="text-ink-tertiary text-body-sm">{t("disponibilita.motivoLabel")}</label>
            <input
              type="text"
              value={form.periodo ?? ""}
              placeholder={t("disponibilita.motivoPlaceholder")}
              onChange={(e) => update("periodo", e.target.value)}
              className={`mt-1 ${fieldClass}`}
            />
          </div>
        )}

        {showPiano && (
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
              className={`mt-1 ${fieldClass}`}
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
        )}
      </div>
    </div>
  );
}

/**
 * Le righe della disponibilità come si leggono sulla card e nel profilo: periodi,
 * ambiti, luoghi, durata, tipi di azienda. Ognuna può mancare.
 */
export function useDisponibilitaRighe(d: DisponibilitaProseContent) {
  const t = useTranslations("CardBlocks");
  const locale = useLocale();

  const periodi = (d.finestre ?? [])
    .filter((f) => f.da)
    .map((f) => formatFinestra(f, locale, { from: t("disponibilita.fromWord"), to: t("disponibilita.toWord") }));

  const durataTesto = formatDurata(d, {
    months: (n) => t("disponibilita.mesi", { n }),
    range: (a, b) => t("disponibilita.mesiRange", { a, b }),
    atLeast: (n) => t("disponibilita.mesiMin", { n }),
    upTo: (n) => t("disponibilita.mesiMax", { n }),
  });

  const durata = [durataTesto, d.disponibile_a_restare ? t("disponibilita.restareShort") : null]
    .filter(Boolean)
    .join(", ");

  const luoghi = (d.luoghi ?? []).map((l) => `${l.posto} · ${t(`disponibilita.modalita.${l.modalita}`)}`);
  const tipi = (d.tipi_azienda ?? []).map((tipo) => t(`disponibilita.tipiAzienda.${tipo}`));

  return { periodi, durata: durata || null, ambiti: d.ambiti ?? [], luoghi, tipi };
}

/** Resa di sola lettura del blocco unito, riusata dal Profilo e dalle viste associazione/azienda. */
export function DisponibilitaEPianoView({
  disponibilita,
  piano,
  showPiano = true,
}: {
  disponibilita: DisponibilitaProseContent;
  piano: PianoCarrieraProseContent | null;
  showPiano?: boolean;
}) {
  const t = useTranslations("CardBlocks");
  const notActive = disponibilita.attiva === false;
  const righe = useDisponibilitaRighe(disponibilita);
  const legacy = hasLegacyDisponibilita(disponibilita);

  const gruppi: { label: string; valori: string[] }[] = [
    { label: t("disponibilita.quandoLabel"), valori: righe.periodi },
    { label: t("disponibilita.durataLabel"), valori: righe.durata ? [righe.durata] : [] },
    { label: t("disponibilita.ambitiLabel"), valori: righe.ambiti },
    { label: t("disponibilita.luoghiLabel"), valori: righe.luoghi },
    { label: t("disponibilita.tipiLabel"), valori: righe.tipi },
  ].filter((g) => g.valori.length > 0);

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
        ) : gruppi.length > 0 ? (
          <div className="space-y-1.5">
            {gruppi.map((g) => (
              <div key={g.label} className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="text-xs uppercase tracking-[0.1em] text-navy/50">{g.label}</span>
                {g.valori.map((v, i) => (
                  <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-petrol-50 text-petrol-700">
                    {v}
                  </span>
                ))}
              </div>
            ))}
          </div>
        ) : legacy ? (
          <div className="flex flex-wrap gap-1.5">
            {legacyPills(disponibilita).map((p, i) => (
              <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-border/50 text-ink-secondary">
                {p}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-body-sm text-ink-tertiary italic">{t("disponibilita.notSpecified")}</p>
        )}
      </div>
      {showPiano && piano?.testo && (
        <div>
          <p className="text-eyebrow text-navy/60 uppercase mb-2">{t("titles.pianoCarriera")}</p>
          <p className="text-body-sm text-ink">{piano.testo}</p>
        </div>
      )}
    </div>
  );
}
