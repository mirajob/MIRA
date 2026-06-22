import Link from "next/link";
import { PublicHeader } from "@/components/public-header";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-cream">
      <PublicHeader />

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
