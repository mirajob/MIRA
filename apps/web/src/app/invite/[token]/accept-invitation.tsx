"use client";

import { useState } from "react";
import { acceptInvitation } from "@/lib/actions/accept-invitation";
import Link from "next/link";

interface Props {
  token: string;
  email: string;
  associationName: string;
}

export function AcceptInvitation({ token, email, associationName }: Props) {
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

  return (
    <div className="space-y-4 pt-2">
      {error && (
        <div className="rounded-md bg-error-bg p-3 text-body-sm text-error">
          {error}
        </div>
      )}

      <p className="text-body-sm text-ink-secondary">
        Per accettare l&apos;invito devi essere registrato su MIRA con l&apos;email{" "}
        <strong className="text-navy">{email}</strong>.
      </p>

      <div className="flex gap-3">
        <button
          onClick={handleAccept}
          disabled={loading}
          className="flex-1 bg-navy text-white px-6 py-3 rounded-md text-label hover:bg-navy-700 active:scale-[0.98] transition-colors duration-100 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? "Accettazione..." : "Accetta invito"}
        </button>

        <Link
          href={`/signup?redirect=/invite/${token}`}
          className="flex-1 bg-cream text-navy px-6 py-3 rounded-md text-label text-center border border-border hover:border-border-strong transition-colors duration-100"
        >
          Registrati prima
        </Link>
      </div>
    </div>
  );
}
