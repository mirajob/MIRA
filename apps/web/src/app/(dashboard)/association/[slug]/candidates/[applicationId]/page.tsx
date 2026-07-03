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
      student_profiles(degree_program, degree_level, current_year, interests, goals, experiences, profile_summary, availability, transcript_summary, onboarding_answers, privacy_settings),
      application_cycles(title),
      application_answers(id, answer_text, answer_json, application_questions(question_text, question_type)),
      candidate_ai_evaluations(*),
      application_status_events(id, previous_status, new_status, note, created_at, profiles(full_name)),
      candidate_internal_notes(id, note_text, created_at, profiles(full_name))
    `)
    .eq("id", applicationId)
    .maybeSingle();

  if (!application) notFound();

  // Fetch transcript (libretto) and CV from storage, generate 1-hour signed URLs
  const studentUserId = (application as any).student_user_id as string;

  const { data: transcriptFile } = await (supabase.from("uploaded_files") as any)
    .select("file_path, bucket")
    .eq("owner_user_id", studentUserId)
    .eq("bucket", "student-transcripts")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: cvFile } = await (supabase.from("uploaded_files") as any)
    .select("file_path, bucket")
    .eq("owner_user_id", studentUserId)
    .eq("bucket", "transcripts")
    .eq("linked_entity_type", "student_cv")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let transcriptUrl: string | null = null;
  if (transcriptFile) {
    const { data: signed } = await supabase.storage
      .from("student-transcripts")
      .createSignedUrl(transcriptFile.file_path, 3600);
    transcriptUrl = signed?.signedUrl ?? null;
  }

  let cvUrl: string | null = null;
  if (cvFile) {
    const { data: signed } = await supabase.storage
      .from("transcripts")
      .createSignedUrl(cvFile.file_path, 3600);
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

  // Student profile data
  const ts = (student?.transcript_summary as Record<string, any>) ?? {};
  const avail = (student?.availability as Record<string, any>) ?? {};
  const privacy = (student?.privacy_settings as Record<string, boolean>) ?? {};
  const showGrades = privacy.show_grades_to_associations === true;
  const ws = avail.work_style ?? {};
  const ct = avail.career_targets ?? {};
  const cp = avail.career_plan ?? {};
  const pd = avail.previous_degree ?? {};
  const pi = avail.personal_interests ?? [];

  return (
    <div className="space-y-6">
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
          <div className="mt-2 flex items-center gap-3 text-body-sm text-ink-tertiary flex-wrap">
            <span>{(student?.degree_program as string) ?? "—"}</span>
            {student?.current_year && <span>· {student.current_year as number}° anno</span>}
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
                Vedi Libretto
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
                Vedi CV
              </a>
            )}
          </div>
        </div>
        <CandidateActions applicationId={applicationId} currentStatus={application.status} candidateEmail={profile?.email} candidateName={profile?.full_name} associationName={assocName} />
      </div>

      {/* Application answers — always first */}
      {answers.length > 0 && (
        <div>
          <h3 className="font-sans text-h3 text-navy mb-3">Risposte candidatura</h3>
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

        {/* LEFT — Profile as CV */}
        <div className="space-y-4">
          <h3 className="font-sans text-h3 text-navy">Profilo studente</h3>

          {/* Academic */}
          <div className="rounded-lg border border-border bg-white p-5 space-y-3">
            <p className="text-eyebrow text-navy/60 uppercase text-[10px]">Percorso accademico</p>
            <div className="grid grid-cols-2 gap-2 text-body-sm">
              {(() => {
                const prog = (student?.degree_program as string) || (ts?.degree_program as string);
                return prog ? <div className="col-span-2"><span className="text-ink-tertiary">Corso:</span> <span className="text-ink">{prog}</span></div> : null;
              })()}
              {student?.degree_level && <div><span className="text-ink-tertiary">Livello:</span> <span className="text-ink">{student.degree_level as string}</span></div>}
              {student?.current_year && <div><span className="text-ink-tertiary">Anno:</span> <span className="text-ink">{student.current_year as number}°</span></div>}
              {showGrades && ts?.weighted_average && <div><span className="text-ink-tertiary">Media:</span> <span className="text-ink font-medium">{ts.weighted_average}/30</span></div>}
              {ts?.total_credits && <div><span className="text-ink-tertiary">Crediti:</span> <span className="text-ink">{ts.total_credits} CFU</span></div>}
            </div>
            {showGrades && ts?.courses?.length > 0 && (() => {
              const graded = ts.courses.filter((c: any) => c.grade_numeric >= 28).slice(0, 5);
              return graded.length > 0 ? (
                <div className="pt-2 border-t border-border">
                  <p className="text-[10px] text-ink-tertiary mb-1">Voti migliori</p>
                  <div className="flex flex-wrap gap-1.5">
                    {graded.map((c: any, i: number) => (
                      <span key={i} className="text-xs px-2 py-0.5 rounded bg-success-bg text-success font-medium">
                        {c.course_name} — {c.grade}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null;
            })()}
            {!showGrades && (
              <p className="text-[10px] text-ink-tertiary italic pt-1 border-t border-border">
                Media e voti non condivisi dallo studente
              </p>
            )}
          </div>

          {/* Previous degree (magistrale) */}
          {pd.university && (
            <div className="rounded-lg border border-border bg-white p-5">
              <p className="text-eyebrow text-navy/60 uppercase text-[10px] mb-2">Triennale precedente</p>
              <div className="space-y-1 text-body-sm text-ink">
                <p><span className="text-ink-tertiary">Università:</span> {pd.university}</p>
                {pd.program && <p><span className="text-ink-tertiary">Corso:</span> {pd.program}</p>}
                {pd.grade && <p><span className="text-ink-tertiary">Voto:</span> {pd.grade}</p>}
                {pd.thesis_topic && <p><span className="text-ink-tertiary">Tesi:</span> {pd.thesis_topic}</p>}
              </div>
            </div>
          )}

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

          {/* Interests & goals */}
          {((student?.interests as string[])?.length > 0 || (student?.goals as string[])?.length > 0 || pi.length > 0) && (
            <div className="rounded-lg border border-border bg-white p-5 space-y-3">
              {(student?.interests as string[])?.length > 0 && (
                <div>
                  <p className="text-eyebrow text-navy/60 uppercase text-[10px] mb-1.5">Interessi professionali</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(student.interests as string[]).map((int, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-full text-xs bg-navy-50 text-navy">{int}</span>
                    ))}
                  </div>
                </div>
              )}
              {pi.length > 0 && (
                <div>
                  <p className="text-eyebrow text-navy/60 uppercase text-[10px] mb-1.5">Interessi personali</p>
                  <div className="flex flex-wrap gap-1.5">
                    {pi.map((p: string, i: number) => (
                      <span key={i} className="px-2 py-0.5 rounded-full text-xs bg-petrol-50 text-petrol-700">{p}</span>
                    ))}
                  </div>
                </div>
              )}
              {(student?.goals as string[])?.length > 0 && (
                <div>
                  <p className="text-eyebrow text-navy/60 uppercase text-[10px] mb-1.5">Obiettivi</p>
                  <ul className="space-y-1">
                    {(student.goals as string[]).map((g, i) => (
                      <li key={i} className="text-body-sm text-ink">• {g}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Career targets */}
          {(ct.roles?.length > 0 || ct.sectors?.length > 0) && (
            <div className="rounded-lg border border-border bg-white p-5">
              <p className="text-eyebrow text-navy/60 uppercase text-[10px] mb-2">Target di carriera</p>
              <div className="space-y-1 text-body-sm">
                {ct.roles?.length > 0 && <p><span className="text-ink-tertiary">Ruoli:</span> <span className="text-ink">{ct.roles.join(", ")}</span></p>}
                {ct.sectors?.length > 0 && <p><span className="text-ink-tertiary">Settori:</span> <span className="text-ink">{ct.sectors.join(", ")}</span></p>}
                {ct.companies?.length > 0 && <p><span className="text-ink-tertiary">Aziende:</span> <span className="text-ink">{ct.companies.join(", ")}</span></p>}
                {ct.geography?.length > 0 && <p><span className="text-ink-tertiary">Geografie:</span> <span className="text-ink">{ct.geography.join(", ")}</span></p>}
                {cp.short_term && <p><span className="text-ink-tertiary">Breve termine:</span> <span className="text-ink">{cp.short_term}</span></p>}
              </div>
            </div>
          )}

          {/* Work style */}
          {(ws.leadership || ws.style || ws.teamwork_preference || ws.strengths?.length > 0) && (
            <div className="rounded-lg border border-border bg-white p-5">
              <p className="text-eyebrow text-navy/60 uppercase text-[10px] mb-2">Stile di lavoro e attitudini</p>
              <div className="space-y-1 text-body-sm">
                {ws.style && <p><span className="text-ink-tertiary">Stile:</span> <span className="text-ink">{ws.style}</span></p>}
                {ws.leadership && <p><span className="text-ink-tertiary">Leadership:</span> <span className="text-ink">{ws.leadership}</span></p>}
                {ws.teamwork_preference && <p><span className="text-ink-tertiary">Preferenza team:</span> <span className="text-ink">{ws.teamwork_preference}</span></p>}
                {ws.communication && <p><span className="text-ink-tertiary">Comunicazione:</span> <span className="text-ink">{ws.communication}</span></p>}
                {ws.strengths?.length > 0 && <p><span className="text-ink-tertiary">Punti di forza:</span> <span className="text-ink">{ws.strengths.join(", ")}</span></p>}
                {ws.improvements?.length > 0 && <p><span className="text-ink-tertiary">Da migliorare:</span> <span className="text-ink">{ws.improvements.join(", ")}</span></p>}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT — MIRA Analysis */}
        <div className="space-y-4">
          <h3 className="font-sans text-h3 text-navy">Valutazione MIRA</h3>

          {!aiEval ? (
            <div className="rounded-lg border border-border bg-white p-5">
              <p className="text-body-sm text-ink-secondary">La valutazione AI è in elaborazione o non ancora disponibile.</p>
            </div>
          ) : (() => {
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
              <div className="space-y-4">
                {/* Synthesis */}
                <div className="rounded-lg border border-border bg-white p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${fitColor(ev.overall_fit_category)}`}>
                      {fitLabel(ev.overall_fit_category)}
                    </span>
                  </div>
                  {ev.candidate_synthesis && (
                    <p className="text-body-sm text-ink whitespace-pre-wrap">{ev.candidate_synthesis}</p>
                  )}
                </div>

                {/* Fit with association */}
                {ev.association_fit && (
                  <div className="rounded-lg border border-border bg-white p-5">
                    <p className="text-label text-navy text-xs mb-2">Fit con {assocName}</p>
                    <p className="text-body-sm text-ink mb-3">{ev.association_fit}</p>
                    {(ev.fit_strengths?.length > 0 || ev.fit_gaps?.length > 0) && (
                      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
                        {ev.fit_strengths?.length > 0 && (
                          <div>
                            <p className="text-[10px] text-success uppercase font-medium mb-1">Punti di forza</p>
                            <ul className="space-y-1">{ev.fit_strengths.map((s: string, i: number) => <li key={i} className="text-body-sm text-ink">• {s}</li>)}</ul>
                          </div>
                        )}
                        {ev.fit_gaps?.length > 0 && (
                          <div>
                            <p className="text-[10px] text-warning uppercase font-medium mb-1">Da approfondire</p>
                            <ul className="space-y-1">{ev.fit_gaps.map((g: string, i: number) => <li key={i} className="text-body-sm text-ink">• {g}</li>)}</ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Position recommendation */}
                {posRec && (
                  <div className="rounded-lg border border-border bg-white p-5">
                    <p className="text-label text-navy text-xs mb-2">Raccomandazione posizione</p>
                    <div className="space-y-1.5 text-body-sm">
                      <p><span className="text-ink-tertiary">Scelta candidato:</span> <span className="text-ink font-medium">{posRec.candidate_selected}</span></p>
                      {posRec.ai_recommended && posRec.ai_recommended !== posRec.candidate_selected && (
                        <p><span className="text-ink-tertiary">Consigliata MIRA:</span> <span className="text-petrol font-medium">{posRec.ai_recommended}</span></p>
                      )}
                      {posRec.match === true && <p className="text-success text-xs">✓ La scelta del candidato è coerente</p>}
                      {posRec.explanation && <p className="text-ink-secondary mt-1">{posRec.explanation}</p>}
                    </div>
                  </div>
                )}

                {/* Competencies */}
                {(ev.academic_competencies?.length > 0 || ev.practical_competencies?.length > 0) && (
                  <div className="rounded-lg border border-border bg-white p-5">
                    <p className="text-label text-navy text-xs mb-3">Competenze</p>
                    {ev.academic_competencies?.length > 0 && (
                      <div className="mb-3">
                        <p className="text-[10px] text-ink-tertiary uppercase mb-2">Accademiche</p>
                        <div className="space-y-2">
                          {ev.academic_competencies.map((c: any, i: number) => (
                            <div key={i}><p className="text-body-sm font-medium text-ink">{c.area}</p><p className="text-body-sm text-ink-secondary">{c.description}</p></div>
                          ))}
                        </div>
                      </div>
                    )}
                    {ev.practical_competencies?.length > 0 && (
                      <div className={ev.academic_competencies?.length > 0 ? "pt-3 border-t border-border" : ""}>
                        <p className="text-[10px] text-ink-tertiary uppercase mb-2">Pratiche</p>
                        <div className="space-y-2">
                          {ev.practical_competencies.map((c: any, i: number) => (
                            <div key={i}><p className="text-body-sm font-medium text-ink">{c.area}</p><p className="text-body-sm text-ink-secondary">{c.description}</p></div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Competencies to verify */}
                {ev.competencies_to_verify && (
                  <div className="rounded-lg border border-border bg-white p-5">
                    <p className="text-label text-navy text-xs mb-2">Competenze da verificare</p>
                    <p className="text-body-sm text-ink">{ev.competencies_to_verify}</p>
                  </div>
                )}

                {/* Attitude */}
                {ev.attitude_description && (
                  <div className="rounded-lg border border-border bg-white p-5">
                    <p className="text-label text-navy text-xs mb-2">Attitudine e stile</p>
                    <p className="text-body-sm text-ink">{ev.attitude_description}</p>
                  </div>
                )}

                {/* Application quality */}
                {ev.application_quality && (
                  <div className="rounded-lg border border-border bg-white p-5">
                    <p className="text-label text-navy text-xs mb-2">Qualità risposte candidatura</p>
                    <p className="text-body-sm text-ink">{ev.application_quality}</p>
                  </div>
                )}

                {/* Interview questions */}
                {ev.interview_questions?.length > 0 && (
                  <div className="rounded-lg border border-border bg-white p-5">
                    <p className="text-label text-navy text-xs mb-2">Domande consigliate per il colloquio</p>
                    <ol className="space-y-1.5">
                      {ev.interview_questions.map((q: string, i: number) => (
                        <li key={i} className="text-body-sm text-ink"><span className="text-ink-tertiary mr-1">{i + 1}.</span>{q}</li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* Suggested roles */}
                {ev.suggested_roles && (
                  <div className="rounded-lg border border-border bg-white p-5">
                    <p className="text-label text-navy text-xs mb-2">Ruoli suggeriti</p>
                    <p className="text-body-sm text-ink">{ev.suggested_roles}</p>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Sidebar: status, timeline, notes */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-lg border border-border bg-white p-5">
          <h3 className="font-sans text-h3 text-navy mb-3">Stato</h3>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-body-sm font-medium ${
            application.status === "accepted" ? "bg-success-bg text-success"
            : application.status === "rejected" ? "bg-error-bg text-error"
            : "bg-petrol-50 text-petrol-700"
          }`}>
            {APPLICATION_STATUS_LABELS[application.status] ?? application.status}
          </span>
        </div>

        <div className="rounded-lg border border-border bg-white p-5">
          <h3 className="font-sans text-h3 text-navy mb-3">Cronologia</h3>
          <div className="space-y-3">
            {statusEvents.map((ev) => (
              <div key={ev.id} className="text-body-sm">
                <p className="text-ink">{APPLICATION_STATUS_LABELS[ev.new_status] ?? ev.new_status}</p>
                <p className="text-ink-tertiary">{ev.profiles?.full_name ?? "Sistema"} · {new Date(ev.created_at).toLocaleDateString("it-IT")}</p>
                {ev.note && <p className="text-ink-secondary mt-1 italic">{ev.note}</p>}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-white p-5">
          <h3 className="font-sans text-h3 text-navy mb-3">Note interne</h3>
          {notes.length === 0 ? (
            <p className="text-body-sm text-ink-tertiary">Nessuna nota</p>
          ) : (
            <div className="space-y-3">
              {notes.map((n) => (
                <div key={n.id} className="text-body-sm">
                  <p className="text-ink">{n.note_text}</p>
                  <p className="text-ink-tertiary mt-1">{n.profiles?.full_name} · {new Date(n.created_at).toLocaleDateString("it-IT")}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
