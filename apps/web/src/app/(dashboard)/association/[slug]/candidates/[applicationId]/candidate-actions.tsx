"use client";

import { useState } from "react";
import { changeCandidateStatus, addCandidateNote } from "@/lib/actions/candidates";

const STATUS_OPTIONS = [
  { value: "in_review", label: "In valutazione" },
  { value: "interview", label: "Colloquio" },
  { value: "accepted", label: "Accettato" },
  { value: "rejected", label: "Non selezionato" },
  { value: "waitlisted", label: "Lista d'attesa" },
];

export function CandidateActions({
  applicationId,
  currentStatus,
}: {
  applicationId: string;
  currentStatus: string;
}) {
  const [showNote, setShowNote] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleStatusChange(newStatus: string) {
    setLoading(true);
    await changeCandidateStatus(applicationId, newStatus);
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
    <div className="flex flex-col gap-2 items-end">
      <div className="flex gap-2">
        {STATUS_OPTIONS.filter((s) => s.value !== currentStatus).map((s) => (
          <button
            key={s.value}
            onClick={() => handleStatusChange(s.value)}
            disabled={loading}
            className={`px-4 py-2 rounded-md text-label transition-colors duration-100 disabled:opacity-40 ${
              s.value === "accepted"
                ? "bg-navy text-white hover:bg-navy-700"
                : s.value === "rejected"
                  ? "border border-error text-error hover:bg-error-bg"
                  : "border border-border text-navy hover:border-border-strong hover:bg-navy-50"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

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
