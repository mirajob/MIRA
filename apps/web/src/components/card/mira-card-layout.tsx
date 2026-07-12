/**
 * Guscio strutturale condiviso da /student (editabile) e da CandidateCard (sola lettura,
 * vista associazione/azienda) — un solo posto che possiede la griglia/i divisori, così le
 * due rese non possono divergere visivamente nel tempo (stesso principio dei componenti
 * *View condivisi in components/card/).
 *
 * La colonna stretta usa una container query (@3xl), non un breakpoint di viewport (lg):
 * la pagina associazione incorpora già questa card dentro una propria griglia a due colonne
 * a livello di pagina, quindi un breakpoint legato al viewport la farebbe stringere troppo.
 * Con la container query la card collassa a una colonna quando lo spazio disponibile è
 * poco (es. incorporata a metà pagina), indipendentemente dalla larghezza dello schermo.
 */
export function MiraCardLayout({
  name,
  masthead,
  left,
  right,
}: {
  /** Nome dello studente, mostrato in cima al masthead. Omesso se non disponibile (es. vista azienda anonimizzata). */
  name?: string | null;
  masthead: React.ReactNode;
  left: React.ReactNode;
  right: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-white overflow-hidden">
        {name && (
          <div className="px-6 pt-4">
            <h1 className="font-display text-h1 text-navy">{name}</h1>
          </div>
        )}
        {/* Header e Disponibilità nella stessa striscia orizzontale (non impilati) per non
         * sprecare altezza su una disponibilità che di solito è solo un paio di pill brevi. */}
        <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr] divide-y sm:divide-y-0 sm:divide-x divide-border">
          {masthead}
        </div>
      </div>

      <div className="@container">
        <div className="rounded-xl border border-border bg-white overflow-hidden grid @3xl:grid-cols-[1fr_360px] divide-y @3xl:divide-y-0 @3xl:divide-x divide-border">
          <div className="divide-y divide-border">{left}</div>
          <div className="divide-y divide-border">{right}</div>
        </div>
      </div>
    </div>
  );
}
