"use client";

import { useState } from "react";

export function EditableRole({
  membershipId,
  currentTitle,
  roleFallback,
}: {
  membershipId: string;
  currentTitle: string | null;
  roleFallback: string;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(currentTitle ?? "");
  const [saving, setSaving] = useState(false);
  const displayTitle = title || currentTitle;

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    await fetch("/api/membership/activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ membershipId, title: title.trim() || null }),
    });
    setSaving(false);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setEditing(false); }}
          placeholder="es. Analyst M&A, VP Marketing..."
          autoFocus
          className="w-44 px-2 py-1 rounded border border-petrol text-xs text-ink focus:outline-none focus:ring-1 focus:ring-petrol/30"
        />
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="px-2 py-0.5 rounded-full text-xs font-medium bg-petrol-50 text-petrol-700 hover:bg-petrol-100 transition-colors cursor-pointer"
      title="Clicca per modificare il tuo ruolo"
    >
      {displayTitle || roleFallback}
    </button>
  );
}
