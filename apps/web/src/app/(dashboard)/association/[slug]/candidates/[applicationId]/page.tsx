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

  const { data: association } = await (supabase.from("association_profiles") as any)
    .select("name")
    .eq("slug", slug)
    .single();

  const { data: application } = await (supabase.from("applications") as any)
    .select(`
      *,
      profiles(full_name, email),
      student_profiles(degree_program, degree_level, current_year, interests, goals, experiences, profile_summary, availability, transcript_summary, onboarding_answers),
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
          {(application as any).selected_role_preferences?.[0] && (
            <p className="mt-1 text-body-sm font-medium text-petrol">
              Candidatura per: {(application as any).selected_role_preferences[0]}
            </p>
          )}
          <div className="mt-2 flex gap-3 text-body-sm text-ink-tertiary">
            <span>{(student?.degree_program as string) ?? "—"}</span>
            {student?.current_year && <span>· {student.current_year as number}° anno</span>}
            {student?.degree_level && <span>· {student.degree_level as string}</span>}
          </div>
        </div>
        <CandidateActions applicationId={applicationId} currentStatus={application.status} candidateEmail={profile?.email} candidateName={profile?.full_name} associationName={assocName} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Application answers */}
          {answers.length > 0 && (
            <div>
              <h3 className="font-sans text-h3 text-navy mb-4">Risposte candidatura</h3>
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

          {/* AI Evaluation — narrative format */}
          {aiEval && (() => {
            const ev = (aiEval.evaluation_json ?? aiEval) as Record<string, any>;
            const fitColor = (cat: string) =>
              cat === "strong_fit" ? "bg-success-bg text-success"
              : cat === "good_fit" ? "bg-petrol-50 text-petrol-700"
              : cat === "uncertain_fit" ? "bg-warning-bg text-warning"
              : "bg-error-bg text-error";
            const fitLabel = (cat: string) =>
              cat === "strong_fit" ? "Strong fit"
              : cat === "good_fit" ? "Good fit"
              : cat === "uncertain_fit" ? "Da valutare"
              : "Weak fit";

            const posRec = ev.position_recommendation as { candidate_selected?: string; ai_recommended?: string; match?: boolean; explanation?: string } | null;

            return (
              <div className="space-y-5">
                {/* Synthesis + fit badge */}
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="font-sans text-h3 text-navy">Scheda MIRA</h3>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-body-sm font-medium ${fitColor(ev.overall_fit_category)}`}>
                      {fitLabel(ev.overall_fit_category)}
                    </span>
                  </div>
                  {ev.candidate_synthesis && (
                    <div className="rounded-lg border border-border bg-white p-5">
                      <p className="text-body text-ink whitespace-pre-wrap">{ev.candidate_synthesis}</p>
                    </div>
                  )}
                </div>

                {/* Association fit */}
                {ev.association_fit && (
                  <div>
                    <h4 className="text-label text-navy mb-2">Fit con {assocName}</h4>
                    <div className="rounded-lg border border-border bg-white p-5 space-y-3">
                      <p className="text-body-sm text-ink whitespace-pre-wrap">{ev.association_fit}</p>
                      {(ev.fit_strengths?.length > 0 || ev.fit_gaps?.length > 0) && (
                        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
                          {ev.fit_strengths?.length > 0 && (
                            <div>
                              <p className="text-eyebrow text-success uppercase text-[10px] mb-1">Punti di forza</p>
                              <ul className="space-y-1">
                                {ev.fit_strengths.map((s: string, i: number) => (
                                  <li key={i} className="text-body-sm text-ink">• {s}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {ev.fit_gaps?.length > 0 && (
                            <div>
                              <p className="text-eyebrow text-warning uppercase text-[10px] mb-1">Da approfondire</p>
                              <ul className="space-y-1">
                                {ev.fit_gaps.map((g: string, i: number) => (
                                  <li key={i} className="text-body-sm text-ink">• {g}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Position recommendation */}
                {posRec && (
                  <div>
                    <h4 className="text-label text-navy mb-2">Raccomandazione posizione</h4>
                    <div className="rounded-lg border border-border bg-white p-5 space-y-2">
                      <div className="flex items-center gap-3 text-body-sm">
                        <span className="text-ink-tertiary">Scelta del candidato:</span>
                        <span className="font-medium text-ink">{posRec.candidate_selected}</span>
                      </div>
                      {posRec.ai_recommended && posRec.ai_recommended !== posRec.candidate_selected && (
                        <div className="flex items-center gap-3 text-body-sm">
                          <span className="text-ink-tertiary">Consigliata da MIRA:</span>
                          <span className="font-medium text-petrol">{posRec.ai_recommended}</span>
                        </div>
                      )}
                      {posRec.match === true && (
                        <div className="flex items-center gap-2 text-body-sm text-success">
                          <span>&#10003;</span>
                          <span>La scelta del candidato è coerente</span>
                        </div>
                      )}
                      {posRec.explanation && (
                        <p className="text-body-sm text-ink-secondary pt-1">{posRec.explanation}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Key evidence */}
                {ev.key_evidence?.length > 0 && (
                  <div>
                    <h4 className="text-label text-navy mb-2">Evidenze principali</h4>
                    <div className="space-y-2">
                      {ev.key_evidence.map((e: { title: string; description: string }, i: number) => (
                        <div key={i} className="rounded-lg border border-border bg-white p-5">
                          <p className="text-label text-navy text-xs mb-1">{e.title}</p>
                          <p className="text-body-sm text-ink">{e.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Competencies */}
                {(ev.academic_competencies?.length > 0 || ev.practical_competencies?.length > 0) && (
                  <div>
                    <h4 className="text-label text-navy mb-2">Competenze</h4>
                    <div className="rounded-lg border border-border bg-white p-5 space-y-4">
                      {ev.academic_competencies?.length > 0 && (
                        <div>
                          <p className="text-eyebrow text-navy/60 uppercase text-[10px] mb-2">Accademiche</p>
                          <div className="space-y-2">
                            {ev.academic_competencies.map((c: { area: string; description: string }, i: number) => (
                              <div key={i}>
                                <p className="text-body-sm font-medium text-ink">{c.area}</p>
                                <p className="text-body-sm text-ink-secondary">{c.description}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {ev.practical_competencies?.length > 0 && (
                        <div className={ev.academic_competencies?.length > 0 ? "pt-3 border-t border-border" : ""}>
                          <p className="text-eyebrow text-navy/60 uppercase text-[10px] mb-2">Pratiche</p>
                          <div className="space-y-2">
                            {ev.practical_competencies.map((c: { area: string; description: string }, i: number) => (
                              <div key={i}>
                                <p className="text-body-sm font-medium text-ink">{c.area}</p>
                                <p className="text-body-sm text-ink-secondary">{c.description}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Competencies to verify */}
                {ev.competencies_to_verify && (
                  <div>
                    <h4 className="text-label text-navy mb-2">Competenze da verificare</h4>
                    <div className="rounded-lg border border-border bg-white p-5">
                      <p className="text-body-sm text-ink whitespace-pre-wrap">{ev.competencies_to_verify}</p>
                    </div>
                  </div>
                )}

                {/* Attitude */}
                {ev.attitude_description && (
                  <div>
                    <h4 className="text-label text-navy mb-2">Attitudine e stile di lavoro</h4>
                    <div className="rounded-lg border border-border bg-white p-5">
                      <p className="text-body-sm text-ink whitespace-pre-wrap">{ev.attitude_description}</p>
                    </div>
                  </div>
                )}

                {/* Application quality */}
                {ev.application_quality && (
                  <div>
                    <h4 className="text-label text-navy mb-2">Qualità risposte candidatura</h4>
                    <div className="rounded-lg border border-border bg-white p-5">
                      <p className="text-body-sm text-ink whitespace-pre-wrap">{ev.application_quality}</p>
                    </div>
                  </div>
                )}

                {/* Interview questions */}
                {ev.interview_questions?.length > 0 && (
                  <div>
                    <h4 className="text-label text-navy mb-2">Domande consigliate per il colloquio</h4>
                    <div className="rounded-lg border border-border bg-white p-5">
                      <ul className="space-y-2">
                        {ev.interview_questions.map((q: string, i: number) => (
                          <li key={i} className="text-body-sm text-ink">
                            <span className="text-ink-tertiary mr-2">{i + 1}.</span>{q}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Suggested roles */}
                {ev.suggested_roles && (
                  <div>
                    <h4 className="text-label text-navy mb-2">Ruoli suggeriti</h4>
                    <div className="rounded-lg border border-border bg-white p-5">
                      <p className="text-body-sm text-ink whitespace-pre-wrap">{ev.suggested_roles}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Student profile data — collapsible raw data section */}
          <details className="group">
            <summary className="cursor-pointer text-label text-navy/60 hover:text-navy py-2 flex items-center gap-2">
              <span className="text-xs transition-transform group-open:rotate-90">&#9654;</span>
              Dati profilo completo
            </summary>
            <div className="space-y-4 mt-3">
              {student?.profile_summary && (
                <div className="rounded-lg border border-border bg-white p-5">
                  <p className="text-eyebrow text-navy/60 uppercase text-[10px] mb-2">Riassunto profilo</p>
                  <p className="text-body-sm text-ink whitespace-pre-wrap">{student.profile_summary as string}</p>
                </div>
              )}

              <div className="rounded-lg border border-border bg-white p-5 space-y-3">
                <p className="text-eyebrow text-navy/60 uppercase text-[10px]">Percorso accademico</p>
                <div className="grid grid-cols-2 gap-3 text-body-sm">
                  {student?.degree_program && <div><span className="text-ink-tertiary">Corso:</span> <span className="text-ink">{student.degree_program as string}</span></div>}
                  {student?.degree_level && <div><span className="text-ink-tertiary">Livello:</span> <span className="text-ink">{student.degree_level as string}</span></div>}
                  {student?.current_year && <div><span className="text-ink-tertiary">Anno:</span> <span className="text-ink">{student.current_year as number}°</span></div>}
                  {(student as any)?.transcript_summary?.weighted_average && (
                    <div><span className="text-ink-tertiary">Media:</span> <span className="text-ink">{(student as any).transcript_summary.weighted_average}/30</span></div>
                  )}
                </div>
              </div>

              {(student?.experiences as string[])?.length > 0 && (
                <div className="rounded-lg border border-border bg-white p-5">
                  <p className="text-eyebrow text-navy/60 uppercase text-[10px] mb-2">Esperienze</p>
                  <ul className="space-y-1">
                    {(student.experiences as string[]).map((exp, i) => (
                      <li key={i} className="text-body-sm text-ink">• {exp}</li>
                    ))}
                  </ul>
                </div>
              )}

              {((student?.interests as string[])?.length > 0 || (student?.goals as string[])?.length > 0) && (
                <div className="rounded-lg border border-border bg-white p-5 space-y-3">
                  {(student?.interests as string[])?.length > 0 && (
                    <div>
                      <p className="text-eyebrow text-navy/60 uppercase text-[10px] mb-1">Interessi</p>
                      <div className="flex flex-wrap gap-1.5">
                        {(student.interests as string[]).map((int, i) => (
                          <span key={i} className="px-2 py-0.5 rounded-full text-xs bg-navy-50 text-navy">{int}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {(student?.goals as string[])?.length > 0 && (
                    <div>
                      <p className="text-eyebrow text-navy/60 uppercase text-[10px] mb-1">Obiettivi</p>
                      <ul className="space-y-1">
                        {(student.goals as string[]).map((g, i) => (
                          <li key={i} className="text-body-sm text-ink">• {g}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </details>
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
