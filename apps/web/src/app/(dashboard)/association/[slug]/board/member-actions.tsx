"use client";

import { useState } from "react";
import { removeBoardMember, approveBoardMember } from "@/lib/actions/board";

export function MemberActions({
  membershipId,
  associationId,
  memberName,
  currentTitle,
  isBoard,
}: {
  membershipId: string;
  associationId: string;
  memberName: string;
  currentTitle: string | null;
  isBoard: boolean;
}) {
  const [title, setTitle] = useState(currentTitle ?? "");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removed, setRemoved] = useState(false);
  const [promoted, setPromoted] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  async function handleSaveTitle() {
    setSaving(true);
    await fetch("/api/membership/activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ membershipId, title: title.trim() || null }),
    });
    setSaving(false);
    setEditing(false);
  }

  async function handleRemove() {
    setSaving(true);
    await removeBoardMember(associationId, membershipId);
    setRemoved(true);
    setSaving(false);
  }

  async function handlePromote() {
    setSaving(true);
    await approveBoardMember(associationId, membershipId);
    setPromoted(true);
    setSaving(false);
  }

  if (removed) return <span className="text-xs text-ink-tertiary">Rimosso</span>;
  if (promoted) return <span className="text-xs text-success">Promosso a board</span>;

  return (
    <div className="flex items-center gap-2">
      {editing ? (
        <div className="flex gap-1">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSaveTitle()}
            placeholder="Ruolo..."
            autoFocus
            className="w-32 px-2 py-1 rounded border border-petrol text-xs focus:outline-none"
          />
          <button onClick={handleSaveTitle} disabled={saving} className="text-xs text-petrol hover:text-petrol-700">
            {saving ? "..." : "OK"}
          </button>
        </div>
      ) : (
        <button onClick={() => setEditing(true)} className="text-xs text-petrol hover:text-petrol-700" title="Modifica ruolo">
          {currentTitle || "Ruolo"}
        </button>
      )}

      {!isBoard && (
        <button
          onClick={handlePromote}
          disabled={saving}
          className="text-xs text-navy hover:text-petrol transition-colors disabled:opacity-40"
          title="Promuovi a board"
        >
          Promuovi
        </button>
      )}

      {confirmRemove ? (
        <div className="flex items-center gap-1">
          <span className="text-xs text-error">Sicuro?</span>
          <button onClick={handleRemove} disabled={saving} className="text-xs text-error font-medium">Sì</button>
          <button onClick={() => setConfirmRemove(false)} className="text-xs text-ink-secondary">No</button>
        </div>
      ) : (
        <button
          onClick={() => setConfirmRemove(true)}
          className="text-xs text-ink-tertiary hover:text-error transition-colors"
        >
          Rimuovi
        </button>
      )}
    </div>
  );
}
