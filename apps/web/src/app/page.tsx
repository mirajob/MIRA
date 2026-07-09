import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerClient } from "@mira/supabase/server";

export default async function HomePage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect("/api/auth/redirect");
  }

  return (
    <div className="min-h-screen bg-cream">
      <header className="h-20 px-6 lg:px-12 flex items-center justify-between">
        <img src="/brand/mira-lockup.svg" alt="MIRA" className="h-7" />
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-body text-navy hover:text-petrol transition-colors duration-100">
            Accedi
          </Link>
          <Link href="/signup" className="bg-navy text-white px-6 py-3 rounded-md text-label hover:bg-navy-700 transition-colors duration-100">
            Inizia
          </Link>
        </div>
      </header>

      <main className="px-6 lg:px-12 py-20 max-w-3xl">
        <p className="text-eyebrow text-navy font-semibold uppercase mb-5">
          La tua <span className="underline decoration-2 underline-offset-2">MiraCard</span>
        </p>
        <h1 className="font-display text-display-xl text-navy">
          Il tuo CV racconta cosa hai fatto. MIRA racconta chi sei.
        </h1>
        <p className="mt-6 text-body-lg text-ink-secondary max-w-2xl">
          La tua <strong className="text-navy underline decoration-2 underline-offset-2">MiraCard</strong> ti permette di candidarti alle associazioni e di essere scoperto dalle aziende presenti sulla piattaforma. Un unico profilo che continua ad aprirti nuove opportunità.
        </p>
        <div className="mt-10">
          <Link
            href="/signup"
            className="text-label text-navy uppercase tracking-wide underline decoration-2 underline-offset-4 hover:text-petrol transition-colors duration-100"
          >
            Registrati come studente
          </Link>
        </div>
      </main>

      <section className="border-t border-border px-6 lg:px-12 py-16">
        <div className="max-w-3xl space-y-14">
          <div>
            <h2 className="font-display text-h1 text-navy mb-3">Associazione</h2>
            <p className="text-body-lg text-ink-secondary mb-6 max-w-2xl">
              Candida la tua associazione: gestisci candidature, board e la tua pagina su MIRA.
            </p>
            <Link
              href="/associations/candidati"
              className="inline-block bg-navy text-white px-6 py-3 rounded-md text-label hover:bg-navy-700 transition-colors duration-100"
            >
              Candida la tua associazione →
            </Link>
          </div>

          <div>
            <h2 className="font-display text-h1 text-navy mb-3">Azienda</h2>
            <p className="text-body font-medium text-navy mb-2">
              Non aspettare candidature. Trova i candidati giusti.
            </p>
            <p className="text-body-lg text-ink-secondary mb-6 max-w-2xl">
              Descrivi il profilo che cerchi e lascia che MIRA ti mostri gli studenti più in linea con la tua ricerca.
            </p>
            <Link
              href="/aziende"
              className="inline-block bg-navy text-white px-6 py-3 rounded-md text-label hover:bg-navy-700 transition-colors duration-100"
            >
              Registra la tua azienda →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
