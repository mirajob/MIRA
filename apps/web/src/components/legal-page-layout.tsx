import Link from "next/link";

/** Layout condiviso per le pagine legali (Privacy, Termini): testo solo in italiano, niente locale switcher. */
export function LegalPageLayout({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-paper">
      <header className="flex items-center justify-between border-b border-border px-4 py-4 lg:px-8">
        <Link href="/">
          <img src="/brand/mira-lockup.svg" alt="MIRA" className="h-6" />
        </Link>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-10 lg:py-14">
        <h1 className="font-display text-h1 text-navy">{title}</h1>
        <p className="mt-2 text-body-sm text-ink-tertiary">{updated}</p>

        <div className="mt-8 space-y-7">{children}</div>
      </main>
    </div>
  );
}

export function LegalSection({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-label text-navy">{heading}</h2>
      <div className="mt-1.5 space-y-3 text-body-sm text-ink-secondary leading-relaxed">{children}</div>
    </section>
  );
}
