"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { createBrowserClient } from "@mira/supabase/client";
import { registerAssociationPresident } from "@/lib/actions/association-register";
import { ASSOCIATION_CATEGORIES, validatePassword } from "@mira/domain";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { PasswordInput } from "@/components/password-input";
import { UniversityCombobox } from "@/components/university-combobox";

const DEGREE_LEVEL_VALUES = ["triennale", "magistrale", "ciclo_unico"] as const;

export default function CandidatiAssociazionePage() {
  const t = useTranslations("CandidatiPage");
  const c = useTranslations("Common");
  const s = useTranslations("SignupPage");
  const v = useTranslations("Validation");
  const [associationName, setAssociationName] = useState("");
  const [category, setCategory] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [description, setDescription] = useState("");
  const [presidentName, setPresidentName] = useState("");
  const [email, setEmail] = useState("");
  const [university, setUniversity] = useState("");
  const [degreeLevel, setDegreeLevel] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      setError(v(`password.${passwordValidation.errorCode}`));
      return;
    }

    setLoading(true);

    const normalizedUrl = websiteUrl
      ? websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`
      : "";

    const result = await registerAssociationPresident({
      associationName,
      category,
      websiteUrl: normalizedUrl,
      description,
      presidentName,
      email,
      password,
      university,
      degreeLevel,
    });

    if (result.error) {
      setError(result.error + t("retrySameEmail"));
      setLoading(false);
      return;
    }

    // L'account è già confermato lato server (registerAssociationPresident usa l'admin
    // API): basta autenticarsi con le stesse credenziali per ottenere una sessione.
    const supabase = createBrowserClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      // L'account e l'associazione esistono comunque: manda l'utente al login invece di
      // bloccarlo su un errore, così può accedere subito con le credenziali appena scelte.
      router.push("/login");
      return;
    }

    router.push("/associations/in-attesa");
  }

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <header className="px-6 py-4 border-b border-border bg-white flex items-center justify-between">
        <Link href="/">
          <img src="/brand/mira-lockup.svg" alt="MIRA" className="h-5" />
        </Link>
        <LocaleSwitcher />
      </header>

      <div className="flex-1 flex items-start justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <p className="text-eyebrow text-petrol uppercase tracking-wider mb-3">{t("eyebrow")}</p>
          <h1 className="font-display text-h1 text-navy mb-2">{t("heading")}</h1>
          <p className="text-body text-ink-secondary mb-6">
            {t("intro")}
          </p>

          <div className="rounded-md border border-petrol/30 bg-petrol-50 px-4 py-3 mb-8 text-body-sm text-ink-secondary">
            {t.rich("existingAccountBanner", {
              link: (chunks) => (
                <Link href={`/login?redirect=${encodeURIComponent("/associations/nuova")}`} className="text-petrol font-medium underline underline-offset-2 decoration-1 hover:text-petrol-700">
                  {chunks}
                </Link>
              ),
            })}
          </div>

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

            <div className="border-t border-border pt-5">
              <p className="text-label text-ink-secondary mb-1">{t("credentialsSectionLabel")}</p>
              <p className="text-body-sm text-ink-tertiary mb-4">{t("credentialsSectionIntro")}</p>

              <div className="space-y-4">
                <label className="block">
                  <span className="text-label text-navy mb-2 block">{t("fullNameLabel")}</span>
                  <input
                    type="text"
                    required
                    value={presidentName}
                    onChange={(e) => setPresidentName(e.target.value)}
                    className="w-full px-4 py-3 rounded-md bg-white border border-border text-body text-ink placeholder:text-ink-tertiary hover:border-border-strong focus:outline-none focus:border-petrol focus:ring-2 focus:ring-petrol/20 transition-colors duration-200"
                  />
                </label>

                <label className="block">
                  <span className="text-label text-navy mb-2 block">{t("emailLabel")}</span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={c("studentEmailPlaceholder")}
                    className="w-full px-4 py-3 rounded-md bg-white border border-border text-body text-ink placeholder:text-ink-tertiary hover:border-border-strong focus:outline-none focus:border-petrol focus:ring-2 focus:ring-petrol/20 transition-colors duration-200"
                  />
                </label>

                <label className="block">
                  <span className="text-label text-navy mb-2 block">{s("universityLabel")}</span>
                  <UniversityCombobox
                    value={university}
                    onChange={setUniversity}
                    inputClassName="w-full px-4 py-3 rounded-md bg-white border border-border text-body text-ink placeholder:text-ink-tertiary hover:border-border-strong focus:outline-none focus:border-petrol focus:ring-2 focus:ring-petrol/20 transition-colors duration-200"
                  />
                </label>

                <label className="block">
                  <span className="text-label text-navy mb-2 block">{s("degreeLevelLabel")}</span>
                  <select
                    required
                    value={degreeLevel}
                    onChange={(e) => setDegreeLevel(e.target.value)}
                    className="w-full px-4 py-3 rounded-md bg-white border border-border text-body text-ink hover:border-border-strong focus:outline-none focus:border-petrol focus:ring-2 focus:ring-petrol/20 transition-colors duration-200"
                  >
                    <option value="">{s("degreeLevelPlaceholder")}</option>
                    {DEGREE_LEVEL_VALUES.map((value) => (
                      <option key={value} value={value}>{s(`degreeLevels.${value}`)}</option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-label text-navy mb-2 block">{t("passwordLabel")}</span>
                  <PasswordInput value={password} onChange={setPassword} required minLength={8} autoComplete="new-password" />
                  <p className="mt-1 text-body-sm text-ink-tertiary">{t("passwordHelper")}</p>
                </label>
              </div>
            </div>

            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                required
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-border text-petrol focus:ring-petrol"
              />
              <span className="text-body-sm text-ink-secondary">
                {s.rich("termsConsent", {
                  privacyLink: (chunks) => (
                    <Link href="/privacy" target="_blank" className="text-petrol underline underline-offset-2 decoration-1 hover:text-petrol-700">
                      {chunks}
                    </Link>
                  ),
                  termsLink: (chunks) => (
                    <Link href="/termini" target="_blank" className="text-petrol underline underline-offset-2 decoration-1 hover:text-petrol-700">
                      {chunks}
                    </Link>
                  ),
                })}
              </span>
            </label>

            <button
              type="submit"
              disabled={loading || !acceptedTerms}
              className="w-full bg-navy text-white px-6 py-3 rounded-md text-label hover:bg-navy-700 active:scale-[0.98] transition-colors duration-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? t("submitLoading") : t("submit")}
            </button>

            <p className="text-center text-body-sm text-ink-secondary">
              {c("alreadyHaveAccount")}{" "}
              <Link href={`/login?redirect=${encodeURIComponent("/associations/nuova")}`} className="text-petrol underline underline-offset-2 decoration-1 hover:text-petrol-700">
                {c("login")}
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
