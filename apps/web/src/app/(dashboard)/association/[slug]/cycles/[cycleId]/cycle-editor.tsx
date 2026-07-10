"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { updateCycleDetails } from "@/lib/actions/cycles";

interface Position {
  name: string;
  description?: string;
  requirements?: string;
}

interface CycleData {
  title: string;
  description: string;
  opensAt: string;
  closesAt: string;
  positions: Position[];
  generalRequirements: string;
}

const inputClass = "w-full px-3 py-2 rounded-md bg-white border border-border text-body-sm text-ink placeholder:text-ink-tertiary focus:outline-none focus:border-petrol focus:ring-1 focus:ring-petrol/20 transition-colors";

export function CycleEditor({
  cycleId,
  associationId,
  slug,
  initialData,
  isOpen,
}: {
  cycleId: string;
  associationId: string;
  slug: string;
  initialData: CycleData;
  isOpen: boolean;
}) {
  const t = useTranslations("CycleEditor");
  const c = useTranslations("Common");
  const [data, setData] = useState(initialData);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function updateField(field: keyof CycleData, value: string) {
    setData((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  }

  function updatePosition(index: number, field: keyof Position, value: string) {
    const updated = [...data.positions];
    updated[index] = { ...updated[index], [field]: value };
    setData((prev) => ({ ...prev, positions: updated }));
    setSaved(false);
  }

  function addPosition() {
    setData((prev) => ({ ...prev, positions: [...prev.positions, { name: "", description: "", requirements: "" }] }));
    setSaved(false);
  }

  function removePosition(index: number) {
    setData((prev) => ({ ...prev, positions: prev.positions.filter((_, i) => i !== index) }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    await updateCycleDetails(cycleId, associationId, slug, {
      title: data.title,
      description: data.description || null,
      opens_at: data.opensAt || null,
      closes_at: data.closesAt || null,
      available_roles: data.positions.filter((p) => p.name.trim()),
      evaluation_criteria: { general_requirements: data.generalRequirements || "" },
    });
    setSaving(false);
    setSaved(true);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-h2 text-navy">{data.title || t("fallbackTitle")}</h2>
        {isOpen && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium uppercase bg-success-bg text-success">
            {t("openBadge")}
          </span>
        )}
      </div>

      <div className="rounded-lg border border-border bg-white p-5 space-y-4">
        <label className="block">
          <span className="text-label text-navy mb-1 block text-xs">{t("titleLabel")}</span>
          <input type="text" value={data.title} onChange={(e) => updateField("title", e.target.value)} className={inputClass} />
        </label>

        <label className="block">
          <span className="text-label text-navy mb-1 block text-xs">{t("descriptionLabel")}</span>
          <textarea value={data.description} onChange={(e) => updateField("description", e.target.value)} rows={3} className={`${inputClass} resize-y`} placeholder={t("descriptionPlaceholder")} />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-label text-navy mb-1 block text-xs">{t("opensLabel")}</span>
            <input type="datetime-local" value={data.opensAt} onChange={(e) => updateField("opensAt", e.target.value)} className={inputClass} />
          </label>
          <label className="block">
            <span className="text-label text-navy mb-1 block text-xs">{t("closesLabel")}</span>
            <input type="datetime-local" value={data.closesAt} onChange={(e) => updateField("closesAt", e.target.value)} className={inputClass} />
          </label>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-white p-5 space-y-4">
        <label className="block">
          <span className="text-label text-navy mb-1 block text-xs">{t("aiCriteriaLabel")}</span>
          <p className="text-[11px] text-ink-tertiary mb-2">{t("aiCriteriaHelper")}</p>
          <textarea value={data.generalRequirements} onChange={(e) => updateField("generalRequirements", e.target.value)} rows={4} className={`${inputClass} resize-y`} placeholder={t("aiCriteriaPlaceholder")} />
        </label>
      </div>

      <div className="rounded-lg border border-border bg-white p-5 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-label text-navy text-xs">{t("positionsLabel")}</span>
          <button onClick={addPosition} className="text-body-sm text-petrol hover:text-petrol-700">{t("addPosition")}</button>
        </div>

        {data.positions.length === 0 && (
          <p className="text-body-sm text-ink-tertiary">{t("noPositions")}</p>
        )}

        {data.positions.map((pos, i) => (
          <div key={i} className="rounded-md border border-border p-3 space-y-2">
            <div className="flex gap-2">
              <input type="text" value={pos.name} onChange={(e) => updatePosition(i, "name", e.target.value)} placeholder={t("positionNamePlaceholder")} className={`${inputClass} flex-1`} />
              <button onClick={() => removePosition(i)} className="text-ink-tertiary hover:text-error px-2 text-xs">{c("remove")}</button>
            </div>
            <textarea value={pos.description || ""} onChange={(e) => updatePosition(i, "description", e.target.value)} placeholder={t("positionDescriptionPlaceholder")} rows={2} className={`${inputClass} resize-y`} />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button onClick={handleSave} disabled={saving} className="bg-navy text-white px-5 py-2.5 rounded-md text-label hover:bg-navy-700 disabled:opacity-40 transition-colors">
          {saving ? c("saving") : t("saveChanges")}
        </button>
        {saved && <span className="text-body-sm text-success">{t("saved")}</span>}
      </div>
    </div>
  );
}
