import { createServiceClient } from "@mira/supabase/server";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { APPLICATION_STATUS_LABELS } from "@mira/domain";
import Link from "next/link";
import { CandidateActions, type RoundOption } from "./candidate-actions";
import { CandidateNotes, type CandidateNote } from "./candidate-notes";
import { MiraCardDocument } from "@/components/card-view/mira-card-document";
import { APP_TIME_ZONE } from "@/lib/format-date";

interface Props {
  params: Promise<{ slug: string; applicationId: string }>;
}

export default async function CandidateDetailPage({ params }: Props) {
  const { slug, applicationId } = await params;
  const supabase = await createServiceClient();
  const t = await getTranslations("CandidateDetail");
  const locale = await getLocale();
  const dateLocale = locale === "it" ? "it-IT" : "en-US";

  // association e application non dipendono l'una dall'altra — in parallelo.
  const [{ data: association }, { data: application }] = await Promise.all([
    (supabase.from("association_profiles") as any).select("name").eq("slug", slug).single(),
    (supabase.from("applications") as any)
      .select(`
        *,
        profiles(full_name, email),
        student_profiles(id, degree_program, degree_level, current_year, transcript_summary),
        application_cycles(title),
        application_answers(id, answer_text, answer_json, application_questions(question_text, question_type)),
        application_status_events(id, previous_status, new_status, note, created_at, profiles(full_name)),
        candidate_internal_notes(id, note_text, created_at, profiles(full_name))
      `)
      .eq("id", applicationId)
      .maybeSingle(),
  ]);

  if (!application) notFound();

  // Read files directly from Storage (uploaded_files table may not be populated)
  const studentUserId = (application as any).student_user_id as string;
  const studentProfileIdForFiles = (application.student_profiles as any)?.id as string | undefined;

  let transcriptUrl: string | null = null;
  let cvUrl: string | null = null;

  // Le tre liste (transcript, cv, blocchi card) dipendono solo da id già noti —
  // in parallelo invece che in sequenza, questa pagina è la più pesante del sito.
  const [{ data: transcriptFiles }, { data: cvFiles }, { data: blockRows }] = await Promise.all([
    supabase.storage
      .from("student-transcripts")
      .list(studentUserId, { limit: 1, sortBy: { column: "created_at", order: "desc" } }),
    supabase.storage
      .from("transcripts")
      .list(`cv/${studentUserId}`, { limit: 1, sortBy: { column: "created_at", order: "desc" } }),
    studentProfileIdForFiles
      ? (supabase.from("card_blocks") as any)
          .select("block_type, prose_content, visibility")
          .eq("student_profile_id", studentProfileIdForFiles)
          .eq("status", "approved")
      : Promise.resolve({ data: [] }),
  ]);

  const [signedTranscript, signedCv] = await Promise.all([
    transcriptFiles?.[0]
      ? supabase.storage.from("student-transcripts").createSignedUrl(`${studentUserId}/${transcriptFiles[0].name}`, 3600)
      : Promise.resolve({ data: null }),
    cvFiles?.[0]
      ? supabase.storage.from("transcripts").createSignedUrl(`cv/${studentUserId}/${cvFiles[0].name}`, 3600)
      : Promise.resolve({ data: null }),
  ]);
  transcriptUrl = signedTranscript.data?.signedUrl ?? null;
  cvUrl = signedCv.data?.signedUrl ?? null;

  const profile = application.profiles as { full_name: string | null; email: string };
  const student = application.student_profiles as Record<string, unknown>;
  const cycle = application.application_cycles as { title: string };
  const assocName = (association?.name as string) ?? "";
  const answers = application.application_answers as Array<{
    id: string; answer_text: string | null;
    application_questions: { question_text: string; question_type: string };
  }>;
  const statusEvents = application.application_status_events as Array<{
    id: string; previous_status: string | null; new_status: string; note: string | null;
    created_at: string; profiles: { full_name: string | null };
  }>;
  const notes = application.candidate_internal_notes as Array<{
    id: string; note_text: string; created_at: string; profiles: { full_name: string | null };
  }>;
  const ts = (student?.transcript_summary as Record<string, any>) ?? {};

  const blockMap = new Map<string, any>((blockRows ?? []).map((b: any) => [b.block_type, b]));
  const cardProps = {
    header: blockMap.has("header") ? { data: blockMap.get("header").prose_content, visibility: blockMap.get("header").visibility } : undefined,
    disponibilita: blockMap.has("disponibilita") ? { data: blockMap.get("disponibilita").prose_content } : undefined,
    esperienze: blockMap.has("esperienze") ? { data: blockMap.get("esperienze").prose_content } : undefined,
    formazione: blockMap.has("formazione") ? { data: blockMap.get("formazione").prose_content } : undefined,
    competenze: blockMap.has("competenze") ? { data: blockMap.get("competenze").prose_content } : undefined,
    lingue: blockMap.has("lingue") ? { data: blockMap.get("lingue").prose_content } : undefined,
    interessi: blockMap.has("interessi") ? { data: blockMap.get("interessi").prose_content } : undefined,
    autodescrizione: blockMap.has("autodescrizione") ? { data: blockMap.get("autodescrizione").prose_content } : undefined,
    pianoCarriera: blockMap.has("piano_carriera") ? { data: blockMap.get("piano_carriera").prose_content } : undefined,
    viewer: "associazioni" as const,
    displayName: profile?.full_name ?? undefined,
  };

  // I round del ciclo di questa candidatura: sono le opzioni di "convoca a colloquio".
  const { data: roundRows } = await (supabase.from("interview_sessions") as any)
    .select("id, title, round_index")
    .eq("application_cycle_id", (application as any).application_cycle_id)
    .order("round_index", { ascending: true });

  const { data: myInvites } = await (supabase.from("interview_invites") as any)
    .select("session_id, selected_time, location_or_link")
    .eq("application_id", applicationId);

  const invitedSessionIds = new Set(((myInvites ?? []) as any[]).map((i) => i.session_id));

  const rounds: RoundOption[] = ((roundRows ?? []) as any[]).map((r) => ({
    id: r.id,
    title: r.title,
    roundIndex: r.round_index,
    alreadyInvited: invitedSessionIds.has(r.id),
  }));

  // Una riga sola che dice a che punto è il colloquio, invece di far dedurre lo
  // stato da tre riquadri sparsi.
  const booked = ((myInvites ?? []) as any[]).find((i) => i.selected_time);
  const invitedNotBooked = ((myInvites ?? []) as any[]).some((i) => !i.selected_time);
  const interviewSummary = booked
    ? new Date(booked.selected_time).getTime() < Date.now()
      ? t("interviewDone", {
          date: new Date(booked.selected_time).toLocaleString(dateLocale, {
            timeZone: APP_TIME_ZONE,
            day: "numeric",
            month: "long",
            hour: "2-digit",
            minute: "2-digit",
          }),
        })
      : t("interviewBooked", {
          date: new Date(booked.selected_time).toLocaleString(dateLocale, {
            timeZone: APP_TIME_ZONE,
            weekday: "long",
            day: "numeric",
            month: "long",
            hour: "2-digit",
            minute: "2-digit",
          }),
        })
    : invitedNotBooked
      ? t("interviewInvitedNotBooked")
      : null;

  const noteList: CandidateNote[] = (notes ?? []).map((n) => ({
    id: n.id,
    text: n.note_text,
    authorName: n.profiles?.full_name ?? t("systemFallback"),
    createdAt: n.created_at,
  }));

  return (
    <div className="space-y-5">
      <Link
        href={`/association/${slug}/candidates`}
        className="text-body-sm text-ink-tertiary transition-colors hover:text-petrol"
      >
        &larr; {t("backToCandidates")}
      </Link>

      {/* Intestazione */}
      <div>
        <p className="text-eyebrow uppercase text-navy/60">{cycle?.title}</p>
        <h2 className="font-display text-display-md text-navy">
          {profile?.full_name ?? t("fallbackName")}
        </h2>
        <p className="text-body text-ink-secondary">{profile?.email}</p>
        {(application as any).selected_role_preferences?.[0] && (
          <p className="mt-1 text-body-sm font-medium text-petrol">
            {t("applyingFor", { role: (application as any).selected_role_preferences[0] })}
          </p>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-3">
          {transcriptUrl && (
            <a
              href={transcriptUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border border-border bg-white px-3 py-1 text-body-sm font-medium text-navy transition-colors duration-100 hover:border-navy hover:bg-navy-50"
            >
              {t("viewTranscript")}
            </a>
          )}
          {cvUrl && (
            <a
              href={cvUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border border-border bg-white px-3 py-1 text-body-sm font-medium text-navy transition-colors duration-100 hover:border-navy hover:bg-navy-50"
            >
              {t("viewCV")}
            </a>
          )}
        </div>
      </div>

      {/* Stato e cosa si può fare adesso */}
      <CandidateActions
        applicationId={applicationId}
        slug={slug}
        currentStatus={application.status}
        candidateName={profile?.full_name ?? ""}
        candidateEmail={profile?.email ?? ""}
        associationName={assocName}
        rounds={rounds}
        interviewSummary={interviewSummary}
      />

      {/* Risposte alla candidatura, quando ci sono domande */}
      {answers.length > 0 && (
        <div>
          <h3 className="font-sans text-h3 text-navy mb-3">{t("answersHeading")}</h3>
          <div className="space-y-3">
            {answers.map((a) => (
              <div key={a.id} className="rounded-lg border border-border bg-white p-5">
                <p className="text-label text-navy mb-1 text-xs">{a.application_questions?.question_text}</p>
                <p className="text-body-sm text-ink whitespace-pre-wrap">{a.answer_text ?? "—"}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* La card al centro: senza la colonna della valutazione AI, due colonne
          lasciavano un vuoto a destra. */}
      <div className="mx-auto w-full max-w-3xl">
        <MiraCardDocument {...cardProps} />
      </div>

      <CandidateNotes applicationId={applicationId} notes={noteList} dateLocale={dateLocale} />
    </div>
  );
}
