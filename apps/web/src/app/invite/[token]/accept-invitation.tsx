"use client";

import { useState } from "react";
import { acceptInvitation } from "@/lib/actions/accept-invitation";
import { signOut } from "@/lib/actions/auth";
import Link from "next/link";

interface Props {
  token: string;
  invitedEmail: string;
  currentEmail: string | null;
  invitationType: string;
}

export function AcceptInvitation({ token, invitedEmail, currentEmail, invitationType }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleAccept() {
    setLoading(true);
    setError(null);
    const result = await acceptInvitation(token);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  const emailMismatch = currentEmail && currentEmail.toLowerCase() !== invitedEmail.toLowerCase();

  if (emailMismatch) {
    return (
      <div className="space-y-4 pt-2">
        <div className="rounded-md bg-error-bg p-3 text-body-sm text-error">
          Hai eseguito l&apos;accesso come <strong>{currentEmail}</strong>, ma questo invito è per{" "}
          <strong>{invitedEmail}</strong>.
        </div>
        <form action={signOut}>
          <input type="hidden" name="redirect" value={`/invite/${token}`} />
          <button
            type="submit"
            className="w-full bg-navy text-white px-6 py-3 rounded-md text-label hover:bg-navy-700 active:scale-[0.98] transition-colors duration-100"
          >
            Esci e accedi con {invitedEmail}
          </button>
        </form>
      </div>
    );
  }

  if (!currentEmail) {
    const source = invitationType === "company_admin" ? "company" : null;
    const signupParams = new URLSearchParams({ redirect: `/invite/${token}`, email: invitedEmail });
    if (source) signupParams.set("source", source);

    return (
      <div className="space-y-4 pt-2">
        <p className="text-body-sm text-ink-secondary">
          Per accettare l&apos;invito, accedi o crea un account con l&apos;email{" "}
          <strong className="text-navy">{invitedEmail}</strong>.
        </p>

        <div className="flex gap-3">
          <Link
            href={`/login?redirect=/invite/${token}`}
            className="flex-1 bg-navy text-white px-6 py-3 rounded-md text-label text-center hover:bg-navy-700 active:scale-[0.98] transition-colors duration-100"
          >
            Accedi
          </Link>
          <Link
            href={`/signup?${signupParams.toString()}`}
            className="flex-1 bg-cream text-navy px-6 py-3 rounded-md text-label text-center border border-border hover:border-border-strong transition-colors duration-100"
          >
            Crea un account
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-2">
      {error && (
        <div className="rounded-md bg-error-bg p-3 text-body-sm text-error">
          {error}
        </div>
      )}

      <button
        onClick={handleAccept}
        disabled={loading}
        className="w-full bg-navy text-white px-6 py-3 rounded-md text-label hover:bg-navy-700 active:scale-[0.98] transition-colors duration-100 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {loading ? "Accettazione..." : "Accetta invito"}
      </button>
    </div>
  );
}
