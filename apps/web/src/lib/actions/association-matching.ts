"use server";

import { createServiceClient } from "@mira/supabase/server";
import { getUserContext } from "@/lib/auth";
import { rankAssociationMatches } from "@mira/domain";

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface AssociationMatch {
  id: string;
  name: string;
  slug: string;
  university: string | null;
  /** "seeded" = pagina scritta da MIRA e non ancora rivendicata. */
  claimStatus: "seeded" | "claimed";
  published: boolean;
  level: "certain" | "possible";
}

/**
 * Le pagine già su MIRA che potrebbero essere la stessa associazione che si sta
 * registrando. Chiamata dal form pubblico prima di creare qualsiasi cosa: da quando
 * seminiamo le pagine degli atenei, il presidente che si registra rischia di creare
 * un doppione della propria pagina senza saperlo.
 *
 * Il confronto avviene solo dentro lo stesso ateneo: "Consulting Club" esiste in ogni
 * università e collegare quelle di atenei diversi sarebbe sempre sbagliato.
 */
export async function lookupAssociationMatches(input: {
  name: string;
  /** Se manca, si prende quella dichiarata dallo studente che ha già l'account. */
  university?: string;
}): Promise<{ matches: AssociationMatch[] }> {
  const name = (input.name ?? "").trim();
  if (name.length < 2) return { matches: [] };

  const supabase = await createServiceClient();

  let university = (input.university ?? "").trim();
  if (!university) {
    try {
      const ctx = await getUserContext();
      const { data: student } = await (supabase.from("student_profiles") as any)
        .select("university")
        .eq("user_id", (ctx.profile as any).id)
        .maybeSingle();
      university = (student?.university ?? "").trim();
    } catch {
      // Form pubblico senza sessione: senza ateneo non si confronta niente.
    }
  }
  // Senza ateneo non ci si ferma: si confronta ovunque e la scelta mostra l'ateneo di
  // ogni pagina. Fermarsi qui vorrebbe dire non controllare affatto, ed è esattamente
  // il caso in cui nascevano i doppioni.
  let query = (supabase.from("association_profiles") as any)
    .select("id, name, slug, university, claim_status, public_page_status, verification_status");
  if (university) query = query.eq("university", university);

  const { data: rows, error } = await query;
  if (error) {
    console.error("[MIRA] lookupAssociationMatches failed:", error);
    return { matches: [] };
  }

  // Si escludono le pagine rifiutate o sospese: proporre di prendere in gestione una
  // pagina che abbiamo già scartato non ha senso.
  const candidates = ((rows ?? []) as any[]).filter(
    (r) => !["rejected", "suspended"].includes(r.verification_status)
  );

  const ranked = rankAssociationMatches(name, candidates);

  return {
    matches: ranked.slice(0, 3).map(({ candidate, match }) => ({
      id: candidate.id,
      name: candidate.name,
      slug: (candidate as any).slug,
      university: (candidate as any).university ?? null,
      claimStatus: (candidate as any).claim_status === "seeded" ? "seeded" : "claimed",
      published: (candidate as any).public_page_status === "published",
      level: match.level as "certain" | "possible",
    })),
  };
}
