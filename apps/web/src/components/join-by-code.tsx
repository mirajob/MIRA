"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function JoinByCode() {
  const [code, setCode] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();

  async function handleJoin() {
    if (!code.trim() || loading) return;
    setLoading(true);
    setError(null);

    const res = await fetch("/api/membership/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: code.trim() }),
    });

    const data = await res.json();

    if (data.error) {
      setError(data.error);
    } else if (data.redirect) {
      router.push(data.redirect);
    } else {
      setSuccess(`Sei entrato in ${data.associationName}!`);
      setCode("");
      setTimeout(() => router.refresh(), 1000);
    }

    setLoading(false);
  }

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="text-body-sm text-petrol hover:text-petrol-700 underline underline-offset-2 decoration-1"
      >
        Hai un codice invito? Entra in un'associazione
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-white p-4">
      <p className="text-label text-navy mb-2 text-xs">Entra con codice invito</p>

      {error && <p className="text-body-sm text-error mb-2">{error}</p>}
      {success && <p className="text-body-sm text-success mb-2">{success}</p>}

      <div className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && handleJoin()}
          placeholder="es. BSIC-A7K2"
          className="flex-1 px-3 py-2 rounded-md bg-paper border border-border text-body-sm text-ink placeholder:text-ink-tertiary focus:outline-none focus:border-petrol uppercase"
        />
        <button
          onClick={handleJoin}
          disabled={loading || !code.trim()}
          className="bg-navy text-white px-4 py-2 rounded-md text-body-sm hover:bg-navy-700 disabled:opacity-40"
        >
          {loading ? "..." : "Entra"}
        </button>
      </div>
    </div>
  );
}
