import { createServerClient } from "@mira/supabase/server";
import { redirect } from "next/navigation";
import { signOut } from "@/lib/actions/auth";
import Link from "next/link";

export default async function AssociazioneInAttesaPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <header className="px-6 py-4 border-b border-border bg-white flex items-center justify-between">
        <img src="/brand/mira-lockup.svg" alt="MIRA" className="h-5" />
        <form action={signOut}>
          <button type="submit" className="text-body-sm text-ink-tertiary hover:text-navy transition-colors duration-100">
            Esci
          </button>
        </form>
      </header>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-navy-50 border-2 border-navy/20 flex items-center justify-center mx-auto mb-6">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-navy">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>

          <h1 className="font-display text-h1 text-navy mb-3">Candidatura in attesa</h1>
          <p className="text-body text-ink-secondary mb-6">
            Abbiamo ricevuto la candidatura della tua associazione. Il MIRA admin la verificherà entro 24-48 ore e riceverai una email con l&apos;esito.
          </p>

          <div className="rounded-lg border border-petrol/30 bg-petrol-50 p-6 text-left mb-6">
            <p className="text-label text-petrol-700 mb-2">Nel frattempo</p>
            <p className="text-body text-ink mb-4">
              Inizia a costruire il tuo profilo studente su MIRA — la tua MiraCard. Non devi aspettare l&apos;approvazione dell&apos;associazione per farlo.
            </p>
            <Link
              href="/student"
              className="inline-block bg-navy text-white px-5 py-2.5 rounded-md text-label hover:bg-navy-700 transition-colors duration-100"
            >
              Costruisci il tuo profilo →
            </Link>
          </div>

          <div className="rounded-lg border border-border bg-white p-6 text-left mb-6">
            <p className="text-label text-navy mb-3">Cosa succede ora</p>
            <ol className="space-y-3">
              {[
                "Verifichiamo i dati della tua associazione",
                "Attiviamo la pagina dell'associazione",
                "Ricevi una email di conferma",
                "Accedi e inizia a gestire candidature e board",
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-navy text-white text-xs flex items-center justify-center font-medium">
                    {i + 1}
                  </span>
                  <span className="text-body text-ink">{step}</span>
                </li>
              ))}
            </ol>
          </div>

          <p className="text-body-sm text-ink-tertiary">
            Per domande, rispondi all&apos;email di conferma che riceverai.
          </p>
        </div>
      </div>
    </div>
  );
}
