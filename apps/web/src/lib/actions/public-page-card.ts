"use server";

import { createServiceClient } from "@mira/supabase/server";
import { getUserContext } from "@/lib/auth";
import {
  canManagePage,
  effectivePageBuildState,
  nextPagePhase,
  parsePageBuildState,
  PAGE_BLOCK_ORDER,
} from "@/lib/public-page-card";
import type { PageBlock, PageCardState } from "@/lib/public-page-card";
import { revalidatePath } from "next/cache";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Costruzione e modifica della pagina pubblica come card. Lo stato di avanzamento vive su
 * association_profiles.page_build_state: chiudere il browser a meta' e rientrare riprende da
 * dove si era rimasti.
 */

async function loadGuarded(associationId: string) {
  const supabase = await createServiceClient();
  const { data: association } = await (supabase.from("association_profiles") as any)
    .select("*")
    .eq("id", associationId)
    .maybeSingle();

  if (!association) return { error: "Associazione non trovata" as const, association: null, supabase };

  const ctx = await getUserContext();
  const profileId = (ctx.profile as any).id as string;

  if (!(await canManagePage(supabase, associationId, profileId, ctx.isMiraAdmin))) {
    return { error: "Non hai i permessi per modificare la pagina" as const, association: null, supabase };
  }
  return { error: null, association, supabase };
}

function toState(association: any): PageCardState {
  const parsed = effectivePageBuildState(association);
  return {
    associationId: association.id,
    slug: association.slug,
    status: association.public_page_status ?? "draft",
    published: association.public_page_status === "published",
    phase: parsed.phase,
    approved: parsed.approved,
    data: {
      nome: association.name ?? "",
      categoria: association.category ?? "",
      logoUrl: association.logo_url ?? null,
      descrizioneBreve: association.short_description ?? "",
      descrizioneLunga: association.long_description ?? "",
      settori: (association.sectors ?? []) as string[],
      sitoUrl: association.website_url ?? "",
      email: association.contact_email ?? "",
    },
  };
}

export async function loadPublicPageCard(
  associationId: string
): Promise<{ state?: PageCardState; error?: string }> {
  const { error, association } = await loadGuarded(associationId);
  if (error) return { error };
  return { state: toState(association) };
}

export interface PageBlockPayload {
  nome?: string;
  categoria?: string;
  descrizioneBreve?: string;
  descrizioneLunga?: string;
  settori?: string[];
  sitoUrl?: string;
  email?: string;
}

function isValidUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export async function savePageBlock(associationId: string, block: PageBlock, payload: PageBlockPayload) {
  const { error, association, supabase } = await loadGuarded(associationId);
  if (error) return { error };

  const parsed = effectivePageBuildState(association);
  const update: Record<string, unknown> = {};

  switch (block) {
    case "identita": {
      const nome = (payload.nome ?? "").trim();
      if (!nome) return { error: "Il nome dell'associazione è obbligatorio" };
      if (nome.length > 120) return { error: "Nome troppo lungo (max 120 caratteri)" };
      update.name = nome;
      update.category = (payload.categoria ?? "").trim() || null;
      break;
    }
    case "descrizione": {
      const breve = (payload.descrizioneBreve ?? "").trim();
      if (breve.length > 300) return { error: "La descrizione breve è troppo lunga (max 300 caratteri)" };
      update.short_description = breve || null;
      update.long_description = (payload.descrizioneLunga ?? "").trim() || null;
      break;
    }
    case "settori": {
      const settori = (payload.settori ?? [])
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 12);
      update.sectors = settori.length > 0 ? settori : null;
      break;
    }
    case "contatti": {
      const sito = (payload.sitoUrl ?? "").trim();
      const email = (payload.email ?? "").trim();
      if (sito && !isValidUrl(sito)) {
        return { error: "L'indirizzo del sito non è valido (deve iniziare con http:// o https://)" };
      }
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return { error: "L'email di contatto non è valida" };
      }
      update.website_url = sito || null;
      update.contact_email = email || null;
      break;
    }
  }

  const approved = parsed.approved.includes(block) ? parsed.approved : [...parsed.approved, block];
  const ordered = PAGE_BLOCK_ORDER.filter((b) => approved.includes(b));
  update.page_build_state = { phase: nextPagePhase(ordered), approved: ordered };

  const { error: updateError } = await (supabase.from("association_profiles") as any)
    .update(update)
    .eq("id", associationId);

  if (updateError) return { error: updateError.message };

  revalidatePath(`/association/${association.slug}/public-page`);
  revalidatePath(`/associations/${association.slug}`);
  return { success: true };
}

