import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

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
    <div className="min-h-screen bg-cream">
      <SiteHeader />

      <main className="mx-auto max-w-2xl px-6 py-10 lg:py-14">
        <h1 className="font-display text-h1 text-navy">{title}</h1>
        <p className="mt-2 text-body-sm text-ink-tertiary">{updated}</p>

        <div className="mt-8 space-y-7">{children}</div>
      </main>

      <SiteFooter />
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
