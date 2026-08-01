"use server";

import {
  parseTranscriptWithGemini,
  parseTranscriptFile,
  formatTranscriptForChat,
  estimateGeminiCost,
  type ParsedCourse,
  type GeminiUsage,
} from "@mira/ai";

// Modello di produzione per la lettura del libretto: Flash-Lite 3.1 con ragionamento alto.
// Scelto su prove vere fatte dal playground sullo stesso libretto Bocconi (2026-08-01):
// legge tutti i 16 esami senza sbagliare un voto in 9 secondi e per circa 0,006 dollari,
// contro i 14 secondi e il centesimo abbondante della 3.5, e contro l'alias -latest che
// costa 1,50/7,50 per milione di token invece di 0,25/1,50.
// Se un giorno Google ritira questa versione, geminiGenerateJson ripiega sull'alias.
const TRANSCRIPT_MODEL = "gemini-3.1-flash-lite" as const;
import { createServiceClient } from "@mira/supabase/server";
import { getUserContext } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { ensureCardBlocksExist } from "./card-blocks";
import { getCicloEsame } from "@mira/types";
import type { HeaderProseContent, FormazioneItem, CicloEsame } from "@mira/types";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "application/pdf"];

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyRow = Record<string, any>;

/**
 * Carica e legge un libretto. `ciclo` distingue il corso attuale dal corso precedente (la
 * triennale di chi ha appena iniziato la magistrale): i due elenchi di esami convivono nella
 * card, ognuno sostituisce solo se stesso a ogni nuovo caricamento. Solo il libretto del corso
 * attuale scrive media, corso e livello sull'Header; quello precedente alimenta la sezione
 * "formazione precedente" e basta.
 */
