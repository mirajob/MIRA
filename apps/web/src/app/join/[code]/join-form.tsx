"use client";

import { useState } from "react";
import Link from "next/link";
import { joinWithCode } from "@/lib/actions/board";

/**
 * Il form d'ingresso vero e proprio: mostrato solo a chi e' gia' loggato (il controllo
 * d'accesso e' nella pagina server). Chiede un ruolo opzionale e invia la richiesta, che
 * l'associazione approva dalla sezione team.
 */
export function JoinForm({ code, associationName }: { code: string; associationName: string }) {
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

  const inputClass =
    "w-full px-4 py-3 rounded-md bg-white border border-border text-body text-ink placeholder:text-ink-tertiary hover:border-border-strong focus:outline-none focus:border-petrol focus:ring-2 focus:ring-petrol/20 transition-colors duration-200";

  if (result?.success) {
    return (
      <div className="rounded-lg border border-border bg-white p-6 space-y-3 text-center">
        <h1 className="font-display text-h2 text-navy">Richiesta inviata!</h1>
        <p className="text-body text-ink-secondary">
          La tua richiesta di entrare in {result.associationName ?? associationName} è in attesa di approvazione. Quando
          verrà accettata, l&apos;associazione comparirà nella tua pagina Associazioni.
        </p>
        <Link href="/student" className="inline-block mt-4 text-petrol underline underline-offset-2">
          Torna al profilo
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-white p-6 space-y-5">
      <h1 className="font-display text-h2 text-navy">Entra in {associationName}</h1>
      <p className="text-body text-ink-secondary">
        Stai entrando con il codice invito <strong className="text-navy">{code}</strong>. La richiesta va approvata da un
        responsabile dell&apos;associazione.
      </p>

      {result?.error && <div className="rounded-md bg-error-bg p-3 text-body-sm text-error">{result.error}</div>}

      <label className="block">
        <span className="text-label text-navy mb-2 block">Il tuo ruolo (facoltativo)</span>
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
        {loading ? "Invio..." : "Richiedi di entrare"}
      </button>
    </div>
  );
}
