import { createServiceClient } from "@mira/supabase/server";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { APPLICATION_STATUS_LABELS } from "@mira/domain";
import { CandidateActions } from "./candidate-actions";
import { RegenerateEvaluationButton } from "./regenerate-evaluation-button";
import { CandidateCard } from "@/components/card-view/candidate-card";

interface Props {
  params: Promise<{ slug: string; applicationId: string }>;
}

export default async function CandidateDetailPage({ params }: Props) {
  const { slug, applicationId } = await params;
  const supabase = await createServiceClient();
  const t = await getTranslations("CandidateDetail");
  const locale = await getLocale();
  const dateLocale = locale === "it" ? "it-IT" : "en-US";

  const { data: association } = await (supabase.from("association_profiles") as any)
    .select("name")
    .eq("slug", slug)
    .single();

  const { data: application } = await (supabase.from("applications") as any)
    .select(`
      *,
      profiles(full_name, email),
      student_profiles(id, degree_program, degree_level, current_year, transcript_summary),
      application_cycles(title),
      application_answers(id, answer_text, answer_json, application_questions(question_text, question_type)),
      candidate_ai_evaluations(*),
      application_status_events(id, previous_status, new_status, note, created_at, profiles(full_name)),
      candidate_internal_notes(id, note_text, created_at, profiles(full_name))
    `)
    .eq("id", applicationId)
    .maybeSingle();

  if (!application) notFound();

  // Read files directly from Storage (uploaded_files table may not be populated)
  const studentUserId = (application as any).student_user_id as string;

  let transcriptUrl: string | null = null;
  let cvUrl: string | null = null;

  const { data: transcriptFiles } = await supabase.storage
    .from("student-transcripts")
    .list(studentUserId, { limit: 1, sortBy: { column: "created_at", order: "desc" } });

  if (transcriptFiles?.[0]) {
    const { data: signed } = await supabase.storage
      .from("student-transcripts")
      .createSignedUrl(`${studentUserId}/${transcriptFiles[0].name}`, 3600);
    transcriptUrl = signed?.signedUrl ?? null;
  }

  const { data: cvFiles } = await supabase.storage
    .from("transcripts")
    .list(`cv/${studentUserId}`, { limit: 1, sortBy: { column: "created_at", order: "desc" } });

  if (cvFiles?.[0]) {
    const { data: signed } = await supabase.storage
      .from("transcripts")
      .createSignedUrl(`cv/${studentUserId}/${cvFiles[0].name}`, 3600);
    cvUrl = signed?.signedUrl ?? null;
  }

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
  const aiEval = (application.candidate_ai_evaluations as Array<Record<string, unknown>>)?.[0];
  const ts = (student?.transcript_summary as Record<string, any>) ?? {};

  // Card: solo blocchi approved, esplicito (il service client bypassa RLS).
  const studentProfileId = (student as any)?.id as string | undefined;
  const { data: blockRows } = studentProfileId
    ? await (supabase.from("card_blocks") as any)
        .select("block_type, prose_content, visibility")
        .eq("student_profile_id", studentProfileId)
        .eq("status", "approved")
    : { data: [] };

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
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-eyebrow text-navy/60 uppercase mb-1">{cycle?.title}</p>
          <h2 className="font-display text-display-md text-navy">
            {profile?.full_name ?? t("fallbackName")}
          </h2>
          <p className="text-body text-ink-secondary">{profile?.email}</p>
          {(application as any).selected_role_preferences?.[0] && (
            <p className="mt-1 text-body-sm font-medium text-petrol">
              {t("applyingFor", { role: (application as any).selected_role_preferences[0] })}
            </p>
          )}
          <div className="mt-2 flex items-center gap-3 text-body-sm text-ink-tertiary flex-wrap">
            <span>{(student?.degree_program as string) ?? "—"}</span>
            {student?.current_year && <span>· {t("yearOrdinal", { n: student.current_year as number })}</span>}
            {student?.degree_level && <span>· {student.degree_level as string}</span>}
            {transcriptUrl && (
              <a
                href={transcriptUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md border border-border bg-white text-navy text-body-sm font-medium hover:border-navy hover:bg-navy-50 transition-colors duration-100"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                </svg>
                {t("viewTranscript")}
              </a>
            )}
            {cvUrl && (
              <a
                href={cvUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md border border-border bg-white text-navy text-body-sm font-medium hover:border-navy hover:bg-navy-50 transition-colors duration-100"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                </svg>
                {t("viewCV")}
              </a>
            )}
          </div>
        </div>
        <CandidateActions applicationId={applicationId} currentStatus={application.status} candidateEmail={profile?.email} candidateName={profile?.full_name} associationName={assocName} />
      </div>

      {/* Application answers — always first */}
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

      {/* Main 2-column layout: profile (CV) + MIRA analysis */}
      <div className="grid gap-6 lg:grid-cols-2">

        {/* LEFT — MIRA Card (solo blocchi approved, filtrata per visibilità) */}
        <div className="space-y-4">
          <h3 className="font-sans text-h3 text-navy">{t("miraCardHeading")}</h3>
          <CandidateCard {...cardProps} />
        </div>

        {/* RIGHT — Per questa candidatura (generato al volo, mai un giudizio permanente) */}
        <div className="space-y-4">
          <h3 className="font-sans text-h3 text-navy">{t("forThisApplicationHeading")}</h3>

          {!aiEval ? (
            <RegenerateEvaluationButton applicationId={applicationId} />
          ) : (() => {
            const ev = (aiEval.evaluation_json ?? aiEval) as {
              rilevanza?: Array<{ claim: string; evidenza: string }>;
              gap?: string[];
              domande_colloquio?: string[];
            };

            return (
              <div className="space-y-4">
                <div className="rounded-lg border border-border bg-white p-5">
                  <p className="text-label text-navy text-xs mb-3">{t("whyRelevant")}</p>
                  {ev.rilevanza?.length ? (
                    <div className="space-y-2">
                      {ev.rilevanza.slice(0, 3).map((r, i) => (
                        <div key={i}>
                          <p className="text-body-sm text-ink">{r.claim}</p>
                          <p className="text-xs text-ink-tertiary">— {r.evidenza}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-body-sm text-ink-secondary">{t("noEvidence")}</p>
                  )}
                </div>

                <div className="rounded-lg border border-border bg-white p-5">
                  <p className="text-label text-navy text-xs mb-2">{t("whatWeDontKnow")}</p>
                  <ul className="space-y-1">
                    {(ev.gap ?? []).map((g, i) => (
                      <li key={i} className="text-body-sm text-ink">• {g}</li>
                    ))}
                  </ul>
                </div>

                {ev.domande_colloquio?.length ? (
                  <div className="rounded-lg border border-border bg-white p-5">
                    <p className="text-label text-navy text-xs mb-2">{t("interviewQuestions")}</p>
                    <ol className="space-y-1.5">
                      {ev.domande_colloquio.map((q, i) => (
                        <li key={i} className="text-body-sm text-ink"><span className="text-ink-tertiary mr-1">{i + 1}.</span>{q}</li>
                      ))}
                    </ol>
                  </div>
                ) : null}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Sidebar: status, timeline, notes */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-lg border border-border bg-white p-5">
          <h3 className="font-sans text-h3 text-navy mb-3">{t("statusHeading")}</h3>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-body-sm font-medium ${
            application.status === "accepted" ? "bg-success-bg text-success"
            : application.status === "rejected" ? "bg-error-bg text-error"
            : "bg-petrol-50 text-petrol-700"
          }`}>
            {APPLICATION_STATUS_LABELS[application.status] ?? application.status}
          </span>
        </div>

        <div className="rounded-lg border border-border bg-white p-5">
          <h3 className="font-sans text-h3 text-navy mb-3">{t("historyHeading")}</h3>
          <div className="space-y-3">
            {statusEvents.map((ev) => (
              <div key={ev.id} className="text-body-sm">
                <p className="text-ink">{APPLICATION_STATUS_LABELS[ev.new_status] ?? ev.new_status}</p>
                <p className="text-ink-tertiary">{ev.profiles?.full_name ?? t("systemFallback")} · {new Date(ev.created_at).toLocaleDateString(dateLocale)}</p>
                {ev.note && <p className="text-ink-secondary mt-1 italic">{ev.note}</p>}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-white p-5">
          <h3 className="font-sans text-h3 text-navy mb-3">{t("notesHeading")}</h3>
          {notes.length === 0 ? (
            <p className="text-body-sm text-ink-tertiary">{t("noNotes")}</p>
          ) : (
            <div className="space-y-3">
              {notes.map((n) => (
                <div key={n.id} className="text-body-sm">
                  <p className="text-ink">{n.note_text}</p>
                  <p className="text-ink-tertiary mt-1">{n.profiles?.full_name} · {new Date(n.created_at).toLocaleDateString(dateLocale)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
