/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * La card del ciclo di candidatura: tipi, ordine dei blocchi e permessi.
 *
 * Il ciclo si costruisce come la MIRA Card dello studente — MIRA guida sopra, i blocchi si
 * riempiono sotto — e una volta finito resta consultabile tutto in una schermata sola, con
 * un tasto Modifica per blocco.
 *
 * Modulo separato e non "use server": esporta anche costanti e tipi, che i file "use server"
 * non possono esportare (vedi lib/actions/cycle-card.ts).
 */

export type CycleBlock =
  | "nome"
  | "descrizione"
  | "date"
  | "posizioni"
  | "profilo"
  | "domande";

export const CYCLE_BLOCK_ORDER: CycleBlock[] = [
  "nome",
  "descrizione",
  "date",
  "posizioni",
  "profilo",
  "domande",
];

/** Cosa vede il candidato di ciascun blocco. Serve alla riga "lo studente vede..." nell'editor. */
export const CYCLE_BLOCK_VISIBILITY: Record<CycleBlock, "candidate" | "internal"> = {
  nome: "candidate",
  descrizione: "candidate",
  date: "candidate",
  posizioni: "candidate",
  // I criteri di valutazione restano interni: guidano l'AI e la scelta del board.
  profilo: "internal",
  domande: "candidate",
};

export interface CyclePosition {
  name: string;
  description?: string;
}

export interface CycleQuestion {
  id: string;
  text: string;
  required: boolean;
}

export interface CycleCardData {
  nome: string;
  descrizione: string;
  opensAt: string;
  closesAt: string;
  posizioni: CyclePosition[];
  /** Candidatura aperta senza ruoli specifici: il blocco Posizioni resta volutamente vuoto. */
  candidaturaGenerica: boolean;
  profilo: string;
  domande: CycleQuestion[];
  /** Il board ha dichiarato di non voler fare domande specifiche. */
  nessunaDomanda: boolean;
}

export interface CycleCardState {
  cycleId: string;
  associationId: string;
  slug: string;
  associationName: string;
  status: "draft" | "open" | "closed" | "archived";
  /** Blocco su cui MIRA sta lavorando; "done" quando sono tutti confermati. */
  phase: CycleBlock | "done";
  approved: CycleBlock[];
  data: CycleCardData;
}

export function isBlockApproved(state: CycleCardState, block: CycleBlock): boolean {
  return state.approved.includes(block);
}

export function cycleProgressPct(approved: CycleBlock[]): number {
  const done = CYCLE_BLOCK_ORDER.filter((b) => approved.includes(b)).length;
  return Math.round((done / CYCLE_BLOCK_ORDER.length) * 100);
}

/** Il primo blocco non ancora confermato, o "done". Regola l'avanzamento del percorso. */
export function nextPhase(approved: CycleBlock[]): CycleBlock | "done" {
  return CYCLE_BLOCK_ORDER.find((b) => !approved.includes(b)) ?? "done";
}

export function parseBuildState(raw: unknown): { phase: CycleBlock | "done"; approved: CycleBlock[] } | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (!obj.phase && !Array.isArray(obj.approved)) return null;

  const approved = Array.isArray(obj.approved)
    ? (obj.approved as unknown[]).filter((b): b is CycleBlock =>
        CYCLE_BLOCK_ORDER.includes(b as CycleBlock)
      )
    : [];
  const phase =
    obj.phase === "done" || CYCLE_BLOCK_ORDER.includes(obj.phase as CycleBlock)
      ? (obj.phase as CycleBlock | "done")
      : nextPhase(approved);

  return { phase, approved };
}

/**
 * Chi puo' creare e modificare i cicli. Stessa regola gia' applicata in actions/cycles.ts:
 * admin MIRA, presidente, o permesso esplicito sulla membership.
 */
export async function canManageCycles(
  supabase: any,
  associationId: string,
  profileId: string,
  isMiraAdmin: boolean,
  permission = "manage_application_cycles"
): Promise<boolean> {
  if (isMiraAdmin) return true;

  const { data: membership } = await (supabase.from("association_memberships") as any)
    .select("role, permissions")
    .eq("association_id", associationId)
    .eq("user_id", profileId)
    .eq("status", "active")
    .maybeSingle();

  if (!membership) return false;

  return (
    membership.role === "association_president" ||
    membership.role === "association_admin" ||
    Boolean((membership.permissions as Record<string, boolean>)?.[permission])
  );
}
