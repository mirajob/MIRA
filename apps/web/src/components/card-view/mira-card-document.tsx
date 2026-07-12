"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { getCompetenzaCategoria } from "@mira/types";
import type {
  HeaderProseContent,
  HeaderVisibility,
  DisponibilitaProseContent,
  FormazioneItem,
  EsperienzaItem,
  CompetenzeProseContent,
  LinguaItem,
  InteressiProseContent,
  AutodescrizioneProseContent,
  PianoCarrieraProseContent,
} from "@mira/types";

/**
 * La MiraCard come documento a formato fisso — il "CV virtuale".
 *
 * A differenza di MiraCardLayout (contenuto responsive che si riadatta), qui la card è un
 * foglio a larghezza fissa (~A4 a 96dpi) che viene SCALATO per stare nel contenitore, come
 * un PDF in un viewer: da telefono la vedi intera rimpicciolita e tocchi per ingrandire.
 * Le sezioni espandibili non allungano mai il foglio — aprono un overlay sopra la card
 * (pannello centrato su desktop, bottom sheet su mobile), così la pagina resta immutabile.
 *
 * L'overlay è renderizzato FUORI dal sottoalbero trasformato: position:fixed dentro un
 * antenato con transform verrebbe posizionato rispetto a quello, non al viewport.
 */

const SHEET_W = 794; // larghezza A4 a 96dpi
const SHEET_MIN_H = 1123; // altezza A4 — il foglio può crescere oltre, ma non restringersi
const ZOOM_THRESHOLD = 0.7; // sotto questa scala il testo non è leggibile: si abilita il tap-to-zoom

export interface MiraCardDocumentProps {
  header?: { data: HeaderProseContent; visibility: HeaderVisibility };
  disponibilita?: { data: DisponibilitaProseContent };
  esperienze?: { data: { items: EsperienzaItem[] } };
  formazione?: { data: { items: FormazioneItem[] } };
  competenze?: { data: CompetenzeProseContent };
  lingue?: { data: { items: LinguaItem[] } };
  interessi?: { data: InteressiProseContent };
  autodescrizione?: { data: AutodescrizioneProseContent };
  pianoCarriera?: { data: PianoCarrieraProseContent };
  /** "self" = lo studente guarda la propria card (vede sempre la media); altrimenti decide il flag di visibilità. */
  viewer?: "self" | "associazioni" | "aziende";
  /** Nome reale, o codice anonimizzato tipo "C001" per la vista azienda. */
  displayName?: string | null;
}

interface OverlayState {
  title: string;
  content: React.ReactNode;
}

/** Taglia un testo lungo a un limite di caratteri, spezzando sull'ultimo spazio. */
function clampText(testo: string, limit: number): { clamped: string; isClamped: boolean } {
  if (testo.length <= limit) return { clamped: testo, isClamped: false };
  const cut = testo.slice(0, limit);
  const lastSpace = cut.lastIndexOf(" ");
  return { clamped: cut.slice(0, lastSpace > limit * 0.6 ? lastSpace : limit) + "…", isClamped: true };
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] tracking-[0.14em] text-navy/60 uppercase mb-1.5">{children}</p>;
}

