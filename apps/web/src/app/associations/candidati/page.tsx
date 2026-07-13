"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { createBrowserClient } from "@mira/supabase/client";
import { setupAssociationProfile } from "@/lib/actions/association-register";
import { ASSOCIATION_CATEGORIES, validatePassword } from "@mira/domain";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { PasswordInput } from "@/components/password-input";

export default function CandidatiAssociazionePage() {
  const t = useTranslations("CandidatiPage");
  const c = useTranslations("Common");
  const v = useTranslations("Validation");
  const [associationName, setAssociationName] = useState("");
  const [category, setCategory] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [description, setDescription] = useState("");
  const [presidentName, setPresidentName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

    const supabase = createBrowserClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: presidentName, signup_source: "association" } },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    // Email già registrata: Supabase risponde con successo (identities vuoto)
    // invece di un errore, per non rivelare quali email esistono già.
    if (data.user && data.user.identities?.length === 0) {
      setError(c("authErrors.user_already_registered"));
      setLoading(false);
      return;
    }

    if (!data.user?.id) {
      setError(t("registrationErrorGeneric"));
      setLoading(false);
      return;
    }

    const normalizedUrl = websiteUrl
      ? websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`
      : "";

    const result = await setupAssociationProfile({
      associationName,
      category,
      websiteUrl: normalizedUrl,
      description,
      presidentName,
    });

    if (result.error) {
      // Sign out so the orphaned auth user doesn't block a retry
      await supabase.auth.signOut();
      setError(result.error + t("retrySameEmail"));
      setLoading(false);
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
          <p className="text-body text-ink-secondary mb-8">
            {t("intro")}
          </p>

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
              <p className="text-label text-ink-secondary mb-4">{t("credentialsSectionLabel")}</p>

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
                  <span className="text-label text-navy mb-2 block">{t("passwordLabel")}</span>
                  <PasswordInput value={password} onChange={setPassword} required minLength={8} autoComplete="new-password" />
                  <p className="mt-1 text-body-sm text-ink-tertiary">{t("passwordHelper")}</p>
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-navy text-white px-6 py-3 rounded-md text-label hover:bg-navy-700 active:scale-[0.98] transition-colors duration-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? t("submitLoading") : t("submit")}
            </button>

            <p className="text-center text-body-sm text-ink-secondary">
              {c("alreadyHaveAccount")}{" "}
              <Link href="/login" className="text-petrol underline underline-offset-2 decoration-1 hover:text-petrol-700">
                {c("login")}
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