/**
 * Carica il logo su storage e salva l'url subito (come l'upload del CV nell'onboarding), poi
 * restituisce il nuovo url per aggiornare l'anteprima senza aspettare il Conferma del blocco.
 */
export async function uploadPageLogo(associationId: string, formData: FormData) {
  const { error, association, supabase } = await loadGuarded(associationId);
  if (error) return { error };

  const file = formData.get("logo") as File | null;
  if (!file || file.size === 0) return { error: "Nessun file selezionato" };
  if (file.size > 4 * 1024 * 1024) return { error: "Il logo è troppo pesante (max 4 MB)" };

  const bytes = await file.arrayBuffer();
  const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
  const path = `${associationId}/logo.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("association-logos")
    .upload(path, bytes, { contentType: file.type, upsert: true });
  if (uploadError) return { error: "Errore nel caricamento del logo" };

  const { data: urlData } = supabase.storage.from("association-logos").getPublicUrl(path);
  // Cache-buster: l'url e' stabile (upsert), senza questo l'anteprima mostrerebbe il vecchio.
  const logoUrl = `${urlData.publicUrl}?v=${Date.now()}`;

  await (supabase.from("association_profiles") as any)
    .update({ logo_url: logoUrl })
    .eq("id", associationId);

  revalidatePath(`/association/${association.slug}/public-page`);
  revalidatePath(`/associations/${association.slug}`);
  return { logoUrl };
}

export async function reopenPageBlock(associationId: string, block: PageBlock) {
  const { error, association, supabase } = await loadGuarded(associationId);
  if (error) return { error };

  const parsed = effectivePageBuildState(association);
  await (supabase.from("association_profiles") as any)
    .update({ page_build_state: { phase: block, approved: parsed.approved } })
    .eq("id", associationId);

  revalidatePath(`/association/${association.slug}/public-page`);
  return { success: true };
}

export async function closePageEditing(associationId: string) {
  const { error, association, supabase } = await loadGuarded(associationId);
  if (error) return { error };

  const parsed = effectivePageBuildState(association);
  await (supabase.from("association_profiles") as any)
    .update({ page_build_state: { phase: nextPagePhase(parsed.approved), approved: parsed.approved } })
    .eq("id", associationId);

  revalidatePath(`/association/${association.slug}/public-page`);
  return { success: true };
}

/** Pubblica la pagina: da qui gli studenti la vedono e possono candidarsi ai cicli aperti. */
export async function publishPublicPageCard(associationId: string) {
  const { error, association, supabase } = await loadGuarded(associationId);
  if (error) return { error };

  const parsed = parsePageBuildState(association.page_build_state);
  if (parsed) {
    const missing = PAGE_BLOCK_ORDER.filter((b) => !parsed.approved.includes(b));
    if (missing.length > 0) {
      return { error: "Completa tutti i blocchi prima di pubblicare la pagina" };
    }
  }
  if (!association.name?.trim()) {
    return { error: "Serve almeno il nome dell'associazione" };
  }

  const ctx = await getUserContext();

  await (supabase.from("association_profiles") as any)
    .update({ public_page_status: "published" })
    .eq("id", associationId);

  await (supabase.from("audit_logs") as any).insert({
    actor_user_id: (ctx.profile as any).id,
    action: "association_page_published",
    entity_type: "association_profile",
    entity_id: associationId,
  });

  revalidatePath(`/association/${association.slug}/public-page`);
  revalidatePath(`/associations/${association.slug}`);
  return { success: true };
}
