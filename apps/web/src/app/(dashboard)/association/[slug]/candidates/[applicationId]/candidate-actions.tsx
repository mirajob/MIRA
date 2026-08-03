"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { inviteCandidatesToSession } from "@/lib/actions/interview-booking";
import { decideCandidate, buildDecisionDraft } from "@/lib/actions/candidate-decision";

export interface RoundOption {
  id: string;
  title: string;
  roundIndex: number;
  /** true se il candidato è già stato invitato a questo round. */
  alreadyInvited: boolean;
  description?: string | null;
  mode?: "online" | "in_person";
  /** "auto" | "shared" | "per_interview" */
  linkMode?: string;
  /** Il posto o il link, quando la sessione ne ha uno solo per tutti. */
  place?: string | null;
  /** L'arco di giorni in cui cadono i colloqui, già scritto. */
  daysLabel?: string | null;
}

/**
 * Stato del candidato e cosa si può fare adesso.
 *
 * Sostituisce il vecchio blocco di pulsanti scollegati: qui si legge in una riga
 * a che punto è la candidatura, e sotto ci sono solo le azioni che hanno senso
 * da quel punto. "Convoca a colloquio" non scrive più un'email a mano: sceglie
 * il round, che è la cosa che poi fa partire davvero la prenotazione.
 */
