"use client";

import { useState, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { updateCardBlockProseContent } from "@/lib/actions/card-blocks";
import { CardBlockHeader } from "./card-block-header";
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
  TipoAzienda,
} from "@mira/types";

/**
 * Blocco "Disponibilità lavorative".
 *
 * Rework 2026-08: non più cinque caselle di testo libero. Quando si è liberi sono date
 * vere scelte sul calendario (anche più periodi, anche senza fine), la durata è una
 * scelta in mesi, i luoghi hanno ognuno la propria modalità e il tipo di azienda si
 * prende da un elenco. Restano scritti a mano solo ambiti e luoghi, che nessun elenco
 * può contenere per intero: MIRA legge le parole, quindi un errore di battitura non
 * rompe il matching.
 *
 * Il piano di carriera non sta più qui: è l'ultima tappa dell'onboarding, dopo il
 * profilo personale. Mescolare "quando sei libero" con "dove vuoi arrivare" faceva un
 * blocco lunghissimo e due domande diverse nello stesso respiro.
 *
 * Impaginazione a righe (etichetta a sinistra, comandi a destra) e non a campi impilati:
 * un modulo di sei caselle bianche una sull'altra è esattamente quello che la card
 * dovrebbe evitare.
 */

/** Le durate che la gente usa davvero. "12+" = da un anno in su, senza tetto. */
const DURATE = ["1", "3", "6", "12", "12+"] as const;
const MODALITA: ModalitaLavoro[] = ["in_presenza", "ibrido", "remoto"];

function durataValue(d: DisponibilitaProseContent): string {
  if (d.durata_min_mesi == null) return "";
  if (d.durata_max_mesi == null) return "12+";
  return String(d.durata_min_mesi);
}

/**
 * Riga del blocco: etichetta a sinistra, comandi a destra, righello sottile in mezzo.
 *
 * Le due colonne compaiono solo se il BLOCCO e' largo abbastanza (container query, non
 * viewport): nel masthead del Profilo questo blocco vive in una colonna da ~300px, e
 * con le due colonne fisse i comandi finivano incolonnati uno sull'altro.
 */
function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2 border-t border-border py-4 first:border-t-0 first:pt-0 @[430px]:grid-cols-[128px_1fr] @[430px]:gap-5">
      <div>
        <p className="text-xs uppercase tracking-[0.1em] text-navy/55">{label}</p>
        {hint && <p className="mt-1 hidden text-body-sm leading-snug text-ink-tertiary @[430px]:block">{hint}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function IconButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-ink-tertiary transition-colors duration-100 hover:bg-navy-50 hover:text-navy"
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <line x1="6" y1="6" x2="18" y2="18" />
        <line x1="18" y1="6" x2="6" y2="18" />
      </svg>
    </button>
  );
}

const SELECT_CLASS =
  "rounded-md border border-border bg-white px-3 py-2 text-body-sm text-ink transition-colors duration-100 hover:border-border-strong focus:border-petrol focus:outline-none";
const INPUT_CLASS =
  "w-full rounded-md border border-border bg-white px-3 py-2 text-body-sm text-ink transition-colors duration-100 placeholder:text-ink-tertiary hover:border-border-strong focus:border-petrol focus:outline-none";

