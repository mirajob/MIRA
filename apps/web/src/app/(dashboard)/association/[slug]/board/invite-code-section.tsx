"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { generateInviteCode } from "@/lib/actions/board";

/**
 * Blocco invito guidato. Prima era un riquadro con un link e nessuna spiegazione: non si
 * capiva cosa succedesse a chi lo usava, ne' che servisse un'approvazione. Ora dice in
 * chiaro cosa ottiene chi entra e quali sono i tre passi.
 *
 * Il testo cambia con la gestione membership: a toggle spento chi entra diventa un
 * collaboratore con accesso alla dashboard, ad acceso un membro senza accesso.
 */
export function InviteCodeSection({
  associationId,
  currentCode,
  membershipEnabled,
  compact = false,
}: {
  associationId: string;
  currentCode: string | null;
  membershipEnabled: boolean;
  /** Solo il link (copia + rigenera), senza titolo/descrizione/passi: quando sopra c'e' gia'
   *  la nota di MIRA che spiega la sezione (TeamPanel/onboarding). */
  compact?: boolean;
}) {
  const t = useTranslations("Board");
  const [code, setCode] = useState(currentCode);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmRegen, setConfirmRegen] = useState(false);

  async function handleGenerate() {
    if (loading) return;
    setLoading(true);
    setConfirmRegen(false);
    const res = await generateInviteCode(associationId);
    if (res.code) setCode(res.code);
    setLoading(false);
  }

  function handleCopy() {
    if (!code) return;
    navigator.clipboard.writeText(`${window.location.origin}/join/${code}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-lg border border-border bg-white p-4">
      {!compact && (
        <>
          <p className="text-body-sm font-semibold text-navy">{t("collaboratorsTitle")}</p>
          <p className="mt-1 text-body-sm text-ink-secondary">
            {membershipEnabled ? t("membershipBodyOn") : t("collaboratorsBody")}
          </p>

          <ol className="mt-3 space-y-0.5">
            {[t("inviteStep1"), t("inviteStep2"), t("inviteStep3")].map((step) => (
              <li key={step} className="text-eyebrow text-ink-tertiary">
                {step}
              </li>
            ))}
          </ol>
        </>
      )}

      {code ? (
        <>
          <p className={`mb-1 text-eyebrow uppercase text-navy/70 ${compact ? "" : "mt-3"}`}>{t("inviteLinkLabel")}</p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-md border border-border bg-paper px-3 py-2 font-mono text-body-sm text-navy">
              {typeof window !== "undefined" ? `${window.location.origin}/join/${code}` : `/join/${code}`}
            </code>
            <button
              onClick={handleCopy}
              className="whitespace-nowrap rounded-md bg-petrol px-4 py-2 text-body-sm font-medium text-white hover:bg-petrol-700 active:scale-[0.98] transition-colors duration-100"
            >
              {copied ? t("copied") : t("copyLink")}
            </button>
          </div>

          <div className="mt-2">
            {confirmRegen ? (
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-eyebrow text-ink-secondary">{t("regenerateHint")}</span>
                <button onClick={handleGenerate} disabled={loading} className="text-eyebrow font-medium text-error">
                  {t("yes")}
                </button>
                <button onClick={() => setConfirmRegen(false)} className="text-eyebrow text-ink-secondary">
                  {t("no")}
                </button>
              </span>
            ) : (
              <button
                onClick={() => setConfirmRegen(true)}
                className="text-eyebrow text-ink-tertiary underline underline-offset-2 hover:text-navy"
              >
                {t("regenerate")}
              </button>
            )}
          </div>
        </>
      ) : (
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="mt-3 rounded-md bg-navy px-4 py-2 text-body-sm font-medium text-white hover:bg-navy-700 active:scale-[0.98] transition-colors duration-100 disabled:opacity-40"
        >
          {t("generateFirst")}
        </button>
      )}
    </div>
  );
}
