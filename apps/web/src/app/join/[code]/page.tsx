"use client";

import { useState } from "react";
import { joinWithCode } from "@/lib/actions/board";
import { useParams } from "next/navigation";
import Link from "next/link";
import { CornerLocale } from "@/components/corner-locale";

export default function JoinPage() {
  const { code } = useParams<{ code: string }>();
  const [roleTitle, setRoleTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success?: boolean; error?: string; associationName?: string } | null>(null);

  async function handleJoin() {
    if (loading) return;
    setLoading(true);
    setResult(null);
    const res = await joinWithCode(code, roleTitle);
    setResult(res);
    setLoading(false);
  }

  const inputClass = "w-full px-4 py-3 rounded-md bg-white border border-border text-body text-ink placeholder:text-ink-tertiary hover:border-border-strong focus:outline-none focus:border-petrol focus:ring-2 focus:ring-petrol/20 transition-colors duration-200";

  if (result?.success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <div className="max-w-md text-center space-y-4 px-4">
          <CornerLocale />
          <img src="/brand/mira-lockup.svg" alt="MIRA" className="mx-auto h-7" />
          <div className="rounded-lg border border-border bg-white p-6 space-y-3 mt-8">
            <h1 className="font-display text-h2 text-navy">Richiesta inviata!</h1>
            <p className="text-body text-ink-secondary">
              La tua richiesta di entrare nel board di {result.associationName} è in attesa di approvazione dal presidente.
            </p>
            <Link href="/student" className="inline-block mt-4 text-petrol underline underline-offset-2">
              Torna al profilo
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper">
      <div className="w-full max-w-md space-y-6 px-4">
        <div className="text-center">
          <CornerLocale />
          <img src="/brand/mira-lockup.svg" alt="MIRA" className="mx-auto h-7" />
        </div>

        <div className="rounded-lg border border-border bg-white p-6 space-y-5">
          <h1 className="font-display text-h2 text-navy">Entra nel board</h1>
          <p className="text-body text-ink-secondary">
            Stai entrando con il codice invito <strong className="text-navy">{code}</strong>. La richiesta va approvata dal presidente prima di darti accesso alla dashboard.
          </p>

          {result?.error && (
            <div className="rounded-md bg-error-bg p-3 text-body-sm text-error">
              {result.error}
            </div>
          )}

          <label className="block">
            <span className="text-label text-navy mb-2 block">Il tuo ruolo specifico</span>
            <input
              type="text"
              value={roleTitle}
              onChange={(e) => setRoleTitle(e.target.value)}
              placeholder="es. Analyst M&A, VP Marketing..."
              className={inputClass}
            />
          </label>

          <button
            onClick={handleJoin}
            disabled={loading}
            className="w-full bg-navy text-white px-6 py-3 rounded-md text-label hover:bg-navy-700 active:scale-[0.98] transition-colors duration-100 disabled:opacity-40"
          >
            {loading ? "Invio..." : "Richiedi accesso al board"}
          </button>
        </div>

        <p className="text-center text-body-sm text-ink-secondary">
          Non hai un account?{" "}
          <Link href={`/signup?redirect=/join/${code}`} className="text-petrol underline underline-offset-2">
            Registrati prima
          </Link>
        </p>
      </div>
    </div>
  );
}
