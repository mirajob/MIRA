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

      <main className="flex flex-col items-center justify-center px-6 py-32">
        <p className="text-eyebrow text-navy/60 mb-4 uppercase">
          University talent platform
        </p>
        <h1 className="font-display text-display-xl text-navy text-center max-w-3xl">
          Trova chi sa fare le cose, non chi le scrive bene.
        </h1>
        <p className="mt-6 text-body-lg text-ink-secondary text-center max-w-2xl">
          Profili reali costruiti su evidenze, progetti e simulazioni.
          Non auto-dichiarazioni.
        </p>
        <div className="mt-10 flex gap-4">
          <Link
            href="/signup"
            className="bg-navy text-white px-8 py-4 rounded-md text-body hover:bg-navy-700 transition-colors duration-100"
          >
            Registrati
          </Link>
          <Link
            href="/associations"
            className="bg-cream text-navy px-8 py-4 rounded-md text-body border border-border hover:border-border-strong transition-colors duration-100"
          >
            Scopri le associazioni
          </Link>
        </div>
      </main>
    </div>
  );
}
