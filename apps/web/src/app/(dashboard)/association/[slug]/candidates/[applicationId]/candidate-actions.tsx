"use client";

import { useState, useEffect } from "react";
import { changeCandidateStatus, addCandidateNote } from "@/lib/actions/candidates";
import { generateEmailDraft, sendInterviewEmail, sendStatusEmail } from "@/lib/actions/interview";

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
  accepted: [],
  rejected: [],
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
  const [showComposer, setShowComposer] = useState(false);
  const [composerAction, setComposerAction] = useState<string>("");
  const [noteText, setNoteText] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatingMsg, setGeneratingMsg] = useState(false);
  const [emailSent, setEmailSent] = useState<string | null>(null);

  const nextSteps = PIPELINE_FLOW[status] ?? [];

  const ACTION_LABELS: Record<string, string> = {
    interview: "Invito a colloquio",
    accepted: "Comunicazione accettazione",
    rejected: "Comunicazione rifiuto",
  };

  async function handleStatusChange(newStatus: string) {
    if (["interview", "accepted", "rejected"].includes(newStatus)) {
      setComposerAction(newStatus);
      setShowComposer(true);
      setGeneratingMsg(true);
      const type = newStatus as "interview" | "accepted" | "rejected";
      const result = await generateEmailDraft(type, candidateName || "candidato/a", associationName || "l'associazione");
      setEmailMessage(result.message);
      setGeneratingMsg(false);
      return;
    }
    setLoading(true);
    const result = await changeCandidateStatus(applicationId, newStatus);
    if (!result.error) setStatus(newStatus);
    setLoading(false);
  }

  async function handleSendEmail() {
    if (!emailMessage.trim()) return;
    setLoading(true);
    let result;
    if (composerAction === "interview") {
      result = await sendInterviewEmail(applicationId, emailMessage);
    } else {
      result = await sendStatusEmail(applicationId, composerAction, emailMessage);
    }
    if (!result?.error) {
      setStatus(composerAction);
      setShowComposer(false);
      setEmailSent(ACTION_LABELS[composerAction] || composerAction);
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
          {emailSent} — email inviata a {candidateEmail}
        </div>
      )}

      {showComposer && (
        <div className={`w-full max-w-md space-y-3 rounded-lg border p-4 ${
          composerAction === "rejected" ? "border-error/30 bg-error-bg/30" : "border-petrol/30 bg-petrol-50"
        }`}>
          <p className="text-label text-navy">{ACTION_LABELS[composerAction]}</p>
          <p className="text-xs text-ink-secondary">
            Modifica il messaggio prima di inviarlo. L'email sarà inviata da MIRA a nome tuo.
          </p>
          {generatingMsg ? (
            <div className="px-3 py-4 text-body-sm text-ink-tertiary text-center">MIRA sta scrivendo una bozza...</div>
          ) : (
            <textarea
              value={emailMessage}
              onChange={(e) => setEmailMessage(e.target.value)}
              rows={8}
              className="w-full px-3 py-2 rounded-md border border-border text-body-sm text-ink focus:outline-none focus:border-petrol resize-y"
            />
          )}
          {candidateEmail && (
            <p className="text-xs text-ink-tertiary">A: {candidateEmail}</p>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleSendEmail}
              disabled={loading || generatingMsg || !emailMessage.trim()}
              className={`flex-1 px-4 py-2 rounded-md text-body-sm text-white disabled:opacity-40 ${
                composerAction === "rejected" ? "bg-error hover:bg-error/80" : "bg-petrol hover:bg-petrol-700"
              }`}
            >
              {loading ? "Invio..." : "Invia email"}
            </button>
            <button
              onClick={() => setShowComposer(false)}
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
