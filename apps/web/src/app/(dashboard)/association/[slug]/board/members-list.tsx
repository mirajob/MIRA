"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
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
}

export interface Person {
  membershipId: string;
  profileId: string;
  role: string;
  title: string | null;
  sectionId: string | null;
  isSelf: boolean;
  fullName: string | null;
  email: string;
  degreeLevel: string | null;
  degreeProgram: string | null;
}

/**
 * Lista unica di tutte le persone dell'associazione: amministratori e membri insieme,
 * senza tabelle separate. Chi amministra si riconosce dall'etichetta sulla riga.
 *
 * Le sezioni compaiono solo con la gestione membership attiva. Vengono renderizzate
 * SEMPRE, anche quando non c'e' ancora nessuno: prima lo stato vuoto le sostituiva, e
 * creando una sezione sembrava non succedesse nulla (in realta' veniva salvata).
 */
export function MembersList({
  associationId,
  slug,
  sections,
  people,
  membershipEnabled,
}: {
  associationId: string;
  slug: string;
  sections: Section[];
  people: Person[];
  membershipEnabled: boolean;
}) {
  const t = useTranslations("Board");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [localSection, setLocalSection] = useState<Record<string, string | null>>({});

  const sectionOf = (p: Person) =>
    p.membershipId in localSection ? localSection[p.membershipId]! : p.sectionId;

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

  function PersonRow({ p }: { p: Person }) {
    const isAdmin = p.role === "association_admin" || p.role === "association_president";
    const studies = [p.degreeLevel, p.degreeProgram].filter(Boolean).join(" · ");

    return (
      <div className="flex items-center gap-3 border-b border-border px-3 py-2 last:border-0 hover:bg-navy-50/50">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy text-eyebrow font-semibold text-white">
          {(p.fullName ?? p.email).charAt(0).toUpperCase()}
        </div>

        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 truncate">
            <Link
              href={`/association/${slug}/board/${p.profileId}/card`}
              className="truncate text-body-sm font-medium text-navy underline-offset-2 hover:underline"
              title={t("viewCard")}
            >
              {p.fullName ?? p.email}
            </Link>
            {isAdmin && (
              <span className="shrink-0 rounded-full bg-petrol-50 px-2 py-0.5 text-eyebrow text-petrol">
                {t("adminBadge")}
              </span>
            )}
            {p.isSelf && <span className="shrink-0 text-eyebrow text-ink-tertiary">{t("selfBadge")}</span>}
            {p.title && <span className="shrink-0 text-eyebrow text-ink-tertiary">{p.title}</span>}
          </p>
          <p className="truncate text-eyebrow text-ink-tertiary">
            {p.email}
            {studies && ` · ${studies}`}
          </p>
        </div>

        {membershipEnabled && sections.length > 0 && (
          <select
            value={sectionOf(p) ?? ""}
            onChange={(e) => handleAssign(p.membershipId, e.target.value)}
            disabled={pending}
            aria-label={t("assignSection")}
            className="max-w-[130px] shrink-0 rounded border border-border bg-white px-2 py-1 text-eyebrow text-ink-secondary focus:border-petrol focus:outline-none"
          >
            <option value="">{t("noSection")}</option>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}

        {!p.isSelf && (
          <MemberActions
            membershipId={p.membershipId}
            associationId={associationId}
            memberName={p.fullName ?? ""}
            currentTitle={p.title}
            role={p.role}
          />
        )}
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

    const count = people.filter((p) => sectionOf(p) === s.id).length;

    return (
      <div className="flex items-center gap-2 bg-navy-50/50 px-3 py-1.5">
        <p className="flex-1 truncate text-eyebrow uppercase text-navy/70">
          {s.name} <span className="font-normal text-ink-tertiary">({count})</span>
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

  const unassigned = people.filter((p) => !sectionOf(p));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-sans text-body font-semibold text-navy">
          {t("listHeading", { count: people.length })}
        </h3>

        {membershipEnabled &&
          (creating ? (
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
              className="whitespace-nowrap text-body-sm text-petrol underline-offset-2 decoration-1 hover:underline"
            >
              {t("newSection")}
            </button>
          ))}
      </div>

      {membershipEnabled && sections.length === 0 && (
        <p className="text-eyebrow text-ink-tertiary">{t("sectionsHint")}</p>
      )}

      {error && <div className="rounded-md bg-error-bg px-3 py-2 text-body-sm text-error">{error}</div>}

      <div className="overflow-hidden rounded-lg border border-border bg-white">
        {/* Le sezioni si mostrano sempre, anche vuote: sono l'impalcatura che l'utente
            costruisce prima che arrivi qualcuno. */}
        {membershipEnabled &&
          sections.map((s, i) => {
            const inSection = people.filter((p) => sectionOf(p) === s.id);
            return (
              <div key={s.id}>
                <SectionHeader s={s} index={i} />
                {inSection.length === 0 ? (
                  <p className="px-3 py-2 text-eyebrow text-ink-tertiary">{t("emptySection")}</p>
                ) : (
                  inSection.map((p) => <PersonRow key={p.membershipId} p={p} />)
                )}
              </div>
            );
          })}

        {unassigned.length > 0 ? (
          <div>
            {membershipEnabled && sections.length > 0 && (
              <div className="bg-navy-50/50 px-3 py-1.5">
                <p className="text-eyebrow uppercase text-navy/70">
                  {t("noSectionGroup")}{" "}
                  <span className="font-normal text-ink-tertiary">({unassigned.length})</span>
                </p>
              </div>
            )}
            {unassigned.map((p) => (
              <PersonRow key={p.membershipId} p={p} />
            ))}
          </div>
        ) : (
          people.length === 0 && (
            <div className="px-3 py-6 text-center">
              <p className="text-body-sm text-ink-secondary">{t("noPeople")}</p>
              <p className="mt-1 text-eyebrow text-ink-tertiary">{t("noPeopleHint")}</p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
