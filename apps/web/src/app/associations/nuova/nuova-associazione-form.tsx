"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { attachAssociationToCurrentUser } from "@/lib/actions/association-register";
import { ASSOCIATION_CATEGORIES } from "@mira/domain";

export function NuovaAssociazioneForm() {
  const t = useTranslations("CandidatiPage");
  const p = useTranslations("AssociaEsistentePage");
  const [associationName, setAssociationName] = useState("");
  const [category, setCategory] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const normalizedUrl = websiteUrl
      ? websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`
      : "";

    const result = await attachAssociationToCurrentUser({
      associationName,
      category,
      websiteUrl: normalizedUrl,
      description,
    });

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.push("/associations/in-attesa");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-md bg-error-bg p-3 text-body-sm text-error">{error}</div>
      )}

      <label className="block">
        <span className="text-label text-navy mb-2 block">{t("associationNameLabel")}</span>
        <input
          type="text"
          required
          value={associationName}
          onChange={(e) => setAssociationName(e.target.value)}
          placeholder={t("associationNamePlaceholder")}
          className="w-full px-4 py-3 rounded-md bg-white border border-border text-body text-ink placeholder:text-ink-tertiary hover:border-border-strong focus:outline-none focus:border-petrol focus:ring-2 focus:ring-petrol/20 transition-colors duration-200"
        />
      </label>

      <label className="block">
        <span className="text-label text-navy mb-2 block">{t("categoryLabel")}</span>
        <select
          required
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full px-4 py-3 rounded-md bg-white border border-border text-body text-ink hover:border-border-strong focus:outline-none focus:border-petrol focus:ring-2 focus:ring-petrol/20 transition-colors duration-200"
        >
          <option value="">{t("categoryPlaceholder")}</option>
          {ASSOCIATION_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat.charAt(0).toUpperCase() + cat.slice(1).replace("_", " ")}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-label text-navy mb-2 block">{t("websiteLabel")}</span>
        <input
          type="text"
          value={websiteUrl}
          onChange={(e) => setWebsiteUrl(e.target.value)}
          placeholder={t("websitePlaceholder")}
          className="w-full px-4 py-3 rounded-md bg-white border border-border text-body text-ink placeholder:text-ink-tertiary hover:border-border-strong focus:outline-none focus:border-petrol focus:ring-2 focus:ring-petrol/20 transition-colors duration-200"
        />
      </label>

      <label className="block">
        <span className="text-label text-navy mb-2 block">{t("descriptionLabel")}</span>
        <textarea
          rows={3}
          maxLength={280}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("descriptionPlaceholder")}
          className="w-full px-4 py-3 rounded-md bg-white border border-border text-body text-ink placeholder:text-ink-tertiary hover:border-border-strong focus:outline-none focus:border-petrol focus:ring-2 focus:ring-petrol/20 transition-colors duration-200 resize-none"
        />
      </label>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-navy text-white px-6 py-3 rounded-md text-label hover:bg-navy-700 active:scale-[0.98] transition-colors duration-100 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {loading ? t("submitLoading") : t("submit")}
      </button>

      <p className="text-center text-body-sm text-ink-tertiary">{p("differentAccountNote")}</p>
    </form>
  );
}
