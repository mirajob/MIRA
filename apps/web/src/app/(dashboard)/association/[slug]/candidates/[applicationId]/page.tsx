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
        <CandidateActions applicationId={applicationId} currentStatus={application.status} candidateEmail={profile?.email} candidateName={profile?.full_name} associationName={association?.name} />
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

          {/* Student profile — full structured view for associations */}
          <div>
            <h3 className="font-sans text-h3 text-navy mb-4">Profilo studente</h3>
            <div className="space-y-4">
              {student?.profile_summary && (
                <div className="rounded-lg border border-border bg-white p-5">
                  <p className="text-body text-ink whitespace-pre-wrap">{student.profile_summary as string}</p>
                </div>
              )}

              {/* Academic info */}
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

              {/* Experiences */}
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

              {/* Interests & Goals */}
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

              {/* Structured data from availability (career targets, work style, etc.) */}
              {(() => {
                const avail = (student as any)?.availability as Record<string, any> | null;
                if (!avail) return null;

                const ct = avail.career_targets;
                const cp = avail.career_plan;
                const ws = avail.work_style;
                const pd = avail.previous_degree;
                const pi = avail.personal_interests;

                const hasCareerTargets = ct && (ct.roles?.length || ct.sectors?.length || ct.companies?.length || ct.geography?.length);
                const hasCareerPlan = cp && (cp.short_term || cp.medium_term || cp.clarity_level);
                const hasWorkStyle = ws && (ws.leadership || ws.style || ws.strengths?.length);
                const hasPrevDegree = pd && (pd.university || pd.program);

                if (!hasCareerTargets && !hasCareerPlan && !hasWorkStyle && !hasPrevDegree && !pi?.length) return null;

                return (
                  <>
                    {hasPrevDegree && (
                      <div className="rounded-lg border border-border bg-white p-5">
                        <p className="text-eyebrow text-navy/60 uppercase text-[10px] mb-2">Percorso precedente</p>
                        <div className="text-body-sm text-ink space-y-1">
                          {pd.university && <p><span className="text-ink-tertiary">Università:</span> {pd.university}</p>}
                          {pd.program && <p><span className="text-ink-tertiary">Corso:</span> {pd.program}</p>}
                          {pd.grade && <p><span className="text-ink-tertiary">Voto:</span> {pd.grade}</p>}
                          {pd.thesis_topic && <p><span className="text-ink-tertiary">Tesi:</span> {pd.thesis_topic}</p>}
                        </div>
                      </div>
                    )}

                    {hasCareerTargets && (
                      <div className="rounded-lg border border-border bg-white p-5">
                        <p className="text-eyebrow text-navy/60 uppercase text-[10px] mb-2">Target di carriera</p>
                        <div className="text-body-sm space-y-2">
                          {ct.roles?.length > 0 && (
                            <div><span className="text-ink-tertiary">Ruoli:</span> <span className="text-ink">{ct.roles.join(", ")}</span></div>
                          )}
                          {ct.sectors?.length > 0 && (
                            <div><span className="text-ink-tertiary">Settori:</span> <span className="text-ink">{ct.sectors.join(", ")}</span></div>
                          )}
                          {ct.companies?.length > 0 && (
                            <div><span className="text-ink-tertiary">Aziende:</span> <span className="text-ink">{ct.companies.join(", ")}</span></div>
                          )}
                          {ct.geography?.length > 0 && (
                            <div><span className="text-ink-tertiary">Geografie:</span> <span className="text-ink">{ct.geography.join(", ")}</span></div>
                          )}
                        </div>
                      </div>
                    )}

                    {hasCareerPlan && (
                      <div className="rounded-lg border border-border bg-white p-5">
                        <p className="text-eyebrow text-navy/60 uppercase text-[10px] mb-2">Piano carriera</p>
                        <div className="text-body-sm text-ink space-y-1">
                          {cp.short_term && <p><span className="text-ink-tertiary">Breve termine:</span> {cp.short_term}</p>}
                          {cp.medium_term && <p><span className="text-ink-tertiary">Medio termine:</span> {cp.medium_term}</p>}
                          {cp.exchange_interest && <p><span className="text-ink-tertiary">Exchange:</span> {cp.exchange_interest}</p>}
                          {cp.masters_interest && <p><span className="text-ink-tertiary">Magistrale:</span> {cp.masters_interest}</p>}
                          {cp.clarity_level && <p><span className="text-ink-tertiary">Chiarezza:</span> {cp.clarity_level}</p>}
                        </div>
                      </div>
                    )}

                    {hasWorkStyle && (
                      <div className="rounded-lg border border-border bg-white p-5">
                        <p className="text-eyebrow text-navy/60 uppercase text-[10px] mb-2">Stile di lavoro</p>
                        <div className="text-body-sm text-ink space-y-1">
                          {ws.leadership && <p><span className="text-ink-tertiary">Leadership:</span> {ws.leadership}</p>}
                          {ws.teamwork_preference && <p><span className="text-ink-tertiary">Teamwork:</span> {ws.teamwork_preference}</p>}
                          {ws.style && <p><span className="text-ink-tertiary">Stile:</span> {ws.style}</p>}
                          {ws.communication && <p><span className="text-ink-tertiary">Comunicazione:</span> {ws.communication}</p>}
                          {ws.strengths?.length > 0 && <p><span className="text-ink-tertiary">Punti di forza:</span> {ws.strengths.join(", ")}</p>}
                          {ws.improvements?.length > 0 && <p><span className="text-ink-tertiary">Da migliorare:</span> {ws.improvements.join(", ")}</p>}
                        </div>
                      </div>
                    )}

                    {pi?.length > 0 && (
                      <div className="rounded-lg border border-border bg-white p-5">
                        <p className="text-eyebrow text-navy/60 uppercase text-[10px] mb-2">Interessi personali</p>
                        <div className="flex flex-wrap gap-1.5">
                          {pi.map((p: string, i: number) => (
                            <span key={i} className="px-2 py-0.5 rounded-full text-xs bg-petrol-50 text-petrol-700">{p}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>

          {/* AI Evaluation */}
          {aiEval && (() => {
            const evalJson = (aiEval.evaluation_json ?? aiEval) as Record<string, any>;
            const fitColor = (cat: string) =>
              cat === "strong_fit" ? "bg-success-bg text-success"
              : cat === "good_fit" ? "bg-petrol-50 text-petrol-700"
              : cat === "uncertain_fit" ? "bg-warning-bg text-warning"
              : "bg-error-bg text-error";

            return (
              <div>
                <h3 className="font-sans text-h3 text-navy mb-4">Valutazione AI</h3>
                <div className="rounded-lg border border-border bg-white p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-body-sm font-medium ${fitColor(aiEval.overall_fit_category as string)}`}>
                      Generale: {(aiEval.overall_fit_category as string)?.replace("_", " ")}
                    </span>
                    <span className="text-body-sm text-ink-tertiary">
                      Confidenza: {aiEval.confidence as string}
                    </span>
                  </div>

                  {(evalJson.overall_fit_summary || aiEval.fit_summary) && (
                    <p className="text-body text-ink">{(evalJson.overall_fit_summary || aiEval.fit_summary) as string}</p>
                  )}

                  {evalJson.position_fit && Object.keys(evalJson.position_fit).length > 0 && (
                    <div>
                      <p className="text-label text-navy text-xs mb-2">Fit per posizione</p>
                      <div className="space-y-2">
                        {Object.entries(evalJson.position_fit).map(([pos, data]: [string, any]) => (
                          <div key={pos} className="flex items-start gap-2">
                            <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${fitColor(data.fit_category)}`}>
                              {data.fit_category?.replace("_", " ")}
                            </span>
                            <div>
                              <p className="text-body-sm font-medium text-navy">{pos}</p>
                              {data.reason && <p className="text-body-sm text-ink-secondary">{data.reason}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {evalJson.alternative_positions?.length > 0 && (
                    <div>
                      <p className="text-label text-navy text-xs mb-2">Posizioni alternative suggerite</p>
                      <div className="space-y-2">
                        {evalJson.alternative_positions.map((alt: any, i: number) => (
                          <div key={i} className="flex items-start gap-2">
                            <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${fitColor(alt.fit_category)}`}>
                              {alt.fit_category?.replace("_", " ")}
                            </span>
                            <div>
                              <p className="text-body-sm font-medium text-navy">{alt.name}</p>
                              {alt.reason && <p className="text-body-sm text-ink-secondary">{alt.reason}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {evalJson.suggested_position && (
                    <p className="text-body-sm text-petrol font-medium">
                      Posizione suggerita: {evalJson.suggested_position}
                    </p>
                  )}
                </div>
              </div>
            );
          })()}
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
