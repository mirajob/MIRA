"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { inviteCandidatesToSession } from "@/lib/actions/interview-booking";
import { decideCandidate, buildDecisionDraft } from "@/lib/actions/candidate-decision";
import type { RoundOption } from "./[applicationId]/candidate-actions";

export interface CandidateRow {
  applicationId: string;
  name: string;
  email: string;
  position: string | null;
  status: string;
  /** Riga già pronta sullo stato del colloquio, calcolata sul server. */
  interviewSummary: string | null;
  /** A quale round è stato invitato, se lo è stato. */
  roundId: string | null;
  roundIndex: number | null;
  roundTitle: string | null;
  /** Dove si trova dentro il round: deve prenotare, ha prenotato, ha già fatto. */
  interviewState: "toBook" | "booked" | "done" | null;
  /** I round a cui è già stato invitato: non si ripropongono. */
  invitedRoundIds: string[];
  /** Link o indirizzo del colloquio fissato. */
  interviewPlace: string | null;
  interviewerName: string | null;
}

/**
 * L'elenco candidati diviso per fase.
 *
 * Prima era una tabella con colonne stato, valutazione e data: informazioni che
 * non dicevano cosa fare. Adesso ogni candidato sta nella sezione che corrisponde
 * al punto in cui è, e accanto ha le azioni che da lì hanno senso. Le sezioni
 * vuote non compaiono.
 */
