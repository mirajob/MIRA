"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { updateCardBlockProseContent } from "@/lib/actions/card-blocks";
import { CardBlockHeader } from "./card-block-header";
import { UniversityCombobox } from "@/components/university-combobox";
import { EsamiEditor } from "./esami-block";
import type { CardBlockStatus, FormazioneItem, HeaderProseContent } from "@mira/types";

const LEVEL_KEYS = ["triennale", "magistrale", "ciclo_unico", "phd"] as const;

export function HeaderBlock({
  proseContent,
  status,
  formazioneItems,
  showEsami = true,
  onApproved,
}: {
  proseContent: HeaderProseContent;
  status: CardBlockStatus;
  formazioneItems: FormazioneItem[];
  /** In onboarding gli esami vivono dentro l'Header (un solo Conferma per Header+Formazione);
   * sul Profilo hanno una sezione propria e qui vanno nascosti. */
  showEsami?: boolean;
  onApproved?: () => void;
}) {
  const t = useTranslations("CardBlocks");
  const [form, setForm] = useState(proseContent);
  const [dirty, setDirty] = useState(false);
  // In onboarding proseContent arriva in modo asincrono (es. dopo il parsing del libretto):
  // se non c'è un edit locale in corso, riflette sempre l'ultimo dato dal server.
  useEffect(() => {
    if (!dirty) setForm(proseContent);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proseContent]);
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
    await updateCardBlockProseContent("header", form);
    setDirty(false);
  }

  return (
    <div className="rounded-lg border border-border bg-white overflow-hidden">
      <CardBlockHeader
        title={t("titles.header")}
        status={status}
        blockType="header"
        alsoApprove={showEsami ? ["formazione"] : undefined}
        onBeforeApprove={handleSave}
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
              <option value="">–</option>
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
        </div>

        {/* In onboarding gli esami stanno qui dentro (un blocco per volta); sul Profilo
            hanno una sezione propria, nella stessa posizione in cui compaiono sulla card. */}
        {showEsami && (
          <div className="border-t border-border pt-4">
            <EsamiEditor formazioneItems={formazioneItems} livello={form.livello} />
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
  /** Sul Profilo lo studente vede sempre la propria media; qui riflette il toggle di visibilità scelto. */
  showMedia = true,
}: {
  data: HeaderProseContent;
  showMedia?: boolean;
}) {
  const t = useTranslations("CardBlocks");
  const fp = data.formazione_precedente;

  return (
    <div className="p-4">
      <p className="text-eyebrow text-navy/60 uppercase mb-2">{t("titles.header")}</p>
      <div className="flex flex-wrap items-baseline gap-x-2">
        {data.corso && <span className="text-body font-medium text-ink">{data.corso}</span>}
        {data.universita && <span className="text-body-sm text-ink-tertiary">· {data.universita}</span>}
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-body-sm text-ink-secondary">
        {data.livello && <span>{t.has(`header.levelLabels.${data.livello}`) ? t(`header.levelLabels.${data.livello}`) : data.livello}</span>}
        {data.anno && <span>{t("header.annoOrdinal", { n: data.anno })}</span>}
        {(data.anno_inizio || data.laurea_anno) && (
          <span>{data.anno_inizio ?? "–"}–{data.laurea_anno ?? "–"}</span>
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
          {t("header.previousDegreeSummaryPrefix")} {fp.corso ?? "–"}{fp.universita ? ` · ${fp.universita}` : ""}
          {fp.voto_laurea ? ` (${fp.voto_laurea})` : ""}
          {showMedia && fp.media_voti != null ? ` · ${Number(fp.media_voti).toFixed(1)}/30` : ""}
        </p>
      )}
    </div>
  );
}
