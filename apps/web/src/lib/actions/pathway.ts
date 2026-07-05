"use server";

import { chatCompletion } from "@mira/ai";
import { createServiceClient, createServerClient } from "@mira/supabase/server";

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function generatePathwayAnalysis(userId: string) {
  // Verify caller owns this profile
  const serverClient = await createServerClient();
  const { data: { user } } = await serverClient.auth.getUser();
  if (!user) return { error: "Non autenticato." };

  const supabase = await createServiceClient();

  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();

  if (!callerProfile || callerProfile.id !== userId) return { error: "Non autorizzato." };

  const { data: student } = await (supabase.from("student_profiles") as any)
    .select("id")
    .eq("user_id", userId)
    .single();

  if (!student) return { error: "Profilo studente non trovato" };

  const { data: blockRows } = await (supabase.from("card_blocks") as any)
    .select("block_type, prose_content")
    .eq("student_profile_id", student.id)
    .eq("status", "approved");

  const blocks = new Map<string, any>((blockRows ?? []).map((b: any) => [b.block_type, b.prose_content]));
  const header = blocks.get("header") ?? {};
  const esperienze = (blocks.get("esperienze")?.items ?? []) as Array<{ titolo: string; organizzazione: string; descrizione: string }>;
  const formazione = (blocks.get("formazione")?.items ?? []) as Array<{ esame: string; voto: string }>;
  const competenze = (blocks.get("competenze")?.items ?? []) as Array<{ testo: string; evidenza_ref?: string }>;
  const interessi = blocks.get("interessi")?.testo ?? "";
  const pianoCarriera = blocks.get("piano_carriera") ?? {};

  const cardContext = `CARD DELLO STUDENTE (solo blocchi approvati dallo studente):
Corso: ${header.corso || "?"} (${header.livello || "?"}, anno ${header.anno || "?"})
Esami sostenuti: ${formazione.map((e) => `${e.esame} (${e.voto})`).join(", ") || "nessuno approvato"}
Esperienze: ${esperienze.map((e) => `${e.titolo || e.organizzazione}: ${e.descrizione}`).join("\n") || "nessuna approvata"}
Competenze: ${competenze.map((c) => `${c.testo}${c.evidenza_ref ? ` (${c.evidenza_ref})` : ""}`).join("; ") || "nessuna approvata"}
Interessi: ${interessi || "non specificati"}
Piano di carriera: ${pianoCarriera.testo || "non specificato"} (stato: ${pianoCarriera.stato || "esplorazione"})`;

  // Cicli di candidatura aperti — le uniche "azioni" concrete che MIRA può offrire.
  const { data: openCycles } = await (supabase.from("application_cycles") as any)
    .select("id, title, association_id, association_profiles(name, slug)")
    .eq("status", "open");

  const cyclesText = (openCycles ?? [])
    .map((c: any) => `- ${c.association_profiles?.name}: "${c.title}" (slug: ${c.association_profiles?.slug})`)
    .join("\n");

  const prompt = `Genera la pagina "Prossimi passi" per questo studente, basata SOLO sulla card sotto e sui cicli di candidatura aperti elencati.

${cardContext}

CICLI DI CANDIDATURA APERTI SU MIRA:
${cyclesText || "Nessun ciclo aperto al momento"}

Rispondi in JSON con questa struttura:
{
  "obiettivo": {
    "stato": "direzione_chiara|ipotesi|esplorazione",
    "testo": "una riga, onesta. Se stato=esplorazione, formato tipo 'In esplorazione — curiosità: X, Y' basato sugli interessi/piano di carriera dichiarati."
  },
  "cosa_hai_gia": [
    {"fatto": "un fatto concreto della card che supporta l'obiettivo", "evidenza": "l'esame, l'esperienza o la competenza specifica da cui deriva"}
  ],
  "cosa_manca": [
    "gap concreto rispetto all'obiettivo dichiarato — mai vuoto se l'obiettivo non è già pienamente supportato dalla card"
  ],
  "azioni": [
    {"testo": "azione concreta", "tipo": "candidatura|blocco|esperienza", "href": "per candidatura: /associations/{slug}/apply — SOLO se lo slug è tra i cicli aperti sopra; per blocco: /student; per esperienza: stringa vuota"}
  ]
}

REGOLE FERREE:
- MASSIMO 3 elementi in "cosa_hai_gia", MASSIMO 3 in "cosa_manca", MASSIMO 4 in "azioni". Se non hai abbastanza dati concreti, metti MENO elementi — mai riempitivo.
- "azioni" di tipo candidatura SOLO se esiste un ciclo aperto realmente elencato sopra, con lo slug esatto.
- "azioni" di tipo blocco: solo se manca un dato concreto che rafforzerebbe l'obiettivo dichiarato (es. "completa il blocco Competenze").
- VIETATO citare esami o corsi del piano di studi universitario che lo studente non ha sostenuto — MIRA conosce solo gli esami REALMENTE sostenuti (elencati sopra), non il catalogo dell'ateneo.
- VIETATI: sintesi del profilo, paragrafi motivazionali, consigli generici ("partecipa a workshop", "migliora la comunicazione"), riferimenti a soft skill dedotte (leadership, resilienza, ecc.).
- Se lo studente è in esplorazione, non forzare mai un obiettivo definito: è un dato valido, non un fallimento.
- Scrivi in italiano, tono di nota interna concreta.`;

  const systemMsg = `Sei MIRA. Generi SOLO la struttura richiesta, mai testo aggiuntivo. Non inventare fatti non presenti nella card. Vietate inferenze psicologiche o di carattere. Rispondi SOLO in JSON valido.`;

  try {
    const result = await chatCompletion(
      [
        { role: "system", content: systemMsg },
        { role: "user", content: prompt },
      ],
      { temperature: 0.3, maxTokens: 1200, jsonMode: true }
    );

    const analysis = JSON.parse(result);
    const pathwayData = { ...analysis, generated_at: new Date().toISOString() };

    await (supabase.from("student_profiles") as any)
      .update({ pathway_analysis: pathwayData })
      .eq("user_id", userId);

    return { success: true };
  } catch (err) {
    console.error("Pathway analysis generation error:", err);
    return { error: "Errore nella generazione dell'analisi" };
  }
}
