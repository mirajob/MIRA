"use client";

import { useState } from "react";
import { removeBoardMember } from "@/lib/actions/board";

export function MemberActions({
  membershipId,
  associationId,
  memberName,
  currentTitle,
}: {
  membershipId: string;
  associationId: string;
  memberName: string;
  currentTitle: string | null;
}) {
  const [title, setTitle] = useState(currentTitle ?? "");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removed, setRemoved] = useState(false);
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

  if (removed) return <span className="text-xs text-ink-tertiary">Rimosso</span>;

  return (
    <div className="flex items-center gap-3 justify-end">
      {editing ? (
        <div className="flex gap-1">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSaveTitle()}
            placeholder="Ruolo..."
            autoFocus
            className="w-28 px-2 py-1 rounded border border-petrol text-xs focus:outline-none"
          />
          <button onClick={handleSaveTitle} disabled={saving} className="text-xs text-petrol">OK</button>
        </div>
      ) : (
        <button onClick={() => setEditing(true)} className="text-xs text-petrol hover:text-petrol-700">
          Ruolo
        </button>
      )}

      {confirmRemove ? (
        <span className="flex items-center gap-1">
          <span className="text-xs text-error">Sicuro?</span>
          <button onClick={handleRemove} disabled={saving} className="text-xs text-error font-medium">Sì</button>
          <button onClick={() => setConfirmRemove(false)} className="text-xs text-ink-secondary">No</button>
        </span>
      ) : (
        <button onClick={() => setConfirmRemove(true)} className="text-xs text-ink-tertiary hover:text-error">
          Rimuovi
        </button>
      )}
    </div>
  );
}
