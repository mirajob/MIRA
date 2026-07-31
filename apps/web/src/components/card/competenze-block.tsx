"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { updateCardBlockProseContent } from "@/lib/actions/card-blocks";
import { CardBlockHeader } from "./card-block-header";
import { isLegacyAcademic } from "@mira/types";
import type { CardBlockStatus, CompetenzaItem, CompetenzeProseContent, HardSkillLivello } from "@mira/types";

const LIVELLO_KEYS: HardSkillLivello[] = ["beginner", "intermediate", "advanced"];

/**
 * Competenze = solo hard skill (rework 2026-07-31): strumenti, software, metodi che lo
 * studente sa usare davvero. Le "competenze accademiche" generate dai voti sono state
 * cancellate: cosa ha studiato lo dice l'elenco esami del libretto, che è verificato e
 * uguale per tutti. `isLegacyAcademic` filtra le righe eventualmente sfuggite alla migrazione.
 */
function newItem(): CompetenzaItem {
  return {
    id: crypto.randomUUID(),
    testo: "",
    livello: "intermediate",
    evidenza_ref: null,
    verified: false,
    origin: "manual",
  };
}

function hardOnly(items: CompetenzaItem[]): CompetenzaItem[] {
  return items.filter((it) => !isLegacyAcademic(it));
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
  const [items, setItems] = useState<CompetenzaItem[]>(hardOnly(data.items));
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (dirty) return;
    setItems(hardOnly(data.items));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  function update(index: number, key: keyof CompetenzaItem, value: unknown) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, [key]: value } : it)));
    setDirty(true);
  }

  async function handleSave() {
    await updateCardBlockProseContent("competenze", { items });
    setDirty(false);
  }

  const fieldClass = "w-full px-3 py-2 rounded-md border border-border text-body-sm text-ink focus:outline-none focus:ring-1 focus:ring-petrol/30";

  return (
    <div className="rounded-lg border border-border bg-white overflow-hidden">
      <CardBlockHeader title={t("titles.competenze")} status={status} blockType="competenze" onBeforeApprove={handleSave} onApproved={onApproved} />
      <div className="p-5 space-y-4">
        <p className="text-body-sm text-ink-secondary">{t("competenze.intro")}</p>

        <div className="flex items-center justify-between">
          <p className="text-eyebrow text-navy/60 uppercase">{t("competenze.hardHeading")}</p>
          <button
            type="button"
            onClick={() => { setItems((p) => [...p, newItem()]); setDirty(true); }}
            className="text-body-sm text-petrol underline underline-offset-2 decoration-1 hover:text-petrol-700"
          >
            {t("addItem")}
          </button>
        </div>

        {items.length === 0 && <p className="text-body-sm text-ink-tertiary">{t("competenze.hardEmpty")}</p>}

        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={item.id} className="rounded-md border border-border p-3 space-y-2">
              <div className="flex justify-end">
                <button
                  onClick={() => { setItems((p) => p.filter((_, i) => i !== index)); setDirty(true); }}
                  className="text-xs text-ink-tertiary hover:text-error transition-colors"
                >
                  {t("remove")}
                </button>
              </div>
              <textarea
                value={item.testo}
                placeholder={t("competenze.testoPlaceholder")}
                maxLength={80}
                onChange={(e) => update(index, "testo", e.target.value)}
                rows={1}
                className={fieldClass}
              />
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="block space-y-1">
                  <span className="text-eyebrow text-ink-tertiary uppercase">{t("competenze.livelloLabel")}</span>
                  <select
                    value={item.livello ?? "intermediate"}
                    onChange={(e) => update(index, "livello", e.target.value)}
                    className={fieldClass}
                  >
                    {LIVELLO_KEYS.map((lvl) => (
                      <option key={lvl} value={lvl}>{t(`competenze.livelloLabels.${lvl}`)}</option>
                    ))}
                  </select>
                </label>
                <label className="block space-y-1">
                  <span className="text-eyebrow text-ink-tertiary uppercase">{t("competenze.evidenzaLabel")}</span>
                  <input
                    type="text"
                    value={item.evidenza_ref ?? ""}
                    placeholder={t("competenze.evidenzaPlaceholderHard")}
                    onChange={(e) => update(index, "evidenza_ref", e.target.value)}
                    className={fieldClass}
                  />
                </label>
              </div>
              <p className="text-[11px] leading-snug text-ink-tertiary">{t("competenze.evidenzaHintHard")}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Resa di sola lettura, riusata dal Profilo e dalla vista associazione/azienda. */
export function CompetenzeView({ data }: { data: CompetenzeProseContent }) {
  const t = useTranslations("CardBlocks");
  const [expanded, setExpanded] = useState(false);
  const items = hardOnly(data.items);

  return (
    <div className="p-4">
      <p className="text-eyebrow text-navy/60 uppercase mb-2">{t("titles.competenze")}</p>
      {items.length === 0 ? (
        <p className="text-body-sm text-ink-tertiary italic">{t("competenze.emptyView")}</p>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="flex items-center gap-1.5 text-xs text-petrol hover:text-petrol-700 transition-colors"
          >
            <span>{expanded ? "▾" : "▸"}</span>
            <span>{t("competenze.hardSkillsCount", { count: items.length })}</span>
          </button>
          {expanded && (
            <div className="mt-2 space-y-1.5">
              {items.map((it) => (
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
          )}
        </>
      )}
    </div>
  );
}
