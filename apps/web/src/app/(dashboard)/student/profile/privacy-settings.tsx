"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { updatePrivacySettings } from "@/lib/actions/student-privacy";

interface Settings {
  show_grades_to_associations: boolean;
  show_grades_to_companies: boolean;
  show_phone_to_associations: boolean;
  show_phone_to_companies: boolean;
}

/** L'interruttore, uguale per tutte le voci. */
function Toggle({
  on,
  onClick,
  title,
  hint,
}: {
  on: boolean;
  onClick: () => void;
  title: string;
  hint: string;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4">
      <div>
        <p className="text-body-sm font-medium text-ink">{title}</p>
        <p className="text-body-sm text-ink-tertiary">{hint}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={onClick}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
          on ? "bg-petrol" : "bg-border"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            on ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </label>
  );
}

/**
 * Cosa vede chi: i voti e i recapiti.
 *
 * Sono due decisioni diverse e stanno in due riquadri diversi. Mescolarle
 * portava a leggere "visibile alle aziende" senza sapere se si parlava della
 * media o del numero di telefono.
 */
export function PrivacySettings({ initialSettings }: { initialSettings: Settings }) {
  const t = useTranslations("Profile");
  const [settings, setSettings] = useState(initialSettings);
  const [saving, setSaving] = useState(false);

  async function toggle(key: keyof Settings) {
    const next = { ...settings, [key]: !settings[key] };
    setSettings(next);
    setSaving(true);
    await updatePrivacySettings(next);
    setSaving(false);
  }

  return (
    <>
      <section className="space-y-4 rounded-lg border border-border bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-body font-medium text-navy">{t("gradesHeading")}</h2>
          {saving && <span className="text-body-sm text-ink-tertiary">{t("saving")}</span>}
        </div>
        <p className="text-body-sm text-ink-secondary">{t("gradesIntro")}</p>
        <div className="space-y-3">
          <Toggle
            on={settings.show_grades_to_associations}
            onClick={() => toggle("show_grades_to_associations")}
            title={t("gradesAssociations")}
            hint={t("gradesAssociationsHint")}
          />
          <Toggle
            on={settings.show_grades_to_companies}
            onClick={() => toggle("show_grades_to_companies")}
            title={t("gradesCompanies")}
            hint={t("gradesCompaniesHint")}
          />
        </div>
      </section>

      <section className="space-y-4 rounded-lg border border-border bg-white p-5">
        <h2 className="text-body font-medium text-navy">{t("contactHeading")}</h2>
        <p className="text-body-sm text-ink-secondary">{t("contactIntro")}</p>
        <div className="space-y-3">
          <Toggle
            on={settings.show_phone_to_associations}
            onClick={() => toggle("show_phone_to_associations")}
            title={t("phoneAssociations")}
            hint={t("phoneAssociationsHint")}
          />
          <div className="border-t border-border pt-3">
            <p className="text-body-sm font-medium text-ink">{t("phoneCompanies")}</p>
            <p className="text-body-sm text-ink-tertiary">{t("phoneCompaniesHint")}</p>
          </div>
        </div>
      </section>
    </>
  );
}