export function MiraCardDocument(props: MiraCardDocumentProps) {
  const t = useTranslations("CardBlocks");
  const d = useTranslations("CardDocument");
  const [overlay, setOverlay] = useState<OverlayState | null>(null);
  const [fitScale, setFitScale] = useState(1);
  const [sheetH, setSheetH] = useState(SHEET_MIN_H);
  const [zoomed, setZoomed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const sheet = sheetRef.current;
    if (!container || !sheet) return;
    const measure = () => {
      setFitScale(Math.min(1, container.clientWidth / SHEET_W));
      setSheetH(Math.max(SHEET_MIN_H, sheet.offsetHeight));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(container);
    ro.observe(sheet);
    return () => ro.disconnect();
  }, []);

  const closeOverlay = useCallback(() => setOverlay(null), []);
  useEffect(() => {
    if (!overlay) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeOverlay();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [overlay, closeOverlay]);

  const viewer = props.viewer ?? "associazioni";
  const showMedia =
    viewer === "self" || props.header?.visibility?.media_voti?.[viewer] === true;

  const hasAny = [
    props.header, props.disponibilita, props.esperienze, props.competenze,
    props.lingue, props.interessi, props.autodescrizione, props.pianoCarriera,
  ].some(Boolean);

  if (!hasAny) {
    return (
      <div className="rounded-xl border border-border bg-white p-5">
        <p className="text-body-sm text-ink-secondary">{d("empty")}</p>
      </div>
    );
  }

  const canZoom = fitScale < ZOOM_THRESHOLD;
  const effScale = zoomed ? 1 : fitScale;

  const header = props.header?.data;
  const fp = header?.formazione_precedente;
  const formazioneItems = props.formazione?.data.items ?? [];
  const dispPills = props.disponibilita
    ? ([props.disponibilita.data.cosa_cerca, props.disponibilita.data.ambito, props.disponibilita.data.periodo, props.disponibilita.data.dove].filter(Boolean) as string[])
    : [];
  const esperienze = props.esperienze?.data.items ?? [];
  const competenze = props.competenze?.data;
  const hardItems = competenze?.items.filter((it) => getCompetenzaCategoria(it) === "hard") ?? [];
  const academicItems = competenze?.items.filter((it) => getCompetenzaCategoria(it) === "academic") ?? [];
  const softSkills = competenze?.soft_skills ?? [];
  const softTesto = competenze?.soft_skills_testo ?? null;
  const lingue = props.lingue?.data.items ?? [];
  const autodescrizione = props.autodescrizione?.data.testo ?? null;
  const interessi = props.interessi?.data.testo ?? null;
  const piano = props.pianoCarriera?.data.testo ?? null;

  const MAX_ESPERIENZE = 5;
  const visibleEsperienze = esperienze.slice(0, MAX_ESPERIENZE);
  const hiddenEsperienze = esperienze.length - visibleEsperienze.length;

  function openEsami() {
    setOverlay({
      title: t("header.esami", { count: formazioneItems.length }),
      content: (
        <div className="space-y-1.5">
          {formazioneItems.map((it) => (
            <div key={it.id} className="flex items-center justify-between gap-3 text-body-sm">
              <span className="text-ink">{it.esame}</span>
              {showMedia && (
                <span className="text-ink-secondary whitespace-nowrap">
                  {it.voto ?? "—"}
                  {it.cfu != null && <span className="text-xs text-ink-tertiary">{t("header.cfuSuffix", { cfu: it.cfu })}</span>}
                </span>
              )}
            </div>
          ))}
        </div>
      ),
    });
  }

  function openEsperienza(it: EsperienzaItem) {
    setOverlay({
      title: it.titolo || it.organizzazione,
      content: (
        <div className="space-y-2">
          <p className="text-body-sm text-ink-tertiary">
            {it.organizzazione}
            {it.periodo && ` · ${it.periodo}`}
          </p>
          {it.descrizione && <p className="text-body-sm text-ink whitespace-pre-wrap">{it.descrizione}</p>}
        </div>
      ),
    });
  }

  function openAllEsperienze() {
    setOverlay({
      title: t("titles.esperienze"),
      content: (
        <div className="space-y-4">
          {esperienze.map((it) => (
            <div key={it.id}>
              <p className="text-body-sm font-medium text-ink">{it.titolo || it.organizzazione}</p>
              <p className="text-xs text-ink-tertiary">
                {it.organizzazione}
                {it.periodo && ` · ${it.periodo}`}
              </p>
              {it.descrizione && <p className="mt-1 text-body-sm text-ink-secondary whitespace-pre-wrap">{it.descrizione}</p>}
            </div>
          ))}
        </div>
      ),
    });
  }

  function openProse(title: string, testo: string) {
    setOverlay({
      title,
      content: <p className="text-body-sm text-ink whitespace-pre-wrap">{testo}</p>,
    });
  }

  function openSoft() {
    setOverlay({
      title: t("competenze.softHeading"),
      content: softSkills.length > 0 ? (
        <ul className="space-y-1.5 list-disc list-inside">
          {softSkills.map((s, i) => (
            <li key={i} className="text-body-sm text-ink">{s}</li>
          ))}
        </ul>
      ) : (
        <p className="text-body-sm text-ink">{softTesto}</p>
      ),
    });
  }

  function openHard() {
    setOverlay({
      title: t("competenze.hardHeading"),
      content: (
        <div className="space-y-1.5">
          {hardItems.map((it) => (
            <div key={it.id} className="text-body-sm text-ink flex items-center gap-2 flex-wrap">
              <span>{it.testo}</span>
              {it.livello && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-petrol-50 text-petrol-700">
                  {t(`competenze.livelloLabels.${it.livello}`)}
                </span>
              )}
              {it.evidenza_ref && <span className="text-xs text-ink-tertiary">· {it.evidenza_ref}</span>}
            </div>
          ))}
        </div>
      ),
    });
  }

  function openAcademic() {
    setOverlay({
      title: t("competenze.academicHeading"),
      content: (
        <div className="space-y-1.5">
          {academicItems.map((it) => (
            <div key={it.id} className="text-body-sm text-ink">
              {it.testo}
              {it.evidenza_ref && <span className="text-xs text-ink-tertiary"> · {it.evidenza_ref}</span>}
            </div>
          ))}
        </div>
      ),
    });
  }

  /** Testo in prosa con troncamento a caratteri e "Leggi tutto" in overlay. */
  function ProseSection({ title, testo, limit, serif }: { title: string; testo: string; limit: number; serif?: boolean }) {
    const { clamped, isClamped } = clampText(testo, limit);
    return (
      <div>
        <SectionTitle>{title}</SectionTitle>
        <p className={`text-[12px] leading-relaxed text-ink ${serif ? "font-display italic" : ""}`}>{clamped}</p>
        {isClamped && (
          <button type="button" onClick={(e) => { e.stopPropagation(); openProse(title, testo); }} className="mt-0.5 text-[11px] text-petrol hover:text-petrol-700 transition-colors">
            {d("readMore")} ▸
          </button>
        )}
      </div>
    );
  }

  const levelLabel = header?.livello
    ? t.has(`header.levelLabels.${header.livello}`) ? t(`header.levelLabels.${header.livello}`) : header.livello
    : null;

  return (
    <div>
      {/* Contenitore misurato: il foglio viene scalato per starci in larghezza. */}
      <div
        ref={containerRef}
        className={zoomed ? "overflow-x-auto" : ""}
        onClick={canZoom && !zoomed ? () => setZoomed(true) : undefined}
        role={canZoom && !zoomed ? "button" : undefined}
        aria-label={canZoom && !zoomed ? d("zoomIn") : undefined}
      >
        <div style={{ height: sheetH * effScale, width: zoomed ? SHEET_W : undefined }}>
          <div
            ref={sheetRef}
            style={{ width: SHEET_W, minHeight: SHEET_MIN_H, transform: `scale(${effScale})`, transformOrigin: "top left" }}
            className={`bg-white border border-border rounded-lg shadow-sm ${canZoom && !zoomed ? "cursor-zoom-in" : ""}`}
          >
            {/* ——— Masthead ——— */}
            <div className="px-10 pt-9 pb-5">
              <div className="flex items-baseline justify-between gap-4">
                {props.displayName && (
                  <h1 className="font-display text-[28px] leading-tight text-navy">{props.displayName}</h1>
                )}
                <span className="text-[10px] tracking-[0.22em] text-navy/40 uppercase shrink-0">MIRA Card</span>
              </div>

              {/* Studi a sinistra, Disponibilità etichettata a destra — stessa striscia,
                  allineata alle due colonne del corpo. */}
              <div className="mt-2.5 grid grid-cols-[1fr_260px] gap-x-7">
                <div className="min-w-0">
                  {header && (
                    <>
                      <p className="text-[14px] text-ink">
                        {header.corso && <span className="font-medium">{header.corso}</span>}
                        {header.universita && <span className="text-ink-secondary"> — {header.universita}</span>}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] text-ink-secondary">
                        {levelLabel && <span>{levelLabel}</span>}
                        {header.anno && <span>{t("header.annoOrdinal", { n: header.anno })}</span>}
                        {(header.anno_inizio || header.laurea_anno) && (
                          <span>{header.anno_inizio ?? "—"}–{header.laurea_anno ?? "—"}</span>
                        )}
                        {header.media_voti != null &&
                          (showMedia ? (
                            <span className="font-medium text-ink">{Number(header.media_voti).toFixed(1)}/30</span>
                          ) : (
                            <span className="italic text-ink-tertiary text-[11px]">{t("header.mediaNotShared")}</span>
                          ))}
                        {formazioneItems.length > 0 && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); openEsami(); }}
                            className="text-petrol hover:text-petrol-700 transition-colors"
                          >
                            {t("header.esami", { count: formazioneItems.length })} ▸
                          </button>
                        )}
                      </div>
                      {fp && (fp.corso || fp.universita) && (
                        <p className="mt-1 text-[11px] text-ink-tertiary">
                          {t("header.previousDegreeSummaryPrefix")} {fp.corso ?? "—"}
                          {fp.universita ? ` — ${fp.universita}` : ""}
                          {fp.voto_laurea ? ` (${fp.voto_laurea})` : ""}
                        </p>
                      )}
                    </>
                  )}
                </div>

                {dispPills.length > 0 && (
                  <div className="min-w-0 border-l border-border pl-6">
                    <SectionTitle>{t("titles.disponibilita")}</SectionTitle>
                    <div className="flex flex-wrap gap-1.5">
                      {dispPills.map((p, i) => (
                        <span key={i} className="text-[11px] px-2 py-0.5 rounded-full bg-petrol-50 text-petrol-700">
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-border" />

            {/* ——— Due colonne tematiche ——— */}
            <div className="grid grid-cols-[1fr_260px] gap-x-7 px-10 py-6">
              <div className="min-w-0 space-y-5">
                {autodescrizione && (
                  <ProseSection title={t("titles.autodescrizione")} testo={autodescrizione} limit={520} serif />
                )}

                {esperienze.length > 0 && (
                  <div>
                    <SectionTitle>{t("titles.esperienze")}</SectionTitle>
                    <div className="space-y-3">
                      {visibleEsperienze.map((it) => (
                        <button
                          key={it.id}
                          type="button"
                          onClick={(e) => { e.stopPropagation(); openEsperienza(it); }}
                          className="block w-full text-left group"
                        >
                          <p className="text-[13px] font-medium text-ink group-hover:text-petrol transition-colors">
                            {it.titolo || it.organizzazione}
                          </p>
                          <p className="text-[11px] text-ink-tertiary">
                            {it.organizzazione}
                            {it.periodo && ` · ${it.periodo}`}
                          </p>
                          {it.descrizione && (
                            <p className="text-[12px] text-ink-secondary line-clamp-2">{it.descrizione}</p>
                          )}
                        </button>
                      ))}
                    </div>
                    {hiddenEsperienze > 0 && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); openAllEsperienze(); }}
                        className="mt-2 text-[11px] text-petrol hover:text-petrol-700 transition-colors"
                      >
                        {d("moreItems", { count: hiddenEsperienze })} ▸
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="min-w-0 space-y-5 border-l border-border pl-6">
                {(softSkills.length > 0 || softTesto || hardItems.length > 0 || academicItems.length > 0) && (
                  <div>
                    <SectionTitle>{t("titles.competenze")}</SectionTitle>
                    <div className="space-y-1.5">
                      {(softSkills.length > 0 || softTesto) && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); openSoft(); }}
                          className="block text-[12px] text-petrol hover:text-petrol-700 transition-colors"
                        >
                          {t("competenze.softSkillsCount", { count: softSkills.length || 1 })} ▸
                        </button>
                      )}
                      {hardItems.length > 0 && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); openHard(); }}
                          className="block text-[12px] text-petrol hover:text-petrol-700 transition-colors"
                        >
                          {t("competenze.hardSkillsCount", { count: hardItems.length })} ▸
                        </button>
                      )}
                      {academicItems.length > 0 && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); openAcademic(); }}
                          className="block text-[12px] text-petrol hover:text-petrol-700 transition-colors"
                        >
                          {t("competenze.academicSkills", { count: academicItems.length })} ▸
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {lingue.length > 0 && (
                  <div>
                    <SectionTitle>{t("titles.lingue")}</SectionTitle>
                    <div className="flex flex-wrap gap-1.5">
                      {lingue.map((it) => (
                        <span key={it.id} className="text-[11px] px-2 py-0.5 rounded-full bg-petrol-50 text-petrol-700">
                          {it.lingua} {it.livello}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {interessi && <ProseSection title={t("titles.interessi")} testo={interessi} limit={260} />}

                {piano && <ProseSection title={t("titles.pianoCarriera")} testo={piano} limit={260} />}
              </div>
            </div>
          </div>
        </div>
      </div>

      {canZoom && !zoomed && (
        <p className="mt-2 text-center text-xs text-ink-tertiary">{d("zoomIn")}</p>
      )}
      {zoomed && (
        <button
          type="button"
          onClick={() => setZoomed(false)}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 rounded-full bg-navy text-white text-xs px-4 py-2 shadow-lg"
        >
          {d("zoomOut")}
        </button>
      )}

      {/* ——— Overlay dettaglio: centrato su desktop, bottom sheet su mobile.
           Fuori dal sottoalbero scalato, altrimenti position:fixed si romperebbe. ——— */}
      {overlay && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" onClick={closeOverlay}>
          <div className="absolute inset-0 bg-navy/40" aria-hidden="true" />
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-h-[80vh] overflow-y-auto rounded-t-2xl bg-white p-6 shadow-xl sm:max-w-lg sm:rounded-xl"
          >
            <div className="mb-3 flex items-center justify-between gap-4">
              <p className="text-eyebrow text-navy/60 uppercase">{overlay.title}</p>
              <button
                type="button"
                onClick={closeOverlay}
                aria-label={d("close")}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-ink-secondary hover:bg-navy-50 hover:text-navy transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="6" y1="6" x2="18" y2="18" />
                  <line x1="18" y1="6" x2="6" y2="18" />
                </svg>
              </button>
            </div>
            {overlay.content}
          </div>
        </div>
      )}
    </div>
  );
}
