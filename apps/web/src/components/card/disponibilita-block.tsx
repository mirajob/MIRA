"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { updateCardBlockProseContent } from "@/lib/actions/card-blocks";
import { CardBlockHeader } from "./card-block-header";
import type { CardBlockStatus, DisponibilitaProseContent } from "@mira/types";

export function DisponibilitaBlock({
  proseContent,
  status,
  onApproved,
}: {
  proseContent: DisponibilitaProseContent;
  status: CardBlockStatus;
  onApproved?: () => void;
}) {
  const t = useTranslations("CardBlocks");
  const c = useTranslations("Common");
  const [form, setForm] = useState(proseContent);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!dirty) setForm(proseContent);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proseContent]);

  function update<K extends keyof DisponibilitaProseContent>(key: K, value: DisponibilitaProseContent[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setDirty(true);
  }

  async function handleSave() {
    setSaving(true);
    await updateCardBlockProseContent("disponibilita", form);
    setSaving(false);
    setDirty(false);
  }

  const fields: Array<{ key: keyof DisponibilitaProseContent; label: string; placeholder: string }> = [
    { key: "cosa_cerca", label: t("disponibilita.cosaCercaLabel"), placeholder: t("disponibilita.cosaCercaPlaceholder") },
    { key: "ambito", label: t("disponibilita.ambitoLabel"), placeholder: t("disponibilita.ambitoPlaceholder") },
    { key: "periodo", label: t("disponibilita.periodoLabel"), placeholder: t("disponibilita.periodoPlaceholder") },
    { key: "dove", label: t("disponibilita.doveLabel"), placeholder: t("disponibilita.dovePlaceholder") },
  ];

  return (
    <div className="rounded-lg border border-border bg-white overflow-hidden">
      <CardBlockHeader title={t("titles.disponibilita")} status={status} blockType="disponibilita" onApproved={onApproved} />
      <div className="p-5 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {fields.map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="text-ink-tertiary text-body-sm">{label}</label>
              <input
                type="text"
                value={form[key] ?? ""}
                placeholder={placeholder}
                onChange={(e) => update(key, e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-md border border-border text-body-sm text-ink focus:outline-none focus:ring-1 focus:ring-petrol/30"
              />
            </div>
          ))}
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

/** Resa di sola lettura, riusata dal Profilo (default) e dalla vista associazione/azienda. */
export function DisponibilitaView({ data }: { data: DisponibilitaProseContent }) {
  const t = useTranslations("CardBlocks");
  const pills = [data.cosa_cerca, data.ambito, data.periodo, data.dove].filter(Boolean) as string[];
  return (
    <div className="p-4">
      <p className="text-eyebrow text-navy/60 uppercase mb-2">{t("titles.disponibilita")}</p>
      {pills.length > 0 ? (
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
  );
}
