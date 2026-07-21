"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  createSection,
  renameSection,
  deleteSection,
  moveSection,
  assignMemberToSection,
} from "@/lib/actions/membership";
import { MemberActions } from "./member-actions";

interface Section {
  id: string;
  name: string;
  position: number;
}

interface Member {
  id: string;
  role: string;
  title: string | null;
  sectionId: string | null;
  profile: { full_name: string | null; email: string };
}

export function MembersPanel({
  associationId,
  sections,
  members,
}: {
  associationId: string;
  sections: Section[];
  members: Member[];
}) {
  const t = useTranslations("Membership");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Assegnazione ottimistica: la riga si sposta subito di sezione, senza aspettare
  // il round-trip al server.
  const [localSection, setLocalSection] = useState<Record<string, string | null>>({});
  const sectionOf = (m: Member) => (m.id in localSection ? localSection[m.id]! : m.sectionId);

  function run(fn: () => Promise<{ error?: string } | void>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (res && "error" in res && res.error) setError(res.error);
    });
  }

  function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    setNewName("");
    setCreating(false);
    run(() => createSection(associationId, name));
  }

  function handleRename(sectionId: string) {
    const name = editName.trim();
    setEditingId(null);
    if (!name) return;
    run(() => renameSection(associationId, sectionId, name));
  }

  function handleAssign(membershipId: string, value: string) {
    const sectionId = value === "" ? null : value;
    setLocalSection((prev) => ({ ...prev, [membershipId]: sectionId }));
    run(() => assignMemberToSection(associationId, membershipId, sectionId));
  }

  const inputClass =
    "px-2 py-1 rounded border border-petrol bg-white text-body-sm text-ink focus:outline-none focus:ring-2 focus:ring-petrol/20";

  function MemberRow({ m }: { m: Member }) {
    return (
      <div className="flex items-center gap-3 border-b border-border last:border-0 px-3 py-2 hover:bg-navy-50/50">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy text-white text-eyebrow font-semibold">
          {(m.profile.full_name ?? m.profile.email).charAt(0).toUpperCase()}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-body-sm font-medium text-navy">
            {m.profile.full_name ?? "—"}
            {m.title && <span className="ml-2 font-normal text-ink-tertiary">{m.title}</span>}
          </p>
          <p className="truncate text-eyebrow text-ink-tertiary">{m.profile.email}</p>
        </div>

        <select
          value={sectionOf(m) ?? ""}
          onChange={(e) => handleAssign(m.id, e.target.value)}
          disabled={pending}
          aria-label={t("assignSection")}
          className="shrink-0 max-w-[130px] rounded border border-border bg-white px-2 py-1 text-eyebrow text-ink-secondary focus:outline-none focus:border-petrol"
        >
          <option value="">{t("noSection")}</option>
          {sections.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <MemberActions
          membershipId={m.id}
          associationId={associationId}
          memberName={m.profile.full_name ?? ""}
          currentTitle={m.title}
          role={m.role}
        />
      </div>
    );
  }

  function SectionHeader({ s, index }: { s: Section; index: number }) {
    if (editingId === s.id) {
      return (
        <div className="flex items-center gap-2 bg-navy-50/50 px-3 py-1.5">
          <input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRename(s.id);
              if (e.key === "Escape") setEditingId(null);
            }}
            autoFocus
            className={`${inputClass} w-44`}
          />
          <button onClick={() => handleRename(s.id)} className="text-eyebrow text-petrol">
            {t("save")}
          </button>
          <button onClick={() => setEditingId(null)} className="text-eyebrow text-ink-tertiary">
            {t("cancel")}
          </button>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 bg-navy-50/50 px-3 py-1.5">
        <p className="flex-1 truncate text-eyebrow uppercase text-navy/70">
          {s.name}{" "}
          <span className="font-normal text-ink-tertiary">
            ({members.filter((m) => sectionOf(m) === s.id).length})
          </span>
        </p>

        {confirmDeleteId === s.id ? (
          <span className="flex items-center gap-2">
            <span className="text-eyebrow text-error">{t("deleteSectionConfirm")}</span>
            <button
              onClick={() => {
                setConfirmDeleteId(null);
                run(() => deleteSection(associationId, s.id));
              }}
              className="text-eyebrow font-medium text-error"
            >
              {t("yes")}
            </button>
            <button onClick={() => setConfirmDeleteId(null)} className="text-eyebrow text-ink-secondary">
              {t("no")}
            </button>
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <button
              onClick={() => run(() => moveSection(associationId, s.id, "up"))}
              disabled={pending || index === 0}
              aria-label={t("moveUp")}
              className="text-eyebrow text-ink-tertiary hover:text-navy disabled:opacity-25"
            >
              ↑
            </button>
            <button
              onClick={() => run(() => moveSection(associationId, s.id, "down"))}
              disabled={pending || index === sections.length - 1}
              aria-label={t("moveDown")}
              className="text-eyebrow text-ink-tertiary hover:text-navy disabled:opacity-25"
            >
              ↓
            </button>
            <button
              onClick={() => {
                setEditingId(s.id);
                setEditName(s.name);
              }}
              className="text-eyebrow text-ink-tertiary hover:text-petrol"
            >
              {t("rename")}
            </button>
            <button
              onClick={() => setConfirmDeleteId(s.id)}
              className="text-eyebrow text-ink-tertiary hover:text-error"
            >
              {t("delete")}
            </button>
          </span>
        )}
      </div>
    );
  }

  const unassigned = members.filter((m) => !sectionOf(m));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-sans text-body font-semibold text-navy">
          {t("membersCount", { count: members.length })}
        </h3>

        {creating ? (
          <div className="flex items-center gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
                if (e.key === "Escape") setCreating(false);
              }}
              placeholder={t("sectionNamePlaceholder")}
              autoFocus
              className={`${inputClass} w-44`}
            />
            <button onClick={handleCreate} className="text-body-sm text-petrol">
              {t("save")}
            </button>
            <button onClick={() => setCreating(false)} className="text-body-sm text-ink-tertiary">
              {t("cancel")}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="text-body-sm text-petrol hover:underline underline-offset-2 decoration-1 whitespace-nowrap"
          >
            {t("newSection")}
          </button>
        )}
      </div>

      {error && <div className="rounded-md bg-error-bg px-3 py-2 text-body-sm text-error">{error}</div>}

      {members.length === 0 ? (
        <div className="rounded-lg border border-border bg-white px-3 py-6 text-center">
          <p className="text-body-sm text-ink-secondary">{t("noMembers")}</p>
          <p className="mt-1 text-eyebrow text-ink-tertiary">{t("noMembersHint")}</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-white overflow-hidden">
          {sections.map((s, i) => (
            <div key={s.id}>
              <SectionHeader s={s} index={i} />
              {members.filter((m) => sectionOf(m) === s.id).length === 0 ? (
                <p className="px-3 py-2 text-eyebrow text-ink-tertiary">{t("emptySection")}</p>
              ) : (
                members.filter((m) => sectionOf(m) === s.id).map((m) => <MemberRow key={m.id} m={m} />)
              )}
            </div>
          ))}

          {/* "Senza sezione" non e' una sezione vera: e' il contenitore di chi non e'
              ancora stato assegnato. Compare solo se serve. */}
          {unassigned.length > 0 && (
            <div>
              {sections.length > 0 && (
                <div className="bg-navy-50/50 px-3 py-1.5">
                  <p className="text-eyebrow uppercase text-navy/70">
                    {t("noSectionGroup")}{" "}
                    <span className="font-normal text-ink-tertiary">({unassigned.length})</span>
                  </p>
                </div>
              )}
              {unassigned.map((m) => (
                <MemberRow key={m.id} m={m} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
