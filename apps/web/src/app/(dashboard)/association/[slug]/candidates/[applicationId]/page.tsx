import { createServiceClient } from "@mira/supabase/server";
import { notFound } from "next/navigation";
import { APPLICATION_STATUS_LABELS } from "@mira/domain";
import { CandidateActions } from "./candidate-actions";

interface Props {
  params: Promise<{ slug: string; applicationId: string }>;
}

export default async function CandidateDetailPage({ params }: Props) {
  const { slug, applicationId } = await params;
  const supabase = await createServiceClient();

  const { data: application } = await (supabase.from("applications") as any)
    .select(`
      *,
      profiles(full_name, email),
      student_profiles(degree_program, degree_level, current_year, interests, goals, experiences, profile_summary, onboarding_answers),
      application_cycles(title),
      application_answers(id, answer_text, answer_json, application_questions(question_text, question_type)),
      candidate_ai_evaluations(*),
      application_status_events(id, previous_status, new_status, note, created_at, profiles(full_name)),
      candidate_internal_notes(id, note_text, created_at, profiles(full_name))
    `)
    .eq("id", applicationId)
    .maybeSingle();

  if (!application) notFound();

  const profile = application.profiles as { full_name: string | null; email: string };
  const student = application.student_profiles as Record<string, unknown>;
  const cycle = application.application_cycles as { title: string };
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-eyebrow text-navy/60 uppercase mb-1">{cycle?.title}</p>
          <h2 className="font-display text-display-md text-navy">
            {profile?.full_name ?? "Candidato"}
          </h2>
          <p className="text-body text-ink-secondary">{profile?.email}</p>
          <div className="mt-2 flex gap-3 text-body-sm text-ink-tertiary">
            <span>{(student?.degree_program as string) ?? "—"}</span>
            {student?.current_year && <span>· {student.current_year as number}° anno</span>}
            {student?.degree_level && <span>· {student.degree_level as string}</span>}
          </div>
        </div>
        <CandidateActions applicationId={applicationId} currentStatus={application.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Answers */}
          <div>
            <h3 className="font-sans text-h3 text-navy mb-4">Risposte</h3>
            {answers.length === 0 ? (
              <p className="text-body text-ink-secondary">Nessuna risposta</p>
            ) : (
              <div className="space-y-4">
                {answers.map((a) => (
                  <div key={a.id} className="rounded-lg border border-border bg-white p-6">
                    <p className="text-label text-navy mb-2">
                      {a.application_questions?.question_text}
                    </p>
                    <p className="text-body text-ink whitespace-pre-wrap">
                      {a.answer_text ?? "—"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Student profile summary */}
          {student?.profile_summary && (
            <div>
              <h3 className="font-sans text-h3 text-navy mb-4">Profilo studente</h3>
              <div className="rounded-lg border border-border bg-white p-6">
                <p className="text-body text-ink whitespace-pre-wrap">
                  {student.profile_summary as string}
                </p>
              </div>
            </div>
          )}

          {/* AI Evaluation */}
          {aiEval && (
            <div>
              <h3 className="font-sans text-h3 text-navy mb-4">Valutazione AI</h3>
              <div className="rounded-lg border border-border bg-white p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-body-sm font-medium ${
                    aiEval.overall_fit_category === "strong_fit" ? "bg-success-bg text-success"
                    : aiEval.overall_fit_category === "good_fit" ? "bg-petrol-50 text-petrol-700"
                    : aiEval.overall_fit_category === "uncertain_fit" ? "bg-warning-bg text-warning"
                    : "bg-error-bg text-error"
                  }`}>
                    {(aiEval.overall_fit_category as string)?.replace("_", " ")}
                  </span>
                  <span className="text-body-sm text-ink-tertiary">
                    Confidenza: {aiEval.confidence as string}
                  </span>
                </div>
                {aiEval.fit_summary && (
                  <p className="text-body text-ink">{aiEval.fit_summary as string}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status */}
          <div className="rounded-lg border border-border bg-white p-6">
            <h3 className="font-sans text-h3 text-navy mb-3">Stato</h3>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-body-sm font-medium ${
              application.status === "accepted" ? "bg-success-bg text-success"
              : application.status === "rejected" ? "bg-error-bg text-error"
              : "bg-petrol-50 text-petrol-700"
            }`}>
              {APPLICATION_STATUS_LABELS[application.status] ?? application.status}
            </span>
          </div>

          {/* Timeline */}
          <div className="rounded-lg border border-border bg-white p-6">
            <h3 className="font-sans text-h3 text-navy mb-3">Cronologia</h3>
            <div className="space-y-3">
              {statusEvents.map((ev) => (
                <div key={ev.id} className="text-body-sm">
                  <p className="text-ink">
                    {APPLICATION_STATUS_LABELS[ev.new_status] ?? ev.new_status}
                  </p>
                  <p className="text-ink-tertiary">
                    {ev.profiles?.full_name ?? "Sistema"} · {new Date(ev.created_at).toLocaleDateString("it-IT")}
                  </p>
                  {ev.note && <p className="text-ink-secondary mt-1 italic">{ev.note}</p>}
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="rounded-lg border border-border bg-white p-6">
            <h3 className="font-sans text-h3 text-navy mb-3">Note interne</h3>
            {notes.length === 0 ? (
              <p className="text-body-sm text-ink-tertiary">Nessuna nota</p>
            ) : (
              <div className="space-y-3">
                {notes.map((n) => (
                  <div key={n.id} className="text-body-sm">
                    <p className="text-ink">{n.note_text}</p>
                    <p className="text-ink-tertiary mt-1">
                      {n.profiles?.full_name} · {new Date(n.created_at).toLocaleDateString("it-IT")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
