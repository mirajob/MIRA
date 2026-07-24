/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * La pagina pubblica dell'associazione come card, sullo stesso motore del ciclo: MIRA guida
 * sopra, i blocchi si riempiono sotto, e a fine costruzione resta tutto in una schermata con
 * Modifica per blocco. Qui non ci sono blocchi interni: la pagina e' pubblica per definizione.
 *
 * Modulo separato e non "use server": esporta anche costanti e tipi.
 */

export type PageBlock = "identita" | "descrizione" | "settori" | "contatti";

export const PAGE_BLOCK_ORDER: PageBlock[] = ["identita", "descrizione", "settori", "contatti"];

export interface PageCardData {
  nome: string;
  categoria: string;
  logoUrl: string | null;
  descrizioneBreve: string;
  descrizioneLunga: string;
  settori: string[];
  sitoUrl: string;
  email: string;
}

export interface PageCardState {
  associationId: string;
  slug: string;
  status: "draft" | "published" | "unlisted" | string;
  published: boolean;
  phase: PageBlock | "done";
  approved: PageBlock[];
  data: PageCardData;
}

export function pageProgressPct(approved: PageBlock[]): number {
  const done = PAGE_BLOCK_ORDER.filter((b) => approved.includes(b)).length;
  return Math.round((done / PAGE_BLOCK_ORDER.length) * 100);
}

export function nextPagePhase(approved: PageBlock[]): PageBlock | "done" {
  return PAGE_BLOCK_ORDER.find((b) => !approved.includes(b)) ?? "done";
}

export function parsePageBuildState(
  raw: unknown
): { phase: PageBlock | "done"; approved: PageBlock[] } | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (!obj.phase && !Array.isArray(obj.approved)) return null;

  const approved = Array.isArray(obj.approved)
    ? (obj.approved as unknown[]).filter((b): b is PageBlock =>
        PAGE_BLOCK_ORDER.includes(b as PageBlock)
      )
    : [];
  const phase =
    obj.phase === "done" || PAGE_BLOCK_ORDER.includes(obj.phase as PageBlock)
      ? (obj.phase as PageBlock | "done")
      : nextPagePhase(approved);

  return { phase, approved };
}

/**
 * Stato di costruzione effettivo. Una pagina gia' pubblicata prima del nuovo flusso non ha
 * build_state: vale come completa, cosi' si apre come card invece di ripartire da zero.
 */
export function effectivePageBuildState(association: any): {
  phase: PageBlock | "done";
  approved: PageBlock[];
} {
  const parsed = parsePageBuildState(association.page_build_state);
  if (parsed) return parsed;
  if (association.public_page_status === "published") {
    return { phase: "done", approved: [...PAGE_BLOCK_ORDER] };
  }
  return { phase: "identita", approved: [] };
}

/** Chi puo' modificare/pubblicare la pagina. Stessa regola di actions/associations.ts. */
export async function canManagePage(
  supabase: any,
  associationId: string,
  profileId: string,
  isMiraAdmin: boolean
): Promise<boolean> {
  if (isMiraAdmin) return true;

  const { data: membership } = await (supabase.from("association_memberships") as any)
    .select("role, permissions")
    .eq("association_id", associationId)
    .eq("user_id", profileId)
    .eq("status", "active")
    .maybeSingle();

  if (!membership) return false;

  const perms = (membership.permissions as Record<string, boolean>) ?? {};
  return (
    membership.role === "association_president" ||
    membership.role === "association_admin" ||
    Boolean(perms.manage_association_profile) ||
    Boolean(perms.manage_public_page)
  );
}
