"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { updateCardBlockProseContent } from "@/lib/actions/card-blocks";
import { CardBlockHeader } from "./card-block-header";
import { getCompetenzaCategoria } from "@mira/types";
import type { CardBlockStatus, CompetenzaItem, CompetenzeProseContent, HardSkillLivello } from "@mira/types";

const LIVELLO_KEYS: HardSkillLivello[] = ["beginner", "intermediate", "advanced"];

function newItem(categoria: "hard" | "academic"): CompetenzaItem {
  return {
    id: crypto.randomUUID(),
    testo: "",
    categoria,
    livello: categoria === "hard" ? "intermediate" : null,
    evidenza_ref: null,
    verified: false,
    origin: "manual",
  };
}

export function CompetenzeBlock({
  data,
  status,
  onApproved,
}: {
  data: CompetenzeProseContent;
  status: CardBlockStatus;
  onApproved?: () => void;
}) {
  const t = useTranslations("CardBlocks");
  const c = useTranslations("Common");
  const [softText, setSoftText] = useState(data.soft_skills_testo ?? "");
  const [hardItems, setHardItems] = useState<CompetenzaItem[]>(data.items.filter((it) => getCompetenzaCategoria(it) === "hard"));
  const [academicItems, setAcademicItems] = useState<CompetenzaItem[]>(data.items.filter((it) => getCompetenzaCategoria(it) === "academic"));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (dirty) return;
    setSoftText(data.soft_skills_testo ?? "");
    setHardItems(data.items.filter((it) => getCompetenzaCategoria(it) === "hard"));
    setAcademicItems(data.items.filter((it) => getCompetenzaCategoria(it) === "academic"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  function updateHard(index: number, key: keyof CompetenzaItem, value: unknown) {
    setHardItems((prev) => prev.map((it, i) => (i === index ? { ...it, [key]: value } : it)));
    setDirty(true);
  }
  function updateAcademic(index: number, key: keyof CompetenzaItem, value: unknown) {
    setAcademicItems((prev) => prev.map((it, i) => (i === index ? { ...it, [key]: value } : it)));
    setDirty(true);
  }

  async function handleSave() {
    setSaving(true);
    const items = [...hardItems, ...academicItems];
    await updateCardBlockProseContent("competenze", { items, soft_skills_testo: softText.trim() || null });
    setSaving(false);
    setDirty(false);
  }

  const fieldClass = "w-full px-3 py-2 rounded-md border border-border text-body-sm text-ink focus:outline-none focus:ring-1 focus:ring-petrol/30";

  return (
    <div className="rounded-lg border border-border bg-white overflow-hidden">
      <CardBlockHeader title={t("titles.competenze")} status={status} blockType="competenze" onApproved={onApproved} />
      <div className="p-5 space-y-6">
        <div>
          <p className="text-eyebrow text-navy/60 uppercase mb-2">{t("competenze.softHeading")}</p>
          <textarea
            value={softText}
            placeholder={t("competenze.softPlaceholder")}
            onChange={(e) => { setSoftText(e.target.value); setDirty(true); }}
            rows={3}
            className={fieldClass}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-eyebrow text-navy/60 uppercase">{t("competenze.hardHeading")}</p>
            <button
              type="button"
              onClick={() => { setHardItems((p) => [...p, newItem("hard")]); setDirty(true); }}
              className="text-body-sm text-petrol underline underline-offset-2 decoration-1 hover:text-petrol-700"
            >
              {t("addItem")}
            </button>
          </div>
          {hardItems.length === 0 && <p className="text-body-sm text-ink-tertiary">{t("competenze.hardEmpty")}</p>}
          <div className="space-y-3">
            {hardItems.map((item, index) => (
              <div key={item.id} className="rounded-md border border-border p-3 space-y-2">
                <div className="flex justify-end">
                  <button
                    onClick={() => { setHardItems((p) => p.filter((_, i) => i !== index)); setDirty(true); }}
                    className="text-xs text-ink-tertiary hover:text-error transition-colors"
                  >
                    {t("remove")}
                  </button>
                </div>
                <textarea
                  value={item.testo}
                  placeholder={t("competenze.testoPlaceholder")}
                  onChange={(e) => updateHard(index, "testo", e.target.value)}
                  rows={1}
                  className={fieldClass}
                />
                <div className="grid gap-2 sm:grid-cols-2">
                  <select
                    value={item.livello ?? "intermediate"}
                    onChange={(e) => updateHard(index, "livello", e.target.value)}
                    className={fieldClass}
                  >
                    {LIVELLO_KEYS.map((lvl) => (
                      <option key={lvl} value={lvl}>{t(`competenze.livelloLabels.${lvl}`)}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={item.evidenza_ref ?? ""}
                    placeholder={t("competenze.evidenzaPlaceholder")}
                    onChange={(e) => updateHard(index, "evidenza_ref", e.target.value)}
                    className={fieldClass}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-eyebrow text-navy/60 uppercase">{t("competenze.academicHeading")}</p>
            <button
              type="button"
              onClick={() => { setAcademicItems((p) => [...p, newItem("academic")]); setDirty(true); }}
              className="text-body-sm text-petrol underline underline-offset-2 decoration-1 hover:text-petrol-700"
            >
              {t("addItem")}
            </button>
          </div>
          {academicItems.length === 0 && <p className="text-body-sm text-ink-tertiary">{t("competenze.academicEmpty")}</p>}
          <div className="space-y-3">
            {academicItems.map((item, index) => (
              <div key={item.id} className="rounded-md border border-border p-3 space-y-2">
                <div className="flex justify-end">
                  <button
                    onClick={() => { setAcademicItems((p) => p.filter((_, i) => i !== index)); setDirty(true); }}
                    className="text-xs text-ink-tertiary hover:text-error transition-colors"
                  >
                    {t("remove")}
                  </button>
                </div>
                <textarea
                  value={item.testo}
                  placeholder={t("competenze.testoPlaceholder")}
                  onChange={(e) => updateAcademic(index, "testo", e.target.value)}
                  rows={1}
                  className={fieldClass}
                />
                <input
                  type="text"
                  value={item.evidenza_ref ?? ""}
                  placeholder={t("competenze.evidenzaPlaceholder")}
                  onChange={(e) => updateAcademic(index, "evidenza_ref", e.target.value)}
                  className={fieldClass}
                />
              </div>
            ))}
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

function CompetenzaRow({ it, showLivello }: { it: CompetenzaItem; showLivello?: boolean }) {
  const t = useTranslations("CardBlocks");
  return (
    <div className="text-body-sm text-ink flex items-center gap-2 flex-wrap">
      <span>{it.testo}</span>
      {showLivello && it.livello && (
        <span className="text-xs px-1.5 py-0.5 rounded bg-petrol-50 text-petrol-700">
          {t(`competenze.livelloLabels.${it.livello}`)}
        </span>
      )}
      {it.evidenza_ref && <span className="text-xs text-ink-tertiary">· {it.evidenza_ref}</span>}
    </div>
  );
}

/**
 * Resa di sola lettura, riusata dal Profilo (default) e dalla vista associazione/azienda.
 * Tre gruppi separati (non un elenco piatto): Soft skill come paragrafo in prima persona
 * (mai a tag/etichette — vedi decisione prodotto), Hard skill sempre visibili con il livello,
 * Academic skill raggruppate e collassate di default (da sole occupano troppo spazio per il
 * loro peso, come gli esami nell'Header).
 */
function CollapsibleGroup({ label, bordered, children }: { label: string; bordered: boolean; children: React.ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className={bordered ? "mt-3 pt-3 border-t border-border" : ""}>
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex items-center gap-1.5 text-xs text-petrol hover:text-petrol-700 transition-colors"
      >
        <span>{expanded ? "▾" : "▸"}</span>
        <span>{label}</span>
      </button>
      {expanded && <div className="mt-2 space-y-1.5">{children}</div>}
    </div>
  );
}

export function CompetenzeView({ data }: { data: CompetenzeProseContent }) {
  const t = useTranslations("CardBlocks");
  const hardItems = data.items.filter((it) => getCompetenzaCategoria(it) === "hard");
  const academicItems = data.items.filter((it) => getCompetenzaCategoria(it) === "academic");
  const hasSoft = !!data.soft_skills_testo;
  const isEmpty = !hasSoft && hardItems.length === 0 && academicItems.length === 0;

  return (
    <div className="p-5">
      <p className="text-eyebrow text-navy/60 uppercase mb-2">{t("titles.competenze")}</p>
      {isEmpty && <p className="text-body-sm text-ink-tertiary italic">{t("competenze.emptyView")}</p>}

      {hasSoft && (
        <CollapsibleGroup label={t("competenze.softHeading")} bordered={false}>
          <p className="text-body-sm text-ink">{data.soft_skills_testo}</p>
        </CollapsibleGroup>
      )}

      {hardItems.length > 0 && (
        <CollapsibleGroup label={t("competenze.hardSkillsCount", { count: hardItems.length })} bordered={hasSoft}>
          {hardItems.map((it) => <CompetenzaRow key={it.id} it={it} showLivello />)}
        </CollapsibleGroup>
      )}

      {academicItems.length > 0 && (
        <CollapsibleGroup label={t("competenze.academicSkills", { count: academicItems.length })} bordered={hasSoft || hardItems.length > 0}>
          {academicItems.map((it) => <CompetenzaRow key={it.id} it={it} />)}
        </CollapsibleGroup>
      )}
    </div>
  );
}
