"use client";

import { Suspense, useState } from "react";
import { createBrowserClient } from "@mira/supabase/client";
import { validateStudentEmail, validatePassword, ITALIAN_UNIVERSITY_DOMAINS } from "@mira/domain";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

const UNIVERSITIES = [...ITALIAN_UNIVERSITY_DOMAINS].sort((a, b) => a.name.localeCompare(b.name, "it"));

const DEGREE_LEVELS = [
  { value: "triennale", label: "Triennale" },
  { value: "magistrale", label: "Magistrale" },
  { value: "ciclo_unico", label: "Ciclo unico" },
];

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}

function SignupForm() {
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get("redirect") ?? "";
  const redirect = rawRedirect.startsWith("/") && !rawRedirect.startsWith("//") ? rawRedirect : "/api/auth/redirect";
  // Invite-driven signups (e.g. a company admin accepting an invite) are
  // validated by their invitation token, not by student email domain.
  const source = searchParams.get("source");
  const isInvite = redirect.startsWith("/invite/");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [university, setUniversity] = useState("");
  const [degreeLevel, setDegreeLevel] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isInvite) {
      const emailValidation = validateStudentEmail(email);
      if (!emailValidation.valid) {
        setError(emailValidation.error);
        return;
      }
      if (!university || !degreeLevel) {
        setError("Seleziona università e livello di studi.");
        return;
      }
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      setError(passwordValidation.error);
      return;
    }

    setLoading(true);

    const supabase = createBrowserClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          ...(source ? { signup_source: source } : {}),
          ...(!isInvite ? { university, degree_level: degreeLevel } : {}),
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push(redirect);
  }

  const inputClass = "w-full px-4 py-3 rounded-md bg-white border border-border text-body text-ink placeholder:text-ink-tertiary hover:border-border-strong focus:outline-none focus:border-petrol focus:ring-2 focus:ring-petrol/20 transition-colors duration-200";

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-6">
      <div className="space-y-4 rounded-lg border border-border bg-white p-6">
        <h2 className="font-display text-h2 text-navy">Crea il tuo account</h2>

        {error && (
          <div className="rounded-md bg-error-bg p-3 text-body-sm text-error">
            {error}
          </div>
        )}

        <label className="block">
          <span className="text-label text-navy mb-2 block">Nome e cognome</span>
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className={inputClass}
          />
        </label>

        <label className="block">
          <span className="text-label text-navy mb-2 block">Email istituzionale</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            placeholder="nome.cognome@studenti.tuateneo.it"
          />
          {!isInvite && (
            <p className="mt-1 text-body-sm text-ink-tertiary">Usa la tua email universitaria, non una email personale.</p>
          )}
        </label>

        {!isInvite && (
          <>
            <label className="block">
              <span className="text-label text-navy mb-2 block">Università</span>
              <select
                required
                value={university}
                onChange={(e) => setUniversity(e.target.value)}
                className={inputClass}
              >
                <option value="">Seleziona università</option>
                {UNIVERSITIES.map((u) => (
                  <option key={u.domain} value={u.name}>{u.name}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-label text-navy mb-2 block">Livello di studi</span>
              <select
                required
                value={degreeLevel}
                onChange={(e) => setDegreeLevel(e.target.value)}
                className={inputClass}
              >
                <option value="">Seleziona livello</option>
                {DEGREE_LEVELS.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </label>
          </>
        )}

        <label className="block">
          <span className="text-label text-navy mb-2 block">Password</span>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
          <p className="mt-1 text-body-sm text-ink-tertiary">Almeno 8 caratteri, una maiuscola, un numero e un carattere speciale.</p>
        </label>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-navy text-white px-6 py-3 rounded-md text-label hover:bg-navy-700 active:scale-[0.98] transition-colors duration-100 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? "Registrazione..." : "Registrati"}
        </button>
      </div>

      <p className="text-center text-body-sm text-ink-secondary">
        Hai già un account?{" "}
        <Link href="/login" className="text-petrol underline underline-offset-2 decoration-1 hover:text-petrol-700 hover:decoration-2">
          Accedi
        </Link>
      </p>
    </form>
  );
}
