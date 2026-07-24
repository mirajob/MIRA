/**
 * Il riquadro-guida di MIRA: la sua voce sopra un blocco, senza chat. Stesso stile in tutta
 * la dashboard associazione (pagina pubblica, cicli, membri, Panoramica).
 */
export function MiraGuide({ text, children }: { text: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-petrol/25 bg-petrol-50/60 px-4 py-3">
      <p className="text-eyebrow text-petrol uppercase mb-1.5 flex items-center gap-1.5">
        <span aria-hidden="true">✦</span> MIRA
      </p>
      <p className="text-body text-ink whitespace-pre-wrap">{text}</p>
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}
