"use client";

import { useState } from "react";
import { changeCandidateStatus, addCandidateNote } from "@/lib/actions/candidates";

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
}: {
  applicationId: string;
  currentStatus: string;
  candidateEmail?: string;
}) {
  const [status, setStatus] = useState(currentStatus);
  const [showNote, setShowNote] = useState(false);
  const [showInterview, setShowInterview] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [interviewLink, setInterviewLink] = useState("");
  const [interviewDate, setInterviewDate] = useState("");
  const [loading, setLoading] = useState(false);

  const nextSteps = PIPELINE_FLOW[status] ?? [];

  async function handleStatusChange(newStatus: string) {
    if (newStatus === "interview") {
      setShowInterview(true);
      return;
    }
    setLoading(true);
    const result = await changeCandidateStatus(applicationId, newStatus);
    if (!result.error) setStatus(newStatus);
    setLoading(false);
  }

  async function handleScheduleInterview() {
    setLoading(true);
    const note = `Colloquio: ${interviewDate || "data da definire"}${interviewLink ? ` | Link: ${interviewLink}` : ""}`;
    const result = await changeCandidateStatus(applicationId, "interview", note);
    if (!result.error) {
      setStatus("interview");
      setShowInterview(false);
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

      {showInterview && (
        <div className="w-full max-w-sm space-y-2 rounded-lg border border-petrol/30 bg-petrol-50 p-4">
          <p className="text-label text-navy">Dettagli colloquio</p>
          <input
            type="datetime-local"
            value={interviewDate}
            onChange={(e) => setInterviewDate(e.target.value)}
            className="w-full px-3 py-2 rounded-md border border-border text-body-sm text-ink focus:outline-none focus:border-petrol"
          />
          <input
            type="text"
            value={interviewLink}
            onChange={(e) => setInterviewLink(e.target.value)}
            placeholder="Link Meet/Zoom (opzionale)"
            className="w-full px-3 py-2 rounded-md border border-border text-body-sm text-ink placeholder:text-ink-tertiary focus:outline-none focus:border-petrol"
          />
          {candidateEmail && (
            <p className="text-xs text-ink-tertiary">
              Il candidato ({candidateEmail}) riceverà la notifica via email.
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleScheduleInterview}
              disabled={loading}
              className="flex-1 bg-petrol text-white px-4 py-2 rounded-md text-body-sm hover:bg-petrol-700 disabled:opacity-40"
            >
              {loading ? "Invio..." : "Convoca"}
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