export function CandidateActions({
  applicationId,
  slug,
  currentStatus,
  candidateName,
  candidateEmail,
  associationName,
  rounds,
  interviewSummary,
}: {
  applicationId: string;
  slug: string;
  currentStatus: string;
  candidateName: string;
  candidateEmail: string;
  associationName: string;
  rounds: RoundOption[];
  /** Riga già pronta sullo stato del colloquio, calcolata sul server. */
  interviewSummary: string | null;
}) {
  const t = useTranslations("CandidateActions");
  const router = useRouter();

  const [status, setStatus] = useState(currentStatus);
  const [panel, setPanel] = useState<"none" | "rounds" | "accepted" | "rejected">("none");
  // Fra il click sul round e la mail c'è l'anteprima: convocare qualcuno per
  // sbaglio non si annulla.
  const [chosenRound, setChosenRound] = useState<RoundOption | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const decided = status === "accepted" || status === "rejected";

  async function openDecision(decision: "accepted" | "rejected") {
    setPanel(decision);
    setLoading(true);
    const draft = await buildDecisionDraft({ decision, candidateName, associationName });
    setMessage(draft.message);
    setLoading(false);
  }

  async function confirmDecision(decision: "accepted" | "rejected") {
    setLoading(true);
    const result = await decideCandidate({ applicationId, decision, message });
    if (result.error) {
      window.alert(result.error);
      setLoading(false);
      return;
    }
    setStatus(decision);
    setPanel("none");
    setDone(decision === "accepted" ? t("acceptedDone") : t("rejectedDone"));
    router.refresh();
    setLoading(false);
  }

  /** La riga sul posto, uguale a quella della pagina del round. */
  function placeLine(round: RoundOption) {
    if (round.linkMode === "auto") return t("previewPlaceAuto");
    if (round.linkMode === "per_interview") return t("previewPlaceLater");
    return round.place || t("previewPlaceMissing");
  }

  async function invite(roundId: string) {
    setLoading(true);
    const result = await inviteCandidatesToSession({
      sessionId: roundId,
      slug,
      applicationIds: [applicationId],
    });
    if (result.error) {
      window.alert(result.error);
      setLoading(false);
      return;
    }
    setPanel("none");
    setChosenRound(null);
    setDone(t("invitedDone", { email: candidateEmail }));
    setStatus("interview");
    router.refresh();
    setLoading(false);
  }

  const statusLine = decided
    ? status === "accepted"
      ? t("stateAccepted")
      : t("stateRejected")
    : interviewSummary ?? t("stateApplied");

  return (
    <div className="rounded-lg border border-border bg-white px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
            status === "accepted"
              ? "bg-success-bg text-success"
              : status === "rejected"
                ? "bg-error-bg text-error"
                : "bg-petrol-50 text-petrol-700"
          }`}
        >
          {status === "accepted"
            ? t("badgeAccepted")
            : status === "rejected"
              ? t("badgeRejected")
              : status === "interview"
                ? t("badgeInterview")
                : t("badgeApplied")}
        </span>

        <p className="text-body-sm text-ink">{statusLine}</p>

        {!decided && (
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <button
              onClick={() => setPanel(panel === "rounds" ? "none" : "rounds")}
              disabled={loading}
              className="rounded-md border border-petrol px-3 py-1.5 text-body-sm text-petrol transition-colors duration-100 hover:bg-petrol-50 disabled:opacity-40"
            >
              {t("inviteToRound")}
            </button>
            <button
              onClick={() => openDecision("accepted")}
              disabled={loading}
              className="rounded-md bg-navy px-3 py-1.5 text-body-sm text-white transition-colors duration-100 hover:bg-navy-700 disabled:opacity-40"
            >
              {t("accept")}
            </button>
            <button
              onClick={() => openDecision("rejected")}
              disabled={loading}
              className="rounded-md border border-error px-3 py-1.5 text-body-sm text-error transition-colors duration-100 hover:bg-error-bg disabled:opacity-40"
            >
              {t("reject")}
            </button>
          </div>
        )}
      </div>

      {done && <p className="mt-2 rounded-md bg-success-bg px-3 py-2 text-body-sm text-success">{done}</p>}

      {/* Scelta del round: senza round creati non si può convocare nessuno, e
          dirlo qui evita di far cercare al board dove sta il problema. */}
      {panel === "rounds" && (
        <div className="mt-3 rounded-md border border-border bg-paper p-3">
          {rounds.length === 0 ? (
            <div className="space-y-2">
              <p className="text-body-sm text-ink">{t("noRoundsYet")}</p>
              <Link
                href={`/association/${slug}/colloqui`}
                className="inline-block rounded-md bg-navy px-3 py-1.5 text-body-sm text-white hover:bg-navy-700"
              >
                {t("goCreateRound")}
              </Link>
            </div>
          ) : (
            <>
              <p className="mb-2 text-body-sm text-ink-secondary">{t("pickRound")}</p>
              <div className="space-y-1">
                {chosenRound ? (
                  <div className="space-y-3">
                    <p className="text-eyebrow uppercase text-navy/60">
                      {t("previewHeading", { name: candidateName || candidateEmail })}
                    </p>
                    <div className="space-y-1 text-body-sm">
                      <p className="font-medium text-navy">{chosenRound.title}</p>
                      {chosenRound.description && (
                        <p className="whitespace-pre-wrap text-ink-secondary">{chosenRound.description}</p>
                      )}
                      <p className="text-ink">
                        {chosenRound.mode === "online" ? t("modeOnline") : t("modeInPerson")}
                        {" · "}
                        <span className="text-ink-secondary">{placeLine(chosenRound)}</span>
                      </p>
                      {chosenRound.daysLabel && (
                        <p className="text-ink-tertiary">{t("previewDays", { days: chosenRound.daysLabel })}</p>
                      )}
                      <p className="text-ink-tertiary">{t("previewTimeNote")}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => invite(chosenRound.id)}
                        disabled={loading}
                        className="rounded-md bg-petrol px-4 py-1.5 text-body-sm text-white transition-colors duration-100 hover:bg-petrol-700 disabled:opacity-40"
                      >
                        {loading ? t("sending") : t("previewSendCta")}
                      </button>
                      <button
                        onClick={() => setChosenRound(null)}
                        className="text-body-sm text-ink-secondary hover:underline"
                      >
                        {t("cancel")}
                      </button>
                    </div>
                  </div>
                ) : (
                  rounds.map((round) => (
                  <button
                    key={round.id}
                    onClick={() => setChosenRound(round)}
                    disabled={loading || round.alreadyInvited}
                    className="flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-white disabled:opacity-50"
                  >
                    <span className="text-eyebrow uppercase text-navy/50">
                      {t("roundLabel", { index: round.roundIndex })}
                    </span>
                    <span className="text-body-sm text-navy">{round.title}</span>
                    {round.alreadyInvited && (
                      <span className="ml-auto text-body-sm text-ink-tertiary">
                        {t("alreadyInvited")}
                      </span>
                    )}
                  </button>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      )}

      {(panel === "accepted" || panel === "rejected") && (
        <div className="mt-3 space-y-2 rounded-md border border-border bg-paper p-3">
          <p className="text-body-sm text-ink">{t("draftIntro", { email: candidateEmail })}</p>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={10}
            className="w-full rounded-md border border-border px-3 py-2 text-body-sm text-ink focus:border-petrol focus:outline-none"
          />
          <div className="flex items-center gap-3">
            <button
              onClick={() => confirmDecision(panel)}
              disabled={loading}
              className={`rounded-md px-4 py-1.5 text-body-sm text-white transition-colors duration-100 disabled:opacity-40 ${
                panel === "accepted" ? "bg-navy hover:bg-navy-700" : "bg-error hover:bg-error/80"
              }`}
            >
              {loading ? t("sending") : panel === "accepted" ? t("confirmAccept") : t("confirmReject")}
            </button>
            <button
              onClick={() => setPanel("none")}
              className="text-body-sm text-ink-secondary hover:underline"
            >
              {t("cancel")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