export async function uploadTranscript(formData: FormData) {
  const ctx = await getUserContext();
  const profileId = (ctx.profile as any).id as string;
  const supabase = await createServiceClient();

  const isPrevious = formData.get("ciclo") === "precedente";
  const coursePhase = isPrevious ? "previous" : "current";

  const file = formData.get("file") as File | null;
  if (!file) return { error: "Nessun file selezionato." };
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { error: "Formato non supportato. Carica un PDF o uno screenshot (PNG, JPG, WebP)." };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { error: "File troppo grande (max 10MB)." };
  }

  const { data: studentProfile } = await (supabase
    .from("student_profiles") as any)
    .select("id")
    .eq("user_id", profileId)
    .single() as { data: AnyRow | null };

  if (!studentProfile) return { error: "Profilo studente non trovato." };

  const buffer = Buffer.from(await file.arrayBuffer());

  const filePath = `${profileId}/${Date.now()}_${file.name}`;
  const { error: uploadError } = await supabase.storage
    .from("transcripts")
    .upload(filePath, buffer, { contentType: file.type, upsert: false });

  if (uploadError) {
    console.error("Storage upload error:", uploadError);
    return { error: `Errore nel caricamento: ${uploadError.message}` };
  }

  // L'esito si controlla: con visibility_scope sbagliato questo insert falliva in silenzio
  // e la tabella dei file caricati è rimasta vuota per settimane.
  const { data: uploadedFile, error: uploadedFileError } = await (supabase
    .from("uploaded_files") as any)
    .insert({
      owner_user_id: profileId,
      bucket: "transcripts",
      file_path: filePath,
      file_type: file.type,
      file_name: file.name,
      file_size: file.size,
      visibility_scope: "private_to_student",
      linked_entity_type: "student_profile",
      linked_entity_id: studentProfile.id,
    })
    .select("id")
    .single() as { data: AnyRow | null; error: unknown };
  if (uploadedFileError) console.error("[MIRA] uploaded_files insert fallito:", uploadedFileError);

  const { data: transcript } = await (supabase
    .from("student_transcripts") as any)
    .insert({
      student_profile_id: studentProfile.id,
      uploaded_file_id: uploadedFile?.id ?? null,
      extraction_status: "processing",
      phase: coursePhase,
    })
    .select("id")
    .single() as { data: AnyRow | null };

  try {
    const base64 = buffer.toString("base64");

    // Gemini è la strada veloce, ma risponde 503 quando il modello è sovraccarico e in quel
    // momento lo studente resta senza libretto. Il parser OpenAI (più lento, stesso prompt)
    // vale come ripiego: meglio venti secondi in più che un errore in faccia.
    let parsed;
    let usedModel: string = TRANSCRIPT_MODEL;
    let viaText = false;
    let textReason = "";
    let usage: GeminiUsage | undefined;
    try {
      ({ parsed, viaText = false, textReason = "", usage } = await parseTranscriptWithGemini(
        base64,
        file.type,
        TRANSCRIPT_MODEL
      ));
    } catch (geminiError) {
      console.error("[MIRA] Gemini transcript parse failed, ripiego su OpenAI:", geminiError);
      parsed = await parseTranscriptFile(base64, file.type);
      usedModel = "openai-fallback";
    }

    // Recalculate weighted average in code (AI math is unreliable)
    let weightedSum = 0;
    let gradedCredits = 0;
    let passfailCredits = 0;
    for (const c of parsed.courses) {
      if (c.grade_numeric != null && !c.is_pass_fail) {
        weightedSum += c.grade_numeric * c.credits;
        gradedCredits += c.credits;
      } else {
        passfailCredits += c.credits;
      }
    }
    const correctAverage = gradedCredits > 0 ? Math.round((weightedSum / gradedCredits) * 100) / 100 : null;
    parsed.weighted_average = correctAverage;
    parsed.graded_credits = gradedCredits;
    parsed.pass_fail_credits = passfailCredits;
    parsed.total_credits = gradedCredits + passfailCredits;

    await (supabase.from("student_transcripts") as any)
      .update({
        extraction_status: "completed",
        extracted_data: parsed,
        weighted_average: correctAverage,
        total_credits: parsed.total_credits,
        extraction_confidence: "ai_vision",
      })
      .eq("id", transcript!.id);

    if (parsed.courses.length > 0) {
      // Un libretto è cumulativo: sostituisce sempre l'intero elenco della SUA fase, mai un
      // merge (produrrebbe duplicati). La fase opposta non si tocca.
      await (supabase.from("student_courses") as any)
        .delete()
        .eq("student_profile_id", studentProfile.id)
        .eq("phase", coursePhase);

      await (supabase.from("student_courses") as any).insert(
        parsed.courses.map((c: ParsedCourse) => ({
          student_profile_id: studentProfile.id,
          transcript_id: transcript!.id,
          course_name: c.course_name,
          course_code: c.course_code || null,
          credits: c.credits,
          grade: c.grade,
          grade_numeric: c.grade_numeric,
          academic_year: c.academic_year || null,
          semester: c.semester || null,
          source: "transcript",
          phase: coursePhase,
        }))
      );
    }

    // LEGACY-WRITE(card-rework): rimuovere in Step 5/6 quando pathway.ts e la vista associazione
    // leggeranno direttamente da card_blocks invece che da queste colonne.
    // Il libretto del corso precedente non tocca nulla di questo: corso, livello, media e il
    // flag "ha caricato il libretto" descrivono il percorso attuale.
    if (!isPrevious) {
      await (supabase.from("student_profiles") as any)
        .update({
          degree_program: parsed.degree_program || null,
          degree_level: parsed.degree_level || null,
          transcript_uploaded: true,
          transcript_summary: parsed,
        })
        .eq("id", studentProfile.id);
    }

    // Transcript-only write path for header.media_voti and formazione.items — the one
    // legitimate way these fields change (spec: "si aggiornano ricaricando il libretto").
    await ensureCardBlocksExist(studentProfile.id);

    const { data: headerRow } = await (supabase.from("card_blocks") as any)
      .select("prose_content, status")
      .eq("student_profile_id", studentProfile.id)
      .eq("block_type", "header")
      .single();

    if (!headerRow) {
      console.error("[MIRA] transcript-upload: riga Header non trovata per studentProfileId", studentProfile.id);
      throw new Error("Riga Header non trovata per questo studente.");
    }

    // Un blocco già confermato NON torna mai in bozza per un caricamento del libretto: il dato
    // che arriva qui è verificato e l'ha chiesto lo studente stesso. Retrocederlo lo faceva
    // sparire dalla card vista da associazioni/aziende/admin (che leggono solo i blocchi
    // approvati) senza che lo studente se ne accorgesse, perché sul suo Profilo vede tutto.
    const keepApproved = (status: string | null | undefined) => (status === "approved" ? "approved" : "draft");

    const existingHeader = (headerRow.prose_content ?? {}) as Partial<HeaderProseContent>;
    const fp = existingHeader.formazione_precedente ?? null;

    const nextHeader: HeaderProseContent = isPrevious
      ? {
          // Libretto della triennale: l'anagrafica del corso attuale resta intatta, si
          // completa solo la formazione precedente con quello che il libretto sa dire.
          universita: existingHeader.universita ?? null,
          corso: existingHeader.corso ?? null,
          livello: existingHeader.livello ?? null,
          anno: existingHeader.anno ?? null,
          anno_inizio: existingHeader.anno_inizio ?? null,
          laurea_anno: existingHeader.laurea_anno ?? null,
          media_voti: existingHeader.media_voti ?? null,
          formazione_precedente: {
            universita: fp?.universita ?? parsed.university_name ?? null,
            corso: fp?.corso ?? parsed.degree_program ?? null,
            voto_laurea: fp?.voto_laurea ?? null,
            tema_tesi: fp?.tema_tesi ?? null,
            media_voti: parsed.weighted_average,
          },
        }
      : {
          universita: existingHeader.universita ?? parsed.university_name ?? null,
          // Il nome del corso del libretto VINCE su quello scritto a mano in fase di
          // registrazione: è il documento ufficiale, e sulla card ci va il nome giusto.
          corso: parsed.degree_program?.trim() || existingHeader.corso || null,
          livello: existingHeader.livello ?? parsed.degree_level ?? null,
          anno: existingHeader.anno ?? null,
          anno_inizio: existingHeader.anno_inizio ?? null,
          laurea_anno: existingHeader.laurea_anno ?? null,
          media_voti: parsed.weighted_average,
          formazione_precedente: fp,
        };

    const { data: headerUpdatedRows, error: headerWriteError } = await (supabase.from("card_blocks") as any)
      .update({
        prose_content: nextHeader,
        status: keepApproved(headerRow.status),
        ...(isPrevious ? {} : { structured_data: { media_voti: parsed.weighted_average, cfu: parsed.total_credits } }),
      })
      .eq("student_profile_id", studentProfile.id)
      .eq("block_type", "header")
      .select("id");
    if (headerWriteError) {
      console.error("[MIRA] transcript-upload header write failed:", headerWriteError);
      throw new Error("Impossibile salvare i dati del libretto sull'Header.");
    }
    if (!headerUpdatedRows || headerUpdatedRows.length === 0) {
      console.error("[MIRA] transcript-upload: 0 righe Header aggiornate per studentProfileId", studentProfile.id);
      throw new Error("Riga Header non trovata per questo studente.");
    }

    if (parsed.courses.length > 0) {
      const ciclo: CicloEsame = isPrevious ? "precedente" : "attuale";
      const nuoviEsami: FormazioneItem[] = parsed.courses.map((c: ParsedCourse) => ({
        id: crypto.randomUUID(),
        esame: c.course_name,
        voto: c.grade,
        cfu: c.credits,
        anno: c.academic_year || null,
        semestre: c.semester || null,
        verified: true,
        origin: "transcript",
        ciclo,
      }));

      const { data: formazioneRow } = await (supabase.from("card_blocks") as any)
        .select("status, prose_content")
        .eq("student_profile_id", studentProfile.id)
        .eq("block_type", "formazione")
        .single();

      // Sostituisce solo gli esami della stessa fase: caricare la triennale non cancella la
      // magistrale e viceversa. Le righe senza `ciclo` sono pre-2026-07-31, quindi attuali.
      const esamiEsistenti = (formazioneRow?.prose_content?.items ?? []) as FormazioneItem[];
      const esamiAltroCiclo = esamiEsistenti.filter((it) => getCicloEsame(it) !== ciclo);
      const formazioneItems = isPrevious ? [...esamiAltroCiclo, ...nuoviEsami] : [...nuoviEsami, ...esamiAltroCiclo];

      const { data: formazioneUpdatedRows, error: formazioneWriteError } = await (supabase.from("card_blocks") as any)
        .update({
          prose_content: { items: formazioneItems },
          status: keepApproved(formazioneRow?.status),
        })
        .eq("student_profile_id", studentProfile.id)
        .eq("block_type", "formazione")
        .select("id");
      if (formazioneWriteError) {
        console.error("[MIRA] transcript-upload formazione write failed:", formazioneWriteError);
        throw new Error("Impossibile salvare gli esami del libretto.");
      }
      if (!formazioneUpdatedRows || formazioneUpdatedRows.length === 0) {
        console.error("[MIRA] transcript-upload: 0 righe Formazione aggiornate per studentProfileId", studentProfile.id);
        throw new Error("Riga Formazione non trovata per questo studente.");
      }
    }

    await (supabase.from("ai_logs") as any).insert({
      module: "transcript_parser",
      provider: usedModel === "openai-fallback" ? "openai" : "google",
      model: usedModel,
      entity_type: "student_transcript",
      entity_id: transcript!.id,
      user_id: profileId,
      // via_text = il PDF aveva testo e l'abbiamo estratto in locale (strada veloce);
      // false = lettura visiva del file, cioè scansione o screenshot.
      input_metadata: {
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        phase: coursePhase,
        via_text: viaText,
        // Perché quella strada: "ok:12345" testo estratto, "poco_testo:80" scansione,
        // "errore:..." la libreria non ce l'ha fatta, "testo_senza_esami" testo inutile.
        text_reason: textReason,
      },
      tokens_input: usage?.inputTokens ?? null,
      tokens_output: usage?.outputTokens ?? null,
      estimated_cost: usage ? estimateGeminiCost(usedModel, usage) : null,
      output_summary: {
        university_name: parsed.university_name,
        degree_program: parsed.degree_program,
        degree_level: parsed.degree_level,
        courses_found: parsed.courses.length,
        total_credits: parsed.total_credits,
        weighted_average: parsed.weighted_average,
      },
      status: "success",
    });

    // Il libretto può ora essere (ri)caricato anche dal Profilo, non solo in onboarding:
    // senza questa revalidate la pagina Profilo continuerebbe a mostrare esami/media vecchi
    // finché non si naviga altrove e si torna.
    revalidatePath("/student");

    const summary = formatTranscriptForChat(parsed);
    return { success: true, summary, parsed };
  } catch (err) {
    await (supabase.from("student_transcripts") as any)
      .update({
        extraction_status: "failed",
        extraction_notes: err instanceof Error ? err.message : "Unknown error",
      })
      .eq("id", transcript!.id);

    const errorMsg = err instanceof Error ? err.message : "Errore sconosciuto";
    console.error("Transcript parse error:", errorMsg);
    return { error: `Errore parsing libretto: ${errorMsg}` };
  }
}
