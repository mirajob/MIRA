"use client";

import { useState, useEffect } from "react";
import { changeCandidateStatus, addCandidateNote } from "@/lib/actions/candidates";
import { generateInterviewMessage, sendInterviewEmail } from "@/lib/actions/interview";

const PIPELINE_FLOW: Record<string, Array<{ value: string; label: string; style: string }>> = {
  submitted: [
    { value: "in_review", label: "Valuta", style: "border border-border text-navy hover:bg-navy-50" },
    { value: "rejected", label: "Rifiuta", style: "border border-error text-error hover:bg-error-bg" },
  ],
  in_review: [
    { value: "interview", label: "Convoca colloquio", style: "border border-petrol text-petrol hover:bg-petrol-50" },
    { value: "accepted", label: "Accetta", style: "bg-navy text-white hover:bg-navy-700" },
    { value: "rejected", label: "Rifiuta", style: "border border-error text-error hover:bg-error-bg" },
  ],
  interview: [
    { value: "accepted", label: "Accetta", style: "bg-navy text-white hover:bg-navy-700" },
    { value: "rejected", label: "Rifiuta", style: "border border-error text-error hover:bg-error-bg" },
  ],
  accepted: [
    { value: "in_review", label: "Riporta in valutazione", style: "border border-border text-ink-secondary hover:bg-navy-50" },
  ],
  rejected: [
    { value: "in_review", label: "Riconsidera", style: "border border-border text-ink-secondary hover:bg-navy-50" },
  ],
};

export function CandidateActions({
  applicationId,
  currentStatus,
  candidateEmail,
  candidateName,
  associationName,
}: {
  applicationId: string;
  currentStatus: string;
  candidateEmail?: string;
  candidateName?: string;
  associationName?: string;
}) {
  const [status, setStatus] = useState(currentStatus);
  const [showNote, setShowNote] = useState(false);
  const [showInterview, setShowInterview] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [interviewMessage, setInterviewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatingMsg, setGeneratingMsg] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const nextSteps = PIPELINE_FLOW[status] ?? [];

  async function handleStatusChange(newStatus: string) {
    if (newStatus === "interview") {
      setShowInterview(true);
      setGeneratingMsg(true);
      const result = await generateInterviewMessage(
        candidateName || "candidato/a",
        associationName || "l'associazione",
        "il board"
      );
      setInterviewMessage(result.message);
      setGeneratingMsg(false);
      return;
    }
    setLoading(true);
    const result = await changeCandidateStatus(applicationId, newStatus);
    if (!result.error) setStatus(newStatus);
    setLoading(false);
  }

  async function handleSendInterview() {
    if (!interviewMessage.trim()) return;
    setLoading(true);
    const result = await sendInterviewEmail(applicationId, interviewMessage);
    if (!result.error) {
      setStatus("interview");
      setShowInterview(false);
      setEmailSent(true);
    }
    setLoading(false);
  }

  async function handleAddNote() {
    if (!noteText.trim()) return;
    setLoading(true);
    await addCandidateNote(applicationId, noteText);
    setNoteText("");
    setShowNote(false);
    setLoading(false);
  }

  return (
    <div className="flex flex-col gap-3 items-end">
      {nextSteps.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-end">
          {nextSteps.map((s) => (
            <button
              key={s.value}
              onClick={() => handleStatusChange(s.value)}
              disabled={loading}
              className={`px-4 py-2 rounded-md text-label transition-colors duration-100 disabled:opacity-40 ${s.style}`}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {emailSent && (
        <div className="w-full max-w-md rounded-md bg-success-bg px-4 py-2 text-body-sm text-success">
          Email di convocazione inviata a {candidateEmail}
        </div>
      )}

      {showInterview && (
        <div className="w-full max-w-md space-y-3 rounded-lg border border-petrol/30 bg-petrol-50 p-4">
          <p className="text-label text-navy">Invito a colloquio</p>
          <p className="text-xs text-ink-secondary">
            Scrivi il messaggio per {candidateName || "il candidato"}. Puoi includere un link Calendly, Google Meet, o istruzioni per il colloquio.
            L'email sarà inviata da MIRA a nome tuo.
          </p>
          {generatingMsg ? (
            <div className="px-3 py-4 text-body-sm text-ink-tertiary text-center">MIRA sta scrivendo una bozza...</div>
          ) : (
            <textarea
              value={interviewMessage}
              onChange={(e) => setInterviewMessage(e.target.value)}
              rows={8}
              className="w-full px-3 py-2 rounded-md border border-border text-body-sm text-ink focus:outline-none focus:border-petrol resize-y"
            />
          )}
          {candidateEmail && (
            <p className="text-xs text-ink-tertiary">
              A: {candidateEmail}
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleSendInterview}
              disabled={loading || generatingMsg || !interviewMessage.trim()}
              className="flex-1 bg-petrol text-white px-4 py-2 rounded-md text-body-sm hover:bg-petrol-700 disabled:opacity-40"
            >
              {loading ? "Invio email..." : "Invia invito"}
            </button>
            <button
              onClick={() => setShowInterview(false)}
              className="px-3 py-2 text-body-sm text-ink-secondary hover:text-navy"
            >
              Annulla
            </button>
          </div>
        </div>
      )}

      {showNote ? (
        <div className="flex gap-2 w-full max-w-sm">
          <input
            type="text"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Scrivi una nota..."
            className="flex-1 px-3 py-2 rounded-md border border-border text-body-sm text-ink focus:outline-none focus:border-petrol"
            onKeyDown={(e) => e.key === "Enter" && handleAddNote()}
          />
          <button
            onClick={handleAddNote}
            disabled={loading}
            className="px-3 py-2 bg-navy text-white rounded-md text-label hover:bg-navy-700 disabled:opacity-40"
          >
            Salva
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowNote(true)}
          className="text-body-sm text-petrol hover:text-petrol-700 transition-colors duration-100"
        >
          + Aggiungi nota
        </button>
      )}
    </div>
  );
}