export function CandidatesBoard({
  slug,
  rows,
  rounds,
}: {
  slug: string;
  rows: CandidateRow[];
  rounds: RoundOption[];
}) {
  const t = useTranslations("CandidatesList");
  const a = useTranslations("CandidateActions");
  const router = useRouter();

  const [panel, setPanel] = useState<{ id: string; kind: "rounds" | "accepted" | "rejected" } | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  // Il round scelto ma non ancora confermato: fra il click e la mail c'è
  // l'anteprima, come nella pagina del round.
  const [chosenRound, setChosenRound] = useState<RoundOption | null>(null);

  const groups = [
    { key: "applied", label: t("groupApplied"), hint: t("groupAppliedHint"), match: ["submitted", "in_review"] },
    { key: "interview", label: t("groupInterview"), hint: t("groupInterviewHint"), match: ["interview"] },
    { key: "accepted", label: t("groupAccepted"), hint: t("groupAcceptedHint"), match: ["accepted"] },
    { key: "rejected", label: t("groupRejected"), hint: t("groupRejectedHint"), match: ["rejected", "withdrawn"] },
  ];

  async function openDecision(row: CandidateRow, kind: "accepted" | "rejected") {
    setPanel({ id: row.applicationId, kind });
    setLoading(true);
    const draft = await buildDecisionDraft({
      decision: kind,
      candidateName: row.name,
      associationName: "",
    });
    setMessage(draft.message);
    setLoading(false);
  }

  async function confirmDecision(row: CandidateRow, kind: "accepted" | "rejected") {
    setLoading(true);
    const result = await decideCandidate({
      applicationId: row.applicationId,
      decision: kind,
      message,
    });
    if (result.error) window.alert(result.error);
    setPanel(null);
    router.refresh();
    setLoading(false);
  }

  async function invite(row: CandidateRow, roundId: string) {
    setLoading(true);
    const result = await inviteCandidatesToSession({
      sessionId: roundId,
      slug,
      applicationIds: [row.applicationId],
    });
    if (result.error) window.alert(result.error);
    else if ("warning" in result && result.warning) window.alert(result.warning);
    setPanel(null);
    setChosenRound(null);
    router.refresh();
    setLoading(false);
  }

  /** La riga sul posto, uguale a quella dell'anteprima nella pagina del round. */
  function placeLine(round: RoundOption) {
    if (round.linkMode === "auto") return a("previewPlaceAuto");
    if (round.linkMode === "per_interview") return a("previewPlaceLater");
    return round.place || a("previewPlaceMissing");
  }

  if (!rows.length) {
    return (
      <div className="rounded-lg border border-border bg-white p-8 text-center">
        <p className="text-body text-ink-secondary">{t("noApplications")}</p>
      </div>
    );
  }

  /** Un elenco di righe dentro il suo riquadro. */
  function RowList({ list }: { list: CandidateRow[] }) {
    return (
      <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-white">
        {list.map((row) => renderRow(row))}
      </div>
    );
  }

  /**
   * La fase del colloquio, divisa per round e dentro ogni round per il punto in
   * cui è il candidato: deve ancora scegliere l'orario, ce l'ha e deve andarci,
   * l'ha già fatto. In un elenco unico "al colloquio" non si capiva chi stesse
   * aspettando cosa.
   */
  function InterviewGroup({ list }: { list: CandidateRow[] }) {
    const byRound = new Map<string, CandidateRow[]>();
    for (const row of list) {
      const key = row.roundId ?? "";
      byRound.set(key, [...(byRound.get(key) ?? []), row]);
    }
    const ordered = [...byRound.entries()].sort(
      (x, y) => (x[1][0]?.roundIndex ?? 99) - (y[1][0]?.roundIndex ?? 99)
    );

    const states = [
      { key: "toBook" as const, label: t("stateToBook") },
      { key: "booked" as const, label: t("stateBooked") },
      { key: "done" as const, label: t("stateDone") },
    ];

    return (
      <div className="space-y-4">
        {ordered.map(([roundId, roundRows]) => {
          const first = roundRows[0];
          const roundLabel = first?.roundIndex
            ? `${a("roundLabel", { index: first.roundIndex })} · ${first.roundTitle ?? ""}`
            : t("roundUnknown");

          return (
            <div key={roundId || "senza-round"}>
              <p className="mb-2 text-body-sm font-medium text-navy">
                {roundLabel} <span className="font-normal text-ink-tertiary">{roundRows.length}</span>
              </p>

              <div className="space-y-2.5 border-l-2 border-border pl-3">
                {states.map(({ key, label }) => {
                  const stateRows = roundRows.filter((r) => r.interviewState === key);
                  if (!stateRows.length) return null;
                  return (
                    <div key={key}>
                      <p className="mb-1 text-eyebrow uppercase text-navy/50">
                        {label} <span className="text-ink-tertiary">{stateRows.length}</span>
                      </p>
                      <RowList list={stateRows} />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {groups.map((group) => {
        const groupRows = rows.filter((r) => group.match.includes(r.status));
        if (!groupRows.length) return null;

        return (
          <div key={group.key}>
            <div className="mb-1.5 flex items-baseline gap-3">
              <h3 className="text-eyebrow uppercase tracking-wide text-navy">{group.label}</h3>
              <span className="text-body-sm text-ink-tertiary">{groupRows.length}</span>
              <span className="h-px flex-1 bg-border" />
            </div>
            <p className="mb-2 text-body-sm text-ink-tertiary">{group.hint}</p>

            {group.key === "interview" ? (
              <InterviewGroup list={groupRows} />
            ) : (
              <RowList list={groupRows} />
            )}
          </div>
        );
      })}
    </div>
  );

  /** Una riga candidato, con i pannelli che può aprire. */
  function renderRow(row: CandidateRow) {
    const open = panel?.id === row.applicationId;
    const decided = row.status === "accepted" || row.status === "rejected";

    return (
      <div key={row.applicationId} className="px-4 py-2.5">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <Link
                        href={`/association/${slug}/candidates/${row.applicationId}`}
                        className="min-w-0"
                      >
                        <p className="text-body-sm font-medium text-navy hover:underline">{row.name}</p>
                        <p className="truncate text-body-sm text-ink-tertiary">{row.email}</p>
                      </Link>

                      {row.position && (
                        <span className="text-body-sm text-ink-secondary">{row.position}</span>
                      )}

                      {row.interviewSummary && (
                        <span className="text-body-sm text-ink-secondary">{row.interviewSummary}</span>
                      )}

                      {row.interviewerName && (
                        <span className="text-body-sm text-ink-tertiary">
                          {a("conductedBy", { name: row.interviewerName })}
                        </span>
                      )}

                      {row.interviewPlace &&
                        (row.interviewPlace.startsWith("http") ? (
                          <a
                            href={row.interviewPlace}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-body-sm text-petrol hover:underline"
                          >
                            {a("openMeeting")}
                          </a>
                        ) : (
                          <span className="text-body-sm text-ink-tertiary">{row.interviewPlace}</span>
                        ))}

                      {!decided && (
                        <div className="ml-auto flex items-center gap-3">
                          <button
                            onClick={() =>
                              {
                                setChosenRound(null);
                                setPanel(open && panel?.kind === "rounds" ? null : { id: row.applicationId, kind: "rounds" });
                              }
                            }
                            className="text-body-sm text-petrol hover:underline"
                          >
                            {a("inviteToRound")}
                          </button>
                          <button
                            onClick={() => openDecision(row, "accepted")}
                            className="text-body-sm font-medium text-navy hover:underline"
                          >
                            {a("accept")}
                          </button>
                          <button
                            onClick={() => openDecision(row, "rejected")}
                            className="text-body-sm text-error hover:underline"
                          >
                            {a("reject")}
                          </button>
                        </div>
                      )}
                    </div>

                    {open && panel?.kind === "rounds" && (
                      <div className="mt-2 rounded-md border border-border bg-paper p-3">
                        {rounds.filter((r) => !row.invitedRoundIds.includes(r.id)).length === 0 ? (
                          <div className="space-y-2">
                            <p className="text-body-sm text-ink">
                              {rounds.length === 0 ? a("noRoundsYet") : a("allRoundsUsed")}
                            </p>
                            <Link
                              href={`/association/${slug}/colloqui`}
                              className="inline-block rounded-md bg-navy px-3 py-1.5 text-body-sm text-white hover:bg-navy-700"
                            >
                              {a("goCreateRound")}
                            </Link>
                          </div>
                        ) : (
                          <>
                            {chosenRound ? (
                              <div className="space-y-3">
                                <p className="text-eyebrow uppercase text-navy/60">
                                  {a("previewHeading", { name: row.name })}
                                </p>
                                <div className="space-y-1 text-body-sm">
                                  <p className="font-medium text-navy">{chosenRound.title}</p>
                                  {chosenRound.description && (
                                    <p className="whitespace-pre-wrap text-ink-secondary">
                                      {chosenRound.description}
                                    </p>
                                  )}
                                  <p className="text-ink">
                                    {chosenRound.mode === "online" ? a("modeOnline") : a("modeInPerson")}
                                    {" · "}
                                    <span className="text-ink-secondary">{placeLine(chosenRound)}</span>
                                  </p>
                                  {chosenRound.daysLabel && (
                                    <p className="text-ink-tertiary">
                                      {a("previewDays", { days: chosenRound.daysLabel })}
                                    </p>
                                  )}
                                  <p className="text-ink-tertiary">{a("previewTimeNote")}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                  <button
                                    onClick={() => invite(row, chosenRound.id)}
                                    disabled={loading}
                                    className="rounded-md bg-petrol px-4 py-1.5 text-body-sm text-white transition-colors duration-100 hover:bg-petrol-700 disabled:opacity-40"
                                  >
                                    {loading ? a("sending") : a("previewSendCta")}
                                  </button>
                                  <button
                                    onClick={() => setChosenRound(null)}
                                    className="text-body-sm text-ink-secondary hover:underline"
                                  >
                                    {a("cancel")}
                                  </button>
                                </div>
                              </div>
                            ) : (
                            <>
                            <p className="mb-2 text-body-sm text-ink-secondary">{a("pickRound")}</p>
                            <div className="space-y-1">
                              {rounds
                                .filter((round) => !row.invitedRoundIds.includes(round.id))
                                .map((round) => (
                                <button
                                  key={round.id}
                                  onClick={() => setChosenRound(round)}
                                  disabled={loading}
                                  className="flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-white disabled:opacity-50"
                                >
                                  <span className="text-eyebrow uppercase text-navy/50">
                                    {a("roundLabel", { index: round.roundIndex })}
                                  </span>
                                  <span className="text-body-sm text-navy">{round.title}</span>
                                </button>
                              ))}
                            </div>
                            </>
                            )}
                          </>
                        )}
                      </div>
                    )}

                    {open && (panel?.kind === "accepted" || panel?.kind === "rejected") && (
                      <div className="mt-2 space-y-2 rounded-md border border-border bg-paper p-3">
                        <p className="text-body-sm text-ink">{a("draftIntro", { email: row.email })}</p>
                        <textarea
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          rows={8}
                          className="w-full rounded-md border border-border px-3 py-2 text-body-sm text-ink focus:border-petrol focus:outline-none"
                        />
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => confirmDecision(row, panel.kind as "accepted" | "rejected")}
                            disabled={loading}
                            className={`rounded-md px-4 py-1.5 text-body-sm text-white disabled:opacity-40 ${
                              panel.kind === "accepted" ? "bg-navy hover:bg-navy-700" : "bg-error hover:bg-error/80"
                            }`}
                          >
                            {loading
                              ? a("sending")
                              : panel.kind === "accepted"
                                ? a("confirmAccept")
                                : a("confirmReject")}
                          </button>
                          <button
                            onClick={() => setPanel(null)}
                            className="text-body-sm text-ink-secondary hover:underline"
                          >
                            {a("cancel")}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
    );
  }
}
