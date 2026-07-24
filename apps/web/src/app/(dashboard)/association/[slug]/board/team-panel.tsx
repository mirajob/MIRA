"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  createSection,
  renameSection,
  deleteSection,
  moveSection,
  assignMemberToSection,
} from "@/lib/actions/membership";
import { MiraGuide } from "@/components/mira-guide";
import { InviteCodeSection } from "./invite-code-section";
import { PendingBoardRequests } from "./pending-board-requests";
import { MemberActions } from "./member-actions";
import type { Person } from "./members-list";

interface Section {
  id: string;
  name: string;
}

interface PendingRequest {
  id: string;
  title: string | null;
  profile: { full_name: string | null; email: string };
}

/**
 * La sezione "team" dell'associazione, a card: MIRA spiega in cima come funziona (inviti dal
 * link -> membri; chi rendi admin ha la tua stessa dashboard; gli altri li organizzi in
 * sezioni per ruolo), poi il link d'invito, le richieste in attesa e i membri come card,
 * raggruppati per sezione. Usata sia nella tab Membri sia nell'onboarding.
 */
export function TeamPanel({
  associationId,
  slug,
  currentCode,
  people,
  sections,
  pendingRequests,
}: {
  associationId: string;
  slug: string;
  currentCode: string | null;
  people: Person[];
  sections: Section[];
  pendingRequests: PendingRequest[];
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

  function MemberCard({ p }: { p: Person }) {
    const isAdmin = p.role === "association_admin" || p.role === "association_president";
    const studies = [p.degreeLevel, p.degreeProgram].filter(Boolean).join(" · ");

    return (
      <div className="flex flex-col rounded-lg border border-border bg-white p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy text-body-sm font-semibold text-white">
            {(p.fullName ?? p.email).charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <Link
              href={`/association/${slug}/board/${p.profileId}/card`}
              className="block truncate text-body font-medium text-navy underline-offset-2 hover:underline"
              title={t("viewCard")}
            >
              {p.fullName ?? p.email}
            </Link>
            {studies && <p className="truncate text-body-sm text-ink-secondary">{studies}</p>}
            <p className="truncate text-eyebrow text-ink-tertiary">{p.email}</p>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {isAdmin && (
            <span className="rounded-full bg-petrol-50 px-2 py-0.5 text-eyebrow text-petrol">{t("adminBadge")}</span>
          )}
          {p.isSelf && <span className="text-eyebrow text-ink-tertiary">{t("selfBadge")}</span>}
          {p.title && <span className="text-eyebrow text-ink-tertiary">{p.title}</span>}
        </div>

        {sections.length > 0 && (
          <select
            value={sectionOf(p) ?? ""}
            onChange={(e) => handleAssign(p.membershipId, e.target.value)}
            disabled={pending}
            aria-label={t("assignSection")}
            className="mt-2 w-full rounded border border-border bg-paper px-2 py-1 text-eyebrow text-ink-secondary focus:border-petrol focus:outline-none"
          >
            <option value="">{t("noSection")}</option>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}

        <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
          <Link
            href={`/association/${slug}/board/${p.profileId}/card`}
            className="text-body-sm text-petrol hover:text-petrol-700 transition-colors"
          >
            {t("openCard")}
          </Link>
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
      </div>
    );
  }

  function SectionHeader({ s, index }: { s: Section; index: number }) {
    if (editingId === s.id) {
      return (
        <div className="flex items-center gap-2">
          <input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRename(s.id);
              if (e.key === "Escape") setEditingId(null);
            }}
            autoFocus
            className="w-44 rounded border border-petrol bg-white px-2 py-1 text-body-sm text-ink focus:outline-none"
          />
          <button onClick={() => handleRename(s.id)} className="text-eyebrow text-petrol">{t("save")}</button>
          <button onClick={() => setEditingId(null)} className="text-eyebrow text-ink-tertiary">{t("cancel")}</button>
        </div>
      );
    }

    const count = people.filter((p) => sectionOf(p) === s.id).length;

    return (
      <div className="flex items-center gap-2">
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
            <button onClick={() => setConfirmDeleteId(null)} className="text-eyebrow text-ink-secondary">{t("no")}</button>
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <button onClick={() => run(() => moveSection(associationId, s.id, "up"))} disabled={pending || index === 0} aria-label={t("moveUp")} className="text-eyebrow text-ink-tertiary hover:text-navy disabled:opacity-25">↑</button>
            <button onClick={() => run(() => moveSection(associationId, s.id, "down"))} disabled={pending || index === sections.length - 1} aria-label={t("moveDown")} className="text-eyebrow text-ink-tertiary hover:text-navy disabled:opacity-25">↓</button>
            <button onClick={() => { setEditingId(s.id); setEditName(s.name); }} className="text-eyebrow text-ink-tertiary hover:text-petrol">{t("rename")}</button>
            <button onClick={() => setConfirmDeleteId(s.id)} className="text-eyebrow text-ink-tertiary hover:text-error">{t("delete")}</button>
          </span>
        )}
      </div>
    );
  }

  const unassigned = people.filter((p) => !sectionOf(p));

  return (
    <div className="space-y-4">
      <MiraGuide text={t("guideTeam")} />

      <InviteCodeSection associationId={associationId} currentCode={currentCode} membershipEnabled compact />

      {pendingRequests.length > 0 && (
        <PendingBoardRequests associationId={associationId} requests={pendingRequests} />
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-eyebrow uppercase text-navy/60">{t("listHeading", { count: people.length })}</p>
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
                className="w-44 rounded border border-petrol bg-white px-2 py-1 text-body-sm text-ink focus:outline-none"
              />
              <button onClick={handleCreate} className="text-body-sm text-petrol">{t("save")}</button>
              <button onClick={() => setCreating(false)} className="text-body-sm text-ink-tertiary">{t("cancel")}</button>
            </div>
          ) : (
            <button onClick={() => setCreating(true)} className="whitespace-nowrap text-body-sm text-petrol underline-offset-2 decoration-1 hover:underline">
              {t("newSection")}
            </button>
          )}
        </div>

        {sections.length === 0 && <p className="text-eyebrow text-ink-tertiary">{t("sectionsHint")}</p>}
        {error && <div className="rounded-md bg-error-bg px-3 py-2 text-body-sm text-error">{error}</div>}

        {people.length === 0 ? (
          <div className="rounded-lg border border-border bg-white px-5 py-8 text-center">
            <p className="text-body-sm text-ink-secondary">{t("noPeople")}</p>
            <p className="mt-1 text-eyebrow text-ink-tertiary">{t("noPeopleHint")}</p>
          </div>
        ) : (
          <>
            {sections.map((s, i) => {
              const inSection = people.filter((p) => sectionOf(p) === s.id);
              return (
                <div key={s.id} className="space-y-2">
                  <SectionHeader s={s} index={i} />
                  {inSection.length === 0 ? (
                    <p className="text-eyebrow text-ink-tertiary">{t("emptySection")}</p>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {inSection.map((p) => <MemberCard key={p.membershipId} p={p} />)}
                    </div>
                  )}
                </div>
              );
            })}

            {unassigned.length > 0 && (
              <div className="space-y-2">
                {sections.length > 0 && (
                  <p className="text-eyebrow uppercase text-navy/70">
                    {t("noSectionGroup")} <span className="font-normal text-ink-tertiary">({unassigned.length})</span>
                  </p>
                )}
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {unassigned.map((p) => <MemberCard key={p.membershipId} p={p} />)}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
