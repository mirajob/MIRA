"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { UniversityCombobox } from "@/components/university-combobox";
import { updateProfileDetails } from "@/lib/actions/profile-details";

const inputClass =
  "w-full rounded-md border border-border px-3 py-1.5 text-body-sm text-ink focus:border-petrol focus:outline-none";

/**
 * Nome, università e telefono si correggono da qui.
 *
 * L'università si sceglie dall'elenco e non si scrive a mano: è il campo su cui
 * si appoggia tutto il resto (quali associazioni vedi, chi può vederti), e tre
 * grafie diverse dello stesso ateneo lo romperebbero in silenzio.
 */
export function AccountDetails({
  initial,
  email,
}: {
  initial: { fullName: string; university: string; phone: string };
  email: string;
}) {
  const t = useTranslations("Profile");
  const [form, setForm] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    const result = await updateProfileDetails(form);
    if (result.error) setError(result.error);
    else setEditing(false);
    setSaving(false);
  }

  const rows: Array<[string, string]> = [
    [t("fieldName"), form.fullName || "–"],
    [t("fieldEmail"), email],
    [t("fieldUniversity"), form.university || "–"],
    [t("fieldPhone"), form.phone || t("phoneEmpty")],
  ];

  return (
    <section className="rounded-lg border border-border bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-body font-medium text-navy">{t("accountHeading")}</h2>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-body-sm text-petrol hover:underline"
          >
            {t("edit")}
          </button>
        )}
      </div>

      {editing ? (
        <div className="mt-3 space-y-3">
          <label className="block">
            <span className="mb-1 block text-body-sm text-ink-tertiary">{t("fieldName")}</span>
            <input
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              className={inputClass}
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-body-sm text-ink-tertiary">{t("fieldUniversity")}</span>
            <UniversityCombobox
              value={form.university}
              onChange={(name) => setForm({ ...form, university: name })}
              inputClassName={inputClass}
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-body-sm text-ink-tertiary">{t("fieldPhone")}</span>
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder={t("phonePlaceholder")}
              className={inputClass}
            />
            <span className="mt-1 block text-body-sm text-ink-tertiary">{t("phoneHint")}</span>
          </label>

          <div>
            <span className="mb-1 block text-body-sm text-ink-tertiary">{t("fieldEmail")}</span>
            <p className="text-body-sm text-ink">{email}</p>
            <p className="mt-1 text-body-sm text-ink-tertiary">{t("emailLocked")}</p>
          </div>

          {error && <p className="text-body-sm text-error">{error}</p>}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="rounded-md bg-navy px-4 py-1.5 text-body-sm text-white transition-colors duration-100 hover:bg-navy-700 disabled:opacity-40"
            >
              {saving ? t("saving") : t("save")}
            </button>
            <button
              type="button"
              onClick={() => {
                setForm(initial);
                setEditing(false);
                setError(null);
              }}
              className="text-body-sm text-ink-secondary hover:text-navy"
            >
              {t("cancel")}
            </button>
          </div>
        </div>
      ) : (
        <dl className="mt-3 divide-y divide-border">
          {rows.map(([label, value]) => (
            <div key={label} className="grid gap-1 py-2.5 sm:grid-cols-[160px_1fr] sm:gap-4">
              <dt className="text-body-sm text-ink-tertiary">{label}</dt>
              <dd className="text-body-sm text-ink">{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
