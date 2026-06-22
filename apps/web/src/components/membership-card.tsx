"use client";

import { useState } from "react";
import Link from "next/link";

const ROLE_LABELS: Record<string, string> = {
  association_president: "Presidente",
  association_admin: "Admin",
  association_reviewer: "Reviewer",
  association_interviewer: "Interviewer",
  association_member: "Membro",
};

export function MembershipCard({
  membership,
}: {
  membership: {
    id: string;
    role: string;
    title: string | null;
    activityDescription: string | null;
    associationName: string;
    associationSlug: string;
  };
}) {
  const [description, setDescription] = useState(membership.activityDescription ?? "");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  async function handleSave() {
    if (!dirty || saving) return;
    setSaving(true);
    await fetch("/api/membership/activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ membershipId: membership.id, activityDescription: description }),
    });
    setSaving(false);
    setDirty(false);
  }

  return (
    <div className="rounded-md border border-border p-3 space-y-2">
      <div className="flex items-center justify-between">
        <Link
          href={`/association/${membership.associationSlug}`}
          className="text-body text-ink font-medium hover:text-petrol transition-colors"
        >
          {membership.associationName}
        </Link>
        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-petrol-50 text-petrol-700">
          {membership.title ?? ROLE_LABELS[membership.role] ?? membership.role}
        </span>
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={description}
          onChange={(e) => { setDescription(e.target.value); setDirty(true); }}
          onBlur={handleSave}
          onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
          placeholder="Descrivi le tue attività..."
          className="flex-1 px-3 py-1.5 rounded-md bg-paper border border-border text-body-sm text-ink placeholder:text-ink-tertiary focus:outline-none focus:border-petrol focus:ring-1 focus:ring-petrol/20 transition-colors"
        />
        {saving && <span className="text-body-sm text-ink-tertiary self-center">Salvo...</span>}
      </div>
    </div>
  );
}
