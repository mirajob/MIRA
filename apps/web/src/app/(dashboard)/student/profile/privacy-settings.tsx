"use client";

import { useState } from "react";
import { updatePrivacySettings } from "@/lib/actions/student-privacy";

interface Props {
  initialSettings: {
    show_grades_to_associations: boolean;
    show_grades_to_companies: boolean;
  };
}

export function PrivacySettings({ initialSettings }: Props) {
  const [settings, setSettings] = useState(initialSettings);
  const [saving, setSaving] = useState(false);

  async function toggle(key: keyof typeof settings) {
    const next = { ...settings, [key]: !settings[key] };
    setSettings(next);
    setSaving(true);
    await updatePrivacySettings(next);
    setSaving(false);
  }

  return (
    <div className="rounded-lg border border-border bg-white p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-sans text-h3 text-navy">Visibilità voti</h2>
        {saving && <span className="text-xs text-ink-tertiary">Salvataggio...</span>}
      </div>
      <p className="text-body-sm text-ink-secondary">
        Media ponderata e voti degli esami sono nascosti per default. Attivali se vuoi che siano visibili nei tuoi profili.
      </p>
      <div className="space-y-3">
        <label className="flex items-center justify-between gap-4 cursor-pointer">
          <div>
            <p className="text-body-sm font-medium text-ink">Associazioni universitarie</p>
            <p className="text-xs text-ink-tertiary">Media e voti visibili quando ti candidano a un&apos;associazione su MIRA</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.show_grades_to_associations}
            onClick={() => toggle("show_grades_to_associations")}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
              settings.show_grades_to_associations ? "bg-petrol" : "bg-border"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                settings.show_grades_to_associations ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </label>

        <label className="flex items-center justify-between gap-4 cursor-pointer">
          <div>
            <p className="text-body-sm font-medium text-ink">Aziende</p>
            <p className="text-xs text-ink-tertiary">Media e voti visibili ai recruiter aziendali (funzionalità in arrivo)</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.show_grades_to_companies}
            onClick={() => toggle("show_grades_to_companies")}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
              settings.show_grades_to_companies ? "bg-petrol" : "bg-border"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                settings.show_grades_to_companies ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </label>
      </div>
    </div>
  );
}
