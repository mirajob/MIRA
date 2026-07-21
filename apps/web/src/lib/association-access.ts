/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Chi puo' gestire i membri di un'associazione: approvare, nominare, retrocedere,
 * rimuovere, e gestire le sezioni.
 *
 * Modello "gruppo WhatsApp" — scelta esplicita del founder: anche un amministratore
 * puo' nominarne altri, non solo il presidente. Il presidente resta il "creatore del
 * gruppo" e non e' retrocedibile ne' rimuovibile (protetto da chi chiama, vedi
 * demoteToMember / removeBoardMember).
 *
 * Modulo separato e non "use server": e' importato sia da board.ts sia da
 * membership.ts, e i file "use server" possono esportare solo funzioni async.
 */
export async function canManageMembers(
  supabase: any,
  associationId: string,
  profileId: string,
  isMiraAdmin: boolean
): Promise<boolean> {
  if (isMiraAdmin) return true;

  const { data: membership } = await (supabase.from("association_memberships") as any)
    .select("role")
    .eq("association_id", associationId)
    .eq("user_id", profileId)
    .eq("status", "active")
    .maybeSingle();

  return (
    membership?.role === "association_president" ||
    membership?.role === "association_admin"
  );
}