export function DisponibilitaBlock({
  disponibilita,
  status,
  onApproved,
}: {
  disponibilita: DisponibilitaProseContent;
  status: CardBlockStatus;
  onApproved?: () => void;
}) {
  const t = useTranslations("CardBlocks");
  const [form, setForm] = useState(disponibilita);
  const [ambitoBozza, setAmbitoBozza] = useState("");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!dirty) setForm(disponibilita);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disponibilita]);

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

  function addFinestra() {
    update("finestre", [...finestre, { id: newId(), da: "", a: null }]);
  }
  function patchFinestra(id: string, patch: Partial<FinestraDisponibilita>) {
    update("finestre", finestre.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }

  function addAmbito() {
    const testo = ambitoBozza.trim();
    if (!testo || ambiti.length >= MAX_AMBITI) return;
    if (!ambiti.some((a) => a.toLowerCase() === testo.toLowerCase())) {
      update("ambiti", [...ambiti, testo]);
    }
    setAmbitoBozza("");
  }

  function addLuogo() {
    update("luoghi", [...luoghi, { id: newId(), posto: "", modalita: "in_presenza" }]);
  }
  function patchLuogo(id: string, patch: Partial<LuogoDisponibilita>) {
    update("luoghi", luoghi.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  function setDurata(value: string) {
    if (!value) {
      update("durata_min_mesi", null);
      update("durata_max_mesi", null);
      return;
    }
    if (value === "12+") {
      update("durata_min_mesi", 12);
      update("durata_max_mesi", null);
      return;
    }
    const n = Number(value);
    update("durata_min_mesi", n);
    update("durata_max_mesi", n);
  }

  async function handleSave() {
    // Non in cerca: i dettagli della ricerca non hanno senso e vengono azzerati. Resta
    // il motivo (campo `periodo`), l'unica cosa utile da leggere in quel caso.
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
    setDirty(false);
  }

  return (
    <div className="@container overflow-hidden rounded-lg border border-border bg-white">
      <CardBlockHeader
        title={t("titles.disponibilita")}
        status={status}
        blockType="disponibilita"
        onBeforeApprove={handleSave}
        onApproved={onApproved}
      />
      <div className="px-5 py-4">
        <label className="mb-2 flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={attiva}
            onChange={(e) => update("attiva", e.target.checked)}
            className="h-4 w-4 accent-petrol"
          />
          <span className="text-body-sm text-ink">{t("disponibilita.attivaLabel")}</span>
        </label>

        {!attiva ? (
          <div className="pt-2">
            <p className="text-xs uppercase tracking-[0.1em] text-navy/55">{t("disponibilita.motivoLabel")}</p>
            <input
              type="text"
              value={form.periodo ?? ""}
              placeholder={t("disponibilita.motivoPlaceholder")}
              onChange={(e) => update("periodo", e.target.value)}
              className={`mt-2 ${INPUT_CLASS}`}
            />
          </div>
        ) : (
          <div>
            {legacy && (
              <div className="mb-4 rounded-md border border-warning/40 bg-warning-bg px-3 py-2">
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

            <Row label={t("disponibilita.quandoLabel")} hint={t("disponibilita.quandoHint")}>
              <div className="space-y-2">
                {finestre.map((f) => (
                  <div key={f.id} className="flex flex-wrap items-center gap-2">
                    <div className="min-w-[130px] flex-1 @[430px]:max-w-[160px]">
                      <DateField
                        value={f.da || null}
                        onChange={(iso) => patchFinestra(f.id, { da: iso, a: f.a && f.a < iso ? null : f.a })}
                        placeholder={t("disponibilita.fromPlaceholder")}
                        ariaLabel={t("disponibilita.fromLabel")}
                      />
                    </div>
                    <span className="text-body-sm text-ink-tertiary">{t("disponibilita.toLabel")}</span>
                    <div className="min-w-[130px] flex-1 @[430px]:max-w-[160px]">
                      {f.a === null ? (
                        <button
                          type="button"
                          onClick={() => patchFinestra(f.id, { a: f.da || "" })}
                          className="w-full rounded-md border border-dashed border-border px-3 py-2 text-left text-body-sm text-ink-tertiary transition-colors hover:border-border-strong"
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
                    <IconButton
                      onClick={() => update("finestre", finestre.filter((x) => x.id !== f.id))}
                      label={t("disponibilita.removePeriod")}
                    />
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addFinestra}
                  className="text-body-sm text-petrol transition-colors hover:text-petrol-700"
                >
                  {finestre.length === 0 ? t("disponibilita.addFirstPeriod") : t("disponibilita.addPeriod")}
                </button>
              </div>
            </Row>

            <Row label={t("disponibilita.durataLabel")}>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <select value={durataValue(form)} onChange={(e) => setDurata(e.target.value)} className={SELECT_CLASS}>
                  <option value="">{t("disponibilita.durataPlaceholder")}</option>
                  {DURATE.map((value) => (
                    <option key={value} value={value}>
                      {value === "12+" ? t("disponibilita.mesiOltre", { n: 12 }) : t("disponibilita.mesi", { n: Number(value) })}
                    </option>
                  ))}
                </select>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.disponibile_a_restare ?? false}
                    onChange={(e) => update("disponibile_a_restare", e.target.checked)}
                    className="h-4 w-4 accent-petrol"
                  />
                  <span className="text-body-sm text-ink">{t("disponibilita.restareLabel")}</span>
                </label>
              </div>
            </Row>

            <Row label={t("disponibilita.ambitiLabel")} hint={t("disponibilita.ambitiHint")}>
              <div className="flex flex-wrap items-center gap-1.5">
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
                {ambiti.length < MAX_AMBITI && (
                  <input
                    type="text"
                    value={ambitoBozza}
                    placeholder={t("disponibilita.ambitiPlaceholder")}
                    onChange={(e) => setAmbitoBozza(e.target.value)}
                    onBlur={addAmbito}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addAmbito();
                      }
                    }}
                    className="min-w-[180px] flex-1 rounded-full border border-dashed border-border bg-white px-3 py-1 text-body-sm text-ink transition-colors placeholder:text-ink-tertiary hover:border-border-strong focus:border-petrol focus:outline-none"
                  />
                )}
              </div>
            </Row>

            <Row label={t("disponibilita.tipiLabel")}>
              <div className="flex flex-wrap gap-1.5">
                {TIPI_AZIENDA.map((tipo) => {
                  const on = tipi.includes(tipo);
                  return (
                    <button
                      key={tipo}
                      type="button"
                      onClick={() => update("tipi_azienda", on ? tipi.filter((x) => x !== tipo) : [...tipi, tipo])}
                      aria-pressed={on}
                      className={`rounded-full border px-3 py-1 text-body-sm transition-colors duration-100 ${
                        on
                          ? "border-petrol bg-petrol-50 text-petrol-700"
                          : "border-border text-ink-secondary hover:border-border-strong"
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
            </Row>

            <Row label={t("disponibilita.luoghiLabel")} hint={t("disponibilita.luoghiHint")}>
              <div className="space-y-2">
                {luoghi.map((l) => (
                  <div key={l.id} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={l.posto}
                      placeholder={t("disponibilita.luogoPlaceholder")}
                      onChange={(e) => patchLuogo(l.id, { posto: e.target.value })}
                      className={`min-w-0 flex-1 @[430px]:max-w-[240px] ${INPUT_CLASS}`}
                    />
                    <select
                      value={l.modalita}
                      onChange={(e) => patchLuogo(l.id, { modalita: e.target.value as ModalitaLavoro })}
                      className={SELECT_CLASS}
                    >
                      {MODALITA.map((m) => (
                        <option key={m} value={m}>{t(`disponibilita.modalita.${m}`)}</option>
                      ))}
                    </select>
                    <IconButton
                      onClick={() => update("luoghi", luoghi.filter((x) => x.id !== l.id))}
                      label={t("disponibilita.removeLuogo")}
                    />
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addLuogo}
                  className="text-body-sm text-petrol transition-colors hover:text-petrol-700"
                >
                  {luoghi.length === 0 ? t("disponibilita.addFirstLuogo") : t("disponibilita.addLuogo")}
                </button>
              </div>
            </Row>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Le righe della disponibilità come si leggono sulla card e nel profilo: periodi,
 * durata, ambiti, luoghi, tipi di azienda. Ognuna può mancare.
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
    atLeast: (n) => t("disponibilita.mesiOltre", { n }),
    upTo: (n) => t("disponibilita.mesiMax", { n }),
  });

  const durata = [durataTesto, d.disponibile_a_restare ? t("disponibilita.restareShort") : null]
    .filter(Boolean)
    .join(", ");

  const luoghi = (d.luoghi ?? []).map((l) => `${l.posto} · ${t(`disponibilita.modalita.${l.modalita}`)}`);
  const tipi = (d.tipi_azienda ?? []).map((tipo) => t(`disponibilita.tipiAzienda.${tipo}`));

  return { periodi, durata: durata || null, ambiti: d.ambiti ?? [], luoghi, tipi };
}

/** Resa di sola lettura, riusata dal Profilo e dalle viste associazione/azienda. */
export function DisponibilitaView({ disponibilita }: { disponibilita: DisponibilitaProseContent }) {
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
    <div className="p-4">
      <p className="mb-2 pr-24 text-eyebrow uppercase text-navy/60">{t("titles.disponibilita")}</p>
      {notActive ? (
        <div className="flex flex-wrap gap-1.5">
          <span className="rounded-full bg-border/60 px-2 py-0.5 text-xs text-ink-secondary">
            {t("disponibilita.notActive")}
          </span>
          {disponibilita.periodo && (
            <span className="rounded-full bg-petrol-50 px-2 py-0.5 text-xs text-petrol-700">{disponibilita.periodo}</span>
          )}
        </div>
      ) : gruppi.length > 0 ? (
        <div className="space-y-1.5">
          {gruppi.map((g) => (
            <div key={g.label} className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="text-xs uppercase tracking-[0.1em] text-navy/50">{g.label}</span>
              {g.valori.map((v, i) => (
                <span key={i} className="rounded-full bg-petrol-50 px-2 py-0.5 text-xs text-petrol-700">
                  {v}
                </span>
              ))}
            </div>
          ))}
        </div>
      ) : legacy ? (
        <div className="flex flex-wrap gap-1.5">
          {legacyPills(disponibilita).map((p, i) => (
            <span key={i} className="rounded-full bg-border/50 px-2 py-0.5 text-xs text-ink-secondary">
              {p}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-body-sm italic text-ink-tertiary">{t("disponibilita.notSpecified")}</p>
      )}
    </div>
  );
}
