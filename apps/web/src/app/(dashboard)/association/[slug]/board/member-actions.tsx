"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { removeBoardMember, promoteToAdmin, demoteToMember } from "@/lib/actions/board";

export function MemberActions({
  membershipId,
  associationId,
  memberName,
  currentTitle,
  role,
}: {
  membershipId: string;
  associationId: string;
  memberName: string;
  currentTitle: string | null;
  role: string;
}) {
  const t = useTranslations("Board");
  const [title, setTitle] = useState(currentTitle ?? "");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removed, setRemoved] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [currentRole, setCurrentRole] = useState(role);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = currentRole === "association_admin" || currentRole === "association_president";

  /**
   * Nomina e retrocessione. Il server puo' rifiutare — per esempio se questo e' l'ultimo
   * amministratore rimasto — quindi il messaggio va mostrato, non ingoiato.
   */
  async function handleToggleAdmin() {
    setSaving(true);
    setError(null);
    const res = isAdmin
      ? await demoteToMember(associationId, membershipId)
      : await promoteToAdmin(associationId, membershipId);
    if (res?.error) setError(res.error);
    else setCurrentRole(isAdmin ? "association_member" : "association_admin");
    setSaving(false);
  }

  async function handleSaveTitle() {
    setSaving(true);
    const res = await fetch("/api/membership/activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ membershipId, title: title.trim() || null }),
    });
    setSaving(false);
    // Non chiudere il campo se il salvataggio non e' andato: altrimenti sembra salvato.
    if (res.ok) setEditing(false);
    else setTitle(currentTitle ?? "");
  }

  async function handleRemove() {
    setSaving(true);
    setError(null);
    const res = await removeBoardMember(associationId, membershipId);
    if (res?.error) setError(res.error);
    else setRemoved(true);
    setConfirmRemove(false);
    setSaving(false);
  }

  if (removed) return <span className="text-eyebrow text-ink-tertiary">{t("removed")}</span>;

  // L'errore piu' probabile qui e' "sei rimasto l'unico amministratore": va letto,
  // quindi occupa la riga al posto dei pulsanti finche' non si riprova.
  if (error) {
    return (
      <button
        onClick={() => setError(null)}
        className="max-w-[220px] text-right text-eyebrow text-error"
        title={error}
      >
        {error}
      </button>
    );
  }

  return (
    <div className="flex shrink-0 items-center gap-3 justify-end">
      {editing ? (
        <div className="flex gap-1">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSaveTitle()}
            placeholder={t("rolePlaceholder")}
            autoFocus
            className="w-28 px-2 py-1 rounded border border-petrol text-xs focus:outline-none"
          />
          <button onClick={handleSaveTitle} disabled={saving} className="text-eyebrow text-petrol">{t("save")}</button>
        </div>
      ) : (
        <button onClick={() => setEditing(true)} className="text-eyebrow text-petrol hover:text-petrol-700">
          {t("roleButton")}
        </button>
      )}

      <button
        onClick={handleToggleAdmin}
        disabled={saving}
        className="text-eyebrow text-petrol hover:text-petrol-700 disabled:opacity-40 whitespace-nowrap"
      >
        {isAdmin ? t("demote") : t("promote")}
      </button>

      {confirmRemove ? (
        <span className="flex items-center gap-1">
          <span className="text-eyebrow text-error">{t("confirmRemove")}</span>
          <button onClick={handleRemove} disabled={saving} className="text-eyebrow font-medium text-error">{t("yes")}</button>
          <button onClick={() => setConfirmRemove(false)} className="text-eyebrow text-ink-secondary">{t("no")}</button>
        </span>
      ) : (
        <button onClick={() => setConfirmRemove(true)} className="text-eyebrow text-ink-tertiary hover:text-error">
          {t("remove")}
        </button>
      )}
    </div>
  );
}
