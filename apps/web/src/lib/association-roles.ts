/**
 * Ruoli che danno accesso alla dashboard dell'associazione.
 *
 * Modello "gruppo WhatsApp", tre soli livelli: presidente, amministratore, membro.
 * association_reviewer e association_interviewer sono stati ritirati — verificato che
 * nessuna riga li usasse — e non sono piu' assegnabili dalla UI. I valori restano
 * nell'enum Postgres (toglierli richiederebbe di ricreare il tipo), ma non danno accesso.
 */
export const WORKSPACE_ROLES: string[] = [
  "association_president",
  "association_admin",
];

/**
 * Chi può entrare nella dashboard dell'associazione: ruolo di board, oppure membro
 * semplice con almeno un permesso custom attivo. Stessa regola del layout
 * /association/[slug] — da usare ovunque si decida se mostrare "Gestisci",
 * la voce in sidebar o il banner board, così UI e accesso non divergono
 * (un membro semplice accettato NON deve vedere scorciatoie verso una
 * dashboard da cui verrebbe rimbalzato).
 */
export function hasWorkspaceAccess(
  membership: { role: string; permissions?: unknown } | null | undefined
): boolean {
  if (!membership) return false;
  if (WORKSPACE_ROLES.includes(membership.role)) return true;
  const perms = membership.permissions as Record<string, boolean> | null | undefined;
  return !!perms && Object.values(perms).some((v) => v === true);
}
