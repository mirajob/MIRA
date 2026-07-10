"use client";

import { useState } from "react";
import { createBrowserClient } from "@mira/supabase/client";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

/* eslint-disable @typescript-eslint/no-explicit-any */

const SECTORS = [
  "Consulting", "Finance & Banking", "Tech & Software", "Fintech",
  "Luxury & Fashion", "Marketing & Comunicazione", "Legal",
  "Private Equity & VC", "Real Estate", "Healthcare",
  "Energy & Sustainability", "Media & Entertainment", "Startup", "Altro",
];

export function CompanyProfileClient({ slug, company }: { slug: string; company: any }) {
  const t = useTranslations("CompanyProfile");
  const sectorT = useTranslations("AziendePage");
  const c = useTranslations("Common");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    display_name: company.display_name ?? company.legal_name ?? "",
    sector: company.sector ?? "",
    website_url: company.website_url ?? "",
    description: company.description ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSave() {
    setSaving(true);
    setError(null);
    const supabase = createBrowserClient();
    const { error: err } = await supabase
      .from("company_profiles")
      .update(draft)
      .eq("id", company.id);
    if (err) { setError(err.message); setSaving(false); return; }
    setEditing(false);
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-h1 text-navy">{t("heading")}</h1>
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-md border border-border text-body-sm text-ink hover:border-border-strong hover:text-navy transition-colors duration-100"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            {t("edit")}
          </button>
        ) : (
          <div className="flex gap-3">
            <button onClick={() => { setEditing(false); setDraft({ display_name: company.display_name ?? company.legal_name, sector: company.sector ?? "", website_url: company.website_url ?? "", description: company.description ?? "" }); }}
              className="px-4 py-2 rounded-md border border-border text-body-sm text-ink hover:border-border-strong transition-colors duration-100">
              {c("cancel")}
            </button>
            <button onClick={handleSave} disabled={saving}
              className="px-4 py-2 rounded-md bg-navy text-white text-body-sm hover:bg-navy-700 transition-colors duration-100 disabled:opacity-40">
              {saving ? c("saving") : c("save")}
            </button>
          </div>
        )}
      </div>

      {error && <div className="rounded-md bg-error-bg p-3 text-body-sm text-error mb-4">{error}</div>}

      <div className="rounded-lg border border-border bg-white p-6 space-y-6">
        {/* Legal name (read-only) */}
        <div>
          <p className="text-label text-ink-secondary mb-1">{t("legalNameLabel")}</p>
          <p className="text-body text-ink">{company.legal_name}</p>
          <p className="text-body-sm text-ink-tertiary mt-0.5">{t("notEditable")}</p>
        </div>

        {/* Display name */}
        <div>
          <p className="text-label text-ink-secondary mb-2">{t("displayNameLabel")}</p>
          {editing ? (
            <input type="text" value={draft.display_name} onChange={(e) => setDraft((p) => ({ ...p, display_name: e.target.value }))}
              className="w-full px-4 py-3 rounded-md border border-border text-body text-ink focus:outline-none focus:border-petrol focus:ring-2 focus:ring-petrol/20" />
          ) : (
            <p className="text-body text-ink">{company.display_name ?? company.legal_name}</p>
          )}
        </div>

        {/* Sector */}
        <div>
          <p className="text-label text-ink-secondary mb-2">{t("sectorLabel")}</p>
          {editing ? (
            <select value={draft.sector} onChange={(e) => setDraft((p) => ({ ...p, sector: e.target.value }))}
              className="w-full px-4 py-3 rounded-md border border-border text-body text-ink focus:outline-none focus:border-petrol focus:ring-2 focus:ring-petrol/20">
              <option value="">{t("sectorPlaceholder")}</option>
              {SECTORS.map((s) => (
                <option key={s} value={s}>
                  {sectorT.has(`sectorOverrides.${s}`) ? sectorT(`sectorOverrides.${s}`) : s}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-body text-ink">{company.sector ?? <span className="text-ink-tertiary italic">{t("notSpecified")}</span>}</p>
          )}
        </div>

        {/* Website */}
        <div>
          <p className="text-label text-ink-secondary mb-2">{t("websiteLabel")}</p>
          {editing ? (
            <input type="url" value={draft.website_url} onChange={(e) => setDraft((p) => ({ ...p, website_url: e.target.value }))}
              placeholder={t("websitePlaceholder")}
              className="w-full px-4 py-3 rounded-md border border-border text-body text-ink placeholder:text-ink-tertiary focus:outline-none focus:border-petrol focus:ring-2 focus:ring-petrol/20" />
          ) : company.website_url ? (
            <a href={company.website_url} target="_blank" rel="noopener noreferrer" className="text-body text-petrol underline underline-offset-2 decoration-1">
              {company.website_url}
            </a>
          ) : (
            <p className="text-body text-ink-tertiary italic">{t("notSpecified")}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <p className="text-label text-ink-secondary mb-2">{t("descriptionLabel")}</p>
          {editing ? (
            <textarea rows={4} value={draft.description} onChange={(e) => setDraft((p) => ({ ...p, description: e.target.value }))}
              placeholder={t("descriptionPlaceholder")}
              className="w-full px-4 py-3 rounded-md border border-border text-body text-ink placeholder:text-ink-tertiary focus:outline-none focus:border-petrol focus:ring-2 focus:ring-petrol/20 resize-none" />
          ) : (
            <p className="text-body text-ink whitespace-pre-wrap">{company.description ?? <span className="text-ink-tertiary italic">{t("noDescription")}</span>}</p>
          )}
        </div>

        {/* Status */}
        <div>
          <p className="text-label text-ink-secondary mb-1">{t("statusLabel")}</p>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-body-sm font-medium bg-emerald-100 text-emerald-700">
            {t("statusActive")}
          </span>
        </div>
      </div>
    </div>
  );
}
