"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { updateCardBlockProseContent, updateHeaderVisibility } from "@/lib/actions/card-blocks";
import { CardBlockHeader } from "./card-block-header";
import type { CardBlockStatus, FormazioneItem, HeaderProseContent, HeaderVisibility } from "@mira/types";

const LEVEL_KEYS = ["triennale", "magistrale", "ciclo_unico", "phd"] as const;

export function HeaderBlock({
  proseContent,
  visibility,
  status,
  formazioneItems,
  onApproved,
}: {
  proseContent: HeaderProseContent;
  visibility: HeaderVisibility;
  status: CardBlockStatus;
  /** Esami dal libretto, mostrati come sezione espandibile qui — non un blocco a sé (spec: un solo Conferma per Header+Formazione). */
  formazioneItems: FormazioneItem[];
  onApproved?: () => void;
}) {
  const t = useTranslations("CardBlocks");
  const c = useTranslations("Common");
  const [form, setForm] = useState(proseContent);
  const [vis, setVis] = useState<HeaderVisibility>(
    visibility?.media_voti ? visibility : { media_voti: { associazioni: false, aziende: false } }
  );
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [esamiExpanded, setEsamiExpanded] = useState(false);

  // In onboarding proseContent arriva in modo asincrono (es. dopo il parsing del libretto):
  // se non c'è un edit locale in corso, riflette sempre l'ultimo dato dal server.
  useEffect(() => {
    if (!dirty) setForm(proseContent);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proseContent]);
  useEffect(() => {
    if (visibility?.media_voti) setVis(visibility);
  }, [visibility]);

  function update<K extends keyof HeaderProseContent>(key: K, value: HeaderProseContent[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setDirty(true);
  }

  function updateFP(key: "universita" | "corso" | "voto_laurea" | "tema_tesi", value: string) {
    setForm((f) => ({
      ...f,
      formazione_precedente: {
        universita: null,
        corso: null,
        voto_laurea: null,
        tema_tesi: null,
        ...f.formazione_precedente,
        [key]: value || null,
      },
    }));
    setDirty(true);
  }

  async function handleSave() {
    setSaving(true);
    await updateCardBlockProseContent("header", form);
    setSaving(false);
    setDirty(false);
  }

  async function toggleVisibility(key: keyof HeaderVisibility["media_voti"]) {
    const next = { media_voti: { ...vis.media_voti, [key]: !vis.media_voti[key] } };
    setVis(next);
    await updateHeaderVisibility(next);
  }

  return (
    <div className="rounded-lg border border-border bg-white overflow-hidden">
      <CardBlockHeader
        title={t("titles.header")}
        status={status}
        blockType="header"
        alsoApprove={["formazione"]}
        onApproved={onApproved}
      />
      <div className="p-5 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-ink-tertiary text-body-sm">{t("header.universitaLabel")}</label>
            <input
              type="text"
              value={form.universita ?? ""}
              onChange={(e) => update("universita", e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-md border border-border text-body-sm text-ink focus:outline-none focus:ring-1 focus:ring-petrol/30"
            />
          </div>
          <div>
            <label className="text-ink-tertiary text-body-sm">{t("header.corsoLabel")}</label>
            <input
              type="text"
              value={form.corso ?? ""}
              onChange={(e) => update("corso", e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-md border border-border text-body-sm text-ink focus:outline-none focus:ring-1 focus:ring-petrol/30"
            />
          </div>
          <div>
            <label className="text-ink-tertiary text-body-sm">{t("header.livelloLabel")}</label>
            <select
              value={form.livello ?? ""}
              onChange={(e) => update("livello", e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-md border border-border text-body-sm text-ink focus:outline-none focus:ring-1 focus:ring-petrol/30"
            >
              <option value="">—</option>
              {LEVEL_KEYS.map((value) => (
                <option key={value} value={value}>{t(`header.levelLabels.${value}`)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-ink-tertiary text-body-sm">{t("header.annoLabel")}</label>
            <input
              type="number"
              placeholder={t("header.annoPlaceholder")}
              value={form.anno ?? ""}
              onChange={(e) => update("anno", e.target.value ? Number(e.target.value) : null)}
              className="mt-1 w-full px-3 py-2 rounded-md border border-border text-body-sm text-ink focus:outline-none focus:ring-1 focus:ring-petrol/30"
            />
          </div>
          <div>
            <label className="text-ink-tertiary text-body-sm">{t("header.annoInizioLabel")}</label>
            <input
              type="number"
              placeholder={t("header.annoInizioPlaceholder")}
              value={form.anno_inizio ?? ""}
              onChange={(e) => update("anno_inizio", e.target.value ? Number(e.target.value) : null)}
              className="mt-1 w-full px-3 py-2 rounded-md border border-border text-body-sm text-ink focus:outline-none focus:ring-1 focus:ring-petrol/30"
            />
          </div>
          <div>
            <label className="text-ink-tertiary text-body-sm">{t("header.laureaPrevistaLabel")}</label>
            <input
              type="number"
              placeholder={t("header.laureaPrevistaPlaceholder")}
              value={form.laurea_anno ?? ""}
              onChange={(e) => update("laurea_anno", e.target.value ? Number(e.target.value) : null)}
              className="mt-1 w-full px-3 py-2 rounded-md border border-border text-body-sm text-ink focus:outline-none focus:ring-1 focus:ring-petrol/30"
            />
          </div>
          <div>
            <label className="text-ink-tertiary text-body-sm">{t("header.mediaLabel")}</label>
            <p className="mt-1 px-3 py-2 text-body-sm text-ink-secondary" title={t("header.mediaCambioNote")}>
              {form.media_voti ? `${Number(form.media_voti).toFixed(1)}/30` : "—"}
            </p>
          </div>
        </div>

        {formazioneItems.length > 0 && (
          <div className="border-t border-border pt-4">
            <button
              type="button"
              onClick={() => setEsamiExpanded((e) => !e)}
              className="flex items-center gap-2 text-body-sm font-medium text-ink hover:text-petrol transition-colors"
            >
              <span>{esamiExpanded ? "▾" : "▸"}</span>
              <span>{t("header.esami", { count: formazioneItems.length })}</span>
            </button>
            {esamiExpanded && (
              <div className="mt-3 space-y-1">
                {formazioneItems.map((it) => (
                  <div key={it.id} className="flex items-center justify-between gap-2 text-body-sm">
                    <span className="text-ink truncate">{it.esame}</span>
                    <span className="text-ink-secondary whitespace-nowrap">
                      {it.voto ?? "—"}
                      {it.cfu != null && <span className="text-xs text-ink-tertiary">{t("header.cfuSuffix", { cfu: it.cfu })}</span>}
                      <span className="ml-2 text-xs text-success font-medium">{t("header.examVerified")}</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {(form.livello === "magistrale" || form.formazione_precedente) && (
          <div className="border-t border-border pt-4 space-y-3">
            <p className="text-body-sm font-medium text-ink">{t("header.formazionePrecedenteTitle")}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                type="text"
                placeholder={t("header.formazionePrecedenteUniversitaPlaceholder")}
                value={form.formazione_precedente?.universita ?? ""}
                onChange={(e) => updateFP("universita", e.target.value)}
                className="px-3 py-2 rounded-md border border-border text-body-sm text-ink focus:outline-none focus:ring-1 focus:ring-petrol/30"
              />
              <input
                type="text"
                placeholder={t("header.formazionePrecedenteCorsoPlaceholder")}
                value={form.formazione_precedente?.corso ?? ""}
                onChange={(e) => updateFP("corso", e.target.value)}
                className="px-3 py-2 rounded-md border border-border text-body-sm text-ink focus:outline-none focus:ring-1 focus:ring-petrol/30"
              />
              <input
                type="text"
                placeholder={t("header.formazionePrecedenteVotoPlaceholder")}
                value={form.formazione_precedente?.voto_laurea ?? ""}
                onChange={(e) => updateFP("voto_laurea", e.target.value)}
                className="px-3 py-2 rounded-md border border-border text-body-sm text-ink focus:outline-none focus:ring-1 focus:ring-petrol/30"
              />
              <input
                type="text"
                placeholder={t("header.formazionePrecedenteTesiPlaceholder")}
                value={form.formazione_precedente?.tema_tesi ?? ""}
                onChange={(e) => updateFP("tema_tesi", e.target.value)}
                className="px-3 py-2 rounded-md border border-border text-body-sm text-ink focus:outline-none focus:ring-1 focus:ring-petrol/30"
              />
            </div>
          </div>
        )}

        {dirty && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="text-body-sm font-medium text-white bg-petrol rounded-md px-4 py-2 hover:bg-petrol-700 transition-colors disabled:opacity-50"
          >
            {saving ? c("saving") : c("save")}
          </button>
        )}

        <div className="border-t border-border pt-4 space-y-3">
          <p className="text-body-sm font-medium text-ink">{t("header.visibilitaTitle")}</p>
          <label className="flex items-center justify-between gap-4 cursor-pointer">
            <span className="text-body-sm text-ink-secondary">{t("header.visibilitaAssociazioni")}</span>
            <button
              type="button"
              role="switch"
              aria-checked={vis.media_voti.associazioni}
              onClick={() => toggleVisibility("associazioni")}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                vis.media_voti.associazioni ? "bg-petrol" : "bg-border"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  vis.media_voti.associazioni ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </label>
          <label className="flex items-center justify-between gap-4 cursor-pointer">
            <span className="text-body-sm text-ink-secondary">{t("header.visibilitaAziende")}</span>
            <button
              type="button"
              role="switch"
              aria-checked={vis.media_voti.aziende}
              onClick={() => toggleVisibility("aziende")}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                vis.media_voti.aziende ? "bg-petrol" : "bg-border"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  vis.media_voti.aziende ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </label>
        </div>
      </div>
    </div>
  );
}

/**
 * Resa di sola lettura, riusata dal Profilo (default) e dalla vista associazione/azienda —
 * unica fonte per come "appare" l'Header, per non avere due stili che divergono nel tempo.
 */
export function HeaderView({
  data,
  formazioneItems,
  /** Sul Profilo lo studente vede sempre la propria media; qui riflette il toggle di visibilità scelto. */
  showMedia = true,
}: {
  data: HeaderProseContent;
  formazioneItems: FormazioneItem[];
  showMedia?: boolean;
}) {
  const t = useTranslations("CardBlocks");
  const [esamiExpanded, setEsamiExpanded] = useState(false);
  const fp = data.formazione_precedente;

  return (
    <div className="p-4">
      <p className="text-eyebrow text-navy/60 uppercase mb-2">{t("titles.header")}</p>
      <div className="flex flex-wrap items-baseline gap-x-2">
        {data.corso && <span className="text-body font-medium text-ink">{data.corso}</span>}
        {data.universita && <span className="text-body-sm text-ink-tertiary">— {data.universita}</span>}
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-body-sm text-ink-secondary">
        {data.livello && <span>{t.has(`header.levelLabels.${data.livello}`) ? t(`header.levelLabels.${data.livello}`) : data.livello}</span>}
        {data.anno && <span>{t("header.annoOrdinal", { n: data.anno })}</span>}
        {(data.anno_inizio || data.laurea_anno) && (
          <span>{data.anno_inizio ?? "—"}–{data.laurea_anno ?? "—"}</span>
        )}
        {data.media_voti != null &&
          (showMedia ? (
            <span className="font-medium text-ink">{Number(data.media_voti).toFixed(1)}/30</span>
          ) : (
            <span className="italic text-ink-tertiary text-xs">{t("header.mediaNotShared")}</span>
          ))}
      </div>

      {fp && (fp.corso || fp.universita) && (
        <p className="mt-2 text-xs text-ink-tertiary">
          {t("header.previousDegreeSummaryPrefix")} {fp.corso ?? "—"}{fp.universita ? ` — ${fp.universita}` : ""}{fp.voto_laurea ? ` (${fp.voto_laurea})` : ""}
        </p>
      )}

      {formazioneItems.length > 0 && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setEsamiExpanded((e) => !e)}
            className="flex items-center gap-1.5 text-xs text-petrol hover:text-petrol-700 transition-colors"
          >
            <span>{esamiExpanded ? "▾" : "▸"}</span>
            <span>{t("header.esami", { count: formazioneItems.length })}</span>
          </button>
          {esamiExpanded && (
            <div className="mt-2 space-y-1">
              {formazioneItems.map((it) => (
                <div key={it.id} className="flex items-center justify-between gap-2 text-body-sm">
                  <span className="text-ink truncate">{it.esame}</span>
                  {showMedia && (
                    <span className="text-ink-secondary whitespace-nowrap">
                      {it.voto ?? "—"}
                      {it.cfu != null && <span className="text-xs text-ink-tertiary">{t("header.cfuSuffix", { cfu: it.cfu })}</span>}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
