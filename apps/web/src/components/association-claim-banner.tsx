"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { submitAssociationClaimRequest, submitAssociationJoinRequest } from "@/lib/actions/association-claim";

export interface ExistingClaimRequest {
  status: "pending" | "approved" | "rejected";
  rejectedReason: string | null;
}

/**
 * "Fai parte del board?" sulla pagina di un'associazione. Due casi, stessa domanda:
 *
 * - pagina ancora nostra (seminata): la richiesta è di prenderla in gestione e la
 *   valuta l'admin MIRA;
 * - pagina già gestita da qualcuno del board: la richiesta è di entrare, e la approva
 *   chi la gestisce già, dalla sua dashboard (decisione founder 2026-07-31).
 *
 * L'invio richiede due passaggi espliciti (si compila, poi si conferma) perché una
 * richiesta partita per sbaglio costa una revisione a qualcuno.
 */
export function AssociationClaimBanner({
  associationId,
  associationName,
  isLoggedIn,
  loginHref,
  existingRequest,
  mode = "claim",
  alreadyRequested = false,
}: {
  associationId: string;
  associationName: string;
  isLoggedIn: boolean;
  loginHref: string;
  existingRequest: ExistingClaimRequest | null;
  /** "claim" = pagina seminata, decide MIRA. "join" = pagina già gestita, decide il board. */
  mode?: "claim" | "join";
  /** Richiesta di ingresso già in attesa (membership pending_approval). */
  alreadyRequested?: boolean;
}) {
  const t = useTranslations("AssociationClaim");
  const [step, setStep] = useState<"closed" | "form" | "confirm">("closed");
  const [role, setRole] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const router = useRouter();

  const alreadyPending = existingRequest?.status === "pending" || alreadyRequested || sent;

  if (alreadyPending) {
    return (
      <div className="mb-6 rounded-lg border border-petrol/30 bg-petrol-50 px-4 py-3">
        <p className="text-body-sm text-ink">{t("pendingTitle")}</p>
        <p className="mt-0.5 text-body-sm text-ink-secondary">
          {mode === "join" ? t("pendingBodyJoin") : t("pendingBody")}
        </p>
      </div>
    );
  }

  async function handleSubmit() {
    setLoading(true);
    const result =
      mode === "join"
        ? await submitAssociationJoinRequest({ associationId, roleInAssociation: role })
        : await submitAssociationClaimRequest({ associationId, roleInAssociation: role, note });
    if (result.error) {
      window.alert(result.error);
      setLoading(false);
      return;
    }
    setSent(true);
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="mb-6 rounded-lg border border-border bg-white px-4 py-3">
      {step === "closed" && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <p className="text-body-sm text-ink">
            {mode === "join" ? t("promptJoin", { name: associationName }) : t("prompt", { name: associationName })}
          </p>
          {isLoggedIn ? (
            <button
              onClick={() => setStep("form")}
              className="ml-auto rounded-md bg-navy px-4 py-1.5 text-body-sm text-white hover:bg-navy-700 transition-colors duration-100"
            >
              {t("openCta")}
            </button>
          ) : (
            <Link
              href={loginHref}
              className="ml-auto rounded-md bg-navy px-4 py-1.5 text-body-sm text-white hover:bg-navy-700 transition-colors duration-100"
            >
              {t("openCta")}
            </Link>
          )}
        </div>
      )}

      {step === "form" && (
        <div className="space-y-3">
          <p className="text-body-sm font-medium text-navy">
            {mode === "join" ? t("formHeadingJoin", { name: associationName }) : t("formHeading", { name: associationName })}
          </p>

          <div>
            <label className="block text-eyebrow uppercase text-navy/60 mb-1">{t("roleLabel")}</label>
            <input
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder={t("rolePlaceholder")}
              className="w-full rounded-md border border-border px-3 py-1.5 text-body-sm focus:border-petrol focus:outline-none"
            />
          </div>

          <div hidden={mode === "join"}>
            <label className="block text-eyebrow uppercase text-navy/60 mb-1">{t("noteLabel")}</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-border px-3 py-1.5 text-body-sm focus:border-petrol focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setStep("confirm")}
              disabled={!role.trim()}
              className="rounded-md bg-navy px-4 py-1.5 text-body-sm text-white hover:bg-navy-700 transition-colors duration-100 disabled:opacity-40"
            >
              {t("continueCta")}
            </button>
            <button
              onClick={() => setStep("closed")}
              className="text-body-sm text-ink-secondary hover:underline"
            >
              {t("cancel")}
            </button>
          </div>
        </div>
      )}

      {step === "confirm" && (
        <div className="space-y-3">
          <p className="text-body-sm text-ink">
            {mode === "join"
              ? t("confirmJoin", { name: associationName, role })
              : t("confirmClaim", { name: associationName, role })}
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="rounded-md bg-petrol px-4 py-1.5 text-body-sm text-white hover:bg-petrol-700 transition-colors duration-100 disabled:opacity-40"
            >
              {loading ? t("sending") : t("confirmCta")}
            </button>
            <button
              onClick={() => setStep("form")}
              className="text-body-sm text-ink-secondary hover:underline"
            >
              {t("back")}
            </button>
          </div>
        </div>
      )}

      {existingRequest?.status === "rejected" && step === "closed" && (
        <p className="mt-2 text-body-sm text-ink-tertiary">
          {t("rejectedNote")}
          {existingRequest.rejectedReason ? ` ${existingRequest.rejectedReason}` : ""}
        </p>
      )}
    </div>
  );
}
