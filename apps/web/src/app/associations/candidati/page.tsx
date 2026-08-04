"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { createBrowserClient } from "@mira/supabase/client";
import { registerAssociationPresident, attachAssociationToCurrentUser } from "@/lib/actions/association-register";
import { lookupAssociationMatches, type AssociationMatch } from "@/lib/actions/association-matching";
import { ASSOCIATION_CATEGORIES, validatePassword } from "@mira/domain";
import { getAuthErrorKey } from "@/lib/auth-error-messages";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PasswordInput } from "@/components/password-input";
import { UniversityCombobox } from "@/components/university-combobox";
import { BackLink } from "@/components/page-bar";
import { GoogleSignInButton } from "@/components/google-signin-button";
import { getCurrentStudentBasics } from "@/lib/actions/auth";
import { completeStudentProfile } from "@/lib/actions/complete-profile";

const DEGREE_LEVEL_VALUES = ["triennale", "magistrale", "ciclo_unico"] as const;

/** Esito comune ai due invii: pagina creata, oppure agganciata a una che esisteva già. */
type SubmitResult = { error?: string; linked?: "claim" | "join" };

export default function CandidatiAssociazionePage() {
  const t = useTranslations("CandidatiPage");
  const c = useTranslations("Common");
  const s = useTranslations("SignupPage");
  const v = useTranslations("Validation");
  const [hasAccount, setHasAccount] = useState(false);
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
  // Pagine già su MIRA che sembrano la stessa associazione: finché la scelta non è fatta
  // non si crea niente, altrimenti nasce un doppione della pagina che abbiamo scritto noi.
  const [matches, setMatches] = useState<AssociationMatch[] | null>(null);
  const [linkTarget, setLinkTarget] = useState<AssociationMatch | null>(null);
  const [roleInAssociation, setRoleInAssociation] = useState("");
  // Accesso con Google fatto QUI dentro: la sessione è aperta, si resta sul modulo.
  // `needsUniversity` decide se chiedere ateneo e livello, che Google non ci dà e senza
  // i quali la pagina dell'associazione nascerebbe senza università.
  const [google, setGoogle] = useState<{ name: string | null; needsUniversity: boolean } | null>(null);
  const router = useRouter();

  async function handleGoogleSignedIn() {
    const basics = await getCurrentStudentBasics();
    if (!basics.signedIn) return;
    setError(null);
    setGoogle({ name: basics.fullName, needsUniversity: !basics.university });
    if (basics.university) setUniversity(basics.university);
    if (basics.degreeLevel) setDegreeLevel(basics.degreeLevel);
  }

  /** L'invio vero: crea la pagina, oppure aggancia quella che esiste già. */
  async function submitRegistration(options: {
    linkToAssociationId?: string | null;
    possibleDuplicateOf?: string | null;
  }) {
    setError(null);
    const normalizedUrl = websiteUrl
      ? websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`
      : "";

    const linkPayload = {
      linkToAssociationId: options.linkToAssociationId ?? null,
      roleInAssociation: roleInAssociation || null,
      possibleDuplicateOf: options.possibleDuplicateOf ?? null,
    };

    // Sessione già aperta con Google: niente password da verificare. Se all'account
    // manca l'ateneo lo salviamo qui, senza passare dalla schermata "completa il profilo":
    // chi sta candidando la sua associazione deve restare dentro questo modulo.
    if (google) {
      setLoading(true);

      if (google.needsUniversity) {
        if (!university || !degreeLevel) {
          setError(t("googleMissingUniversity"));
          setLoading(false);
          return;
        }
        const profileResult = await completeStudentProfile({ university, degreeLevel });
        if (profileResult.error) {
          setError(t("googleProfileFailed"));
          setLoading(false);
          return;
        }
        setGoogle({ ...google, needsUniversity: false });
      }

      const result = (await attachAssociationToCurrentUser({
        associationName,
        category,
        websiteUrl: normalizedUrl,
        description,
        ...linkPayload,
      })) as SubmitResult;

      if (result.error) {
        setError(result.error);
        setLoading(false);
        return;
      }

      router.push(pendingHref(result));
      return;
    }

    if (hasAccount) {
      setLoading(true);
      const supabase = createBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError(c(`authErrors.${getAuthErrorKey(signInError.message)}`));
        setLoading(false);
        return;
      }

      const result = (await attachAssociationToCurrentUser({
        associationName,
        category,
        websiteUrl: normalizedUrl,
        description,
        ...linkPayload,
      })) as SubmitResult;

      if (result.error) {
        setError(result.error);
        setLoading(false);
        return;
      }

      router.push(pendingHref(result));
      return;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      setError(v(`password.${passwordValidation.errorCode}`));
      return;
    }

    setLoading(true);

    const result = (await registerAssociationPresident({
      associationName,
      category,
      websiteUrl: normalizedUrl,
      description,
      presidentName,
      email,
      password,
      university,
      degreeLevel,
      ...linkPayload,
    })) as SubmitResult;

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

    router.push(pendingHref(result));
  }

  function pendingHref(result: SubmitResult) {
    if (result.linked === "claim") return "/associations/in-attesa?tipo=gestione";
    if (result.linked === "join") return "/associations/in-attesa?tipo=ingresso";
    return "/associations/in-attesa";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Prima di creare: la pagina di questa associazione potrebbe esistere già. Il
    // controllo è sul nome, dentro lo stesso ateneo, e solo un match praticamente certo
    // interrompe il flusso — un doppione da unire costa meno di un presidente mandato
    // sulla pagina sbagliata.
    // Il confronto con le pagine esistenti si fa dentro l'ateneo, quando lo sappiamo:
    // con Google lo sappiamo dopo l'accesso (dal profilo o dal campo qui sopra), quindi
    // l'eventuale doppione salta fuori solo a università nota, non prima.
    setLoading(true);
    const { matches: found } = await lookupAssociationMatches({
      name: associationName,
      university: hasAccount && !google ? undefined : university || undefined,
    });
    setLoading(false);

    const certain = found.filter((m) => m.level === "certain");
    if (certain.length > 0) {
      setMatches(certain);
      return;
    }

    await submitRegistration({ possibleDuplicateOf: found[0]?.id ?? null });
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <SiteHeader>
        <LocaleSwitcher />
      </SiteHeader>

      <div className="flex-1 flex items-start justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-4">
            <BackLink href="/" label={c("back")} />
          </div>
          <h1 className="font-display text-h1 text-navy mb-2">{t("heading")}</h1>
          <p className="text-body text-ink-secondary mb-8">
            {t("intro")}
          </p>

          {/* La pagina esiste già: si sceglie prima di creare qualsiasi cosa. */}
          {matches && matches.length > 0 && (
            <div className="mb-6 rounded-lg border border-petrol/30 bg-petrol-50 p-5">
              <p className="text-label text-navy">{t("duplicateHeading")}</p>
              <p className="mt-1 text-body-sm text-ink-secondary">{t("duplicateBody")}</p>

              <div className="mt-4 space-y-2">
                {matches.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setLinkTarget(m)}
                    className={`block w-full rounded-md border px-3 py-2 text-left transition-colors duration-100 ${
                      linkTarget?.id === m.id
                        ? "border-petrol bg-white"
                        : "border-border bg-white hover:border-border-strong"
                    }`}
                  >
                    <span className="block text-body-sm font-medium text-navy">{m.name}</span>
                    <span className="block text-body-sm text-ink-tertiary">
                      {m.university ? `${m.university} · ` : ""}
                      {m.claimStatus === "seeded" ? t("duplicateSeeded") : t("duplicateClaimed")}
                    </span>
                  </button>
                ))}
              </div>

              {linkTarget && (
                <div className="mt-4">
                  <label className="block">
                    <span className="text-label text-navy mb-1 block">{t("roleLabel")}</span>
                    <input
                      type="text"
                      value={roleInAssociation}
                      onChange={(e) => setRoleInAssociation(e.target.value)}
                      placeholder={t("rolePlaceholder")}
                      className="w-full rounded-md border border-border px-3 py-2 text-body-sm focus:border-petrol focus:outline-none"
                    />
                  </label>
                  <p className="mt-1 text-body-sm text-ink-tertiary">
                    {linkTarget.claimStatus === "seeded" ? t("duplicateClaimNote") : t("duplicateJoinNote")}
                  </p>
                </div>
              )}

              {error && <div className="mt-3 rounded-md bg-error-bg p-3 text-body-sm text-error">{error}</div>}

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={!linkTarget || !roleInAssociation.trim() || loading}
                  onClick={() => submitRegistration({ linkToAssociationId: linkTarget!.id })}
                  className="rounded-md bg-navy px-4 py-2 text-body-sm text-white hover:bg-navy-700 transition-colors duration-100 disabled:opacity-40"
                >
                  {loading ? c("loading") : t("duplicateConfirmCta")}
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    const possible = matches[0]?.id ?? null;
                    setMatches(null);
                    setLinkTarget(null);
                    submitRegistration({ possibleDuplicateOf: possible });
                  }}
                  className="text-body-sm text-ink-secondary underline underline-offset-2 hover:text-navy"
                >
                  {t("duplicateRejectCta")}
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" hidden={!!matches && matches.length > 0}>
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
              {google ? (
                /* Accesso già fatto con Google: restano al massimo ateneo e livello. */
                <div className="space-y-4">
                  <p className="text-label text-ink-secondary">{t("signedInLabel")}</p>
                  <p className="text-body-sm text-ink-tertiary">
                    {google.name ? t("signedInAs", { name: google.name }) : t("signedInGeneric")}
                  </p>

                  {google.needsUniversity && (
                    <>
                      <p className="text-body-sm text-ink-secondary">{t("googleUniversityIntro")}</p>

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
                    </>
                  )}
                </div>
              ) : (
                <>
              <div className="flex items-center justify-between gap-3 mb-1">
                <p className="text-label text-ink-secondary">
                  {hasAccount ? t("loginSectionLabel") : t("credentialsSectionLabel")}
                </p>
                <button
                  type="button"
                  onClick={() => { setHasAccount(!hasAccount); setError(null); }}
                  className="text-body-sm text-petrol hover:text-petrol-700 underline underline-offset-2 decoration-1 whitespace-nowrap"
                >
                  {hasAccount ? t("switchToCreate") : t("switchToLogin")}
                </button>
              </div>
              <p className="text-body-sm text-ink-tertiary mb-4">
                {hasAccount ? t("loginSectionIntro") : t("credentialsSectionIntro")}
              </p>

              {/* Google vale sia per entrare sia per iscriversi: sta sopra i due modi,
                  e la sessione si apre senza lasciare il modulo. */}
              <div className="mb-4">
                <GoogleSignInButton redirect="/associations/candidati" onSignedIn={handleGoogleSignedIn} />
              </div>

              {hasAccount ? (
                <div className="space-y-4">
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
                    <PasswordInput value={password} onChange={setPassword} required autoComplete="current-password" />
                  </label>
                </div>
              ) : (
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
              )}
                </>
              )}
            </div>

            {!hasAccount && !google && (
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
            )}

            <button
              type="submit"
              disabled={loading || (!hasAccount && !google && !acceptedTerms)}
              className="w-full bg-navy text-white px-6 py-3 rounded-md text-label hover:bg-navy-700 active:scale-[0.98] transition-colors duration-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? t("submitLoading") : t("submit")}
            </button>
          </form>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
