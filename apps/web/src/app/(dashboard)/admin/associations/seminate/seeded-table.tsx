"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  publishSeededAssociation,
  unpublishSeededAssociation,
  publishSeededAssociations,
} from "@/lib/actions/association-seeding";
import { deleteAssociationAccount } from "@/lib/actions/admin-delete";

export interface SeededRow {
  id: string;
  name: string;
  slug: string;
  university: string | null;
  published: boolean;
  interestCount: number;
}

/**
 * Tabella di revisione delle pagine seminate. L'anteprima non è qui: il link porta
 * sulla vetrina vera, che è dove si pubblica. Qui si vede solo lo stato d'insieme e
 * si pubblica in blocco un lotto già riletto.
 */
export function SeededTable({ rows }: { rows: SeededRow[] }) {
  const t = useTranslations("AdminSeededAssociations");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const router = useRouter();

  const selectableIds = rows.filter((r) => !r.published).map((r) => r.id);
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selected.has(id));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(selectableIds));
  }

  async function handleToggle(row: SeededRow) {
    setBusyId(row.id);
    const result = row.published
      ? await unpublishSeededAssociation(row.id)
      : await publishSeededAssociation(row.id);
    if (result.error) window.alert(result.error);
    router.refresh();
    setBusyId(null);
  }

  async function handleDelete(row: SeededRow) {
    const word = t("deleteConfirmWord");
    const answer = window.prompt(t("deleteConfirmPrompt", { name: row.name, word }));
    if (answer !== word) return;

    setBusyId(row.id);
    const result = await deleteAssociationAccount(row.id);
    if (result.error) window.alert(result.error);
    router.refresh();
    setBusyId(null);
  }

  async function handleBulkPublish() {
    const ids = [...selected];
    if (!ids.length) return;
    if (!window.confirm(t("bulkConfirm", { count: ids.length }))) return;

    setBulkLoading(true);
    const result = await publishSeededAssociations(ids);
    if (result.error) window.alert(result.error);
    else setSelected(new Set());
    router.refresh();
    setBulkLoading(false);
  }

  if (!rows.length) {
    return (
      <div className="rounded-lg border border-border bg-white p-6 text-center">
        <p className="text-body-sm text-ink-secondary">{t("emptyState")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-petrol/30 bg-petrol-50 px-3 py-2">
          <p className="text-body-sm text-ink">{t("selectedCount", { count: selected.size })}</p>
          <button
            onClick={handleBulkPublish}
            disabled={bulkLoading}
            className="ml-auto rounded-md bg-petrol px-4 py-1.5 text-body-sm text-white hover:bg-petrol-700 transition-colors duration-100 disabled:opacity-40"
          >
            {bulkLoading ? t("working") : t("publishSelected")}
          </button>
        </div>
      )}

      <div className="rounded-lg border border-border bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px]">
            <thead>
              <tr className="border-b border-border">
                <th className="w-8 px-3 py-2 text-left">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    disabled={selectableIds.length === 0}
                    aria-label={t("selectAll")}
                  />
                </th>
                <th className="px-3 py-2 text-left text-eyebrow uppercase text-navy/60">{t("colAssociation")}</th>
                <th className="px-3 py-2 text-left text-eyebrow uppercase text-navy/60">{t("colUniversity")}</th>
                <th className="px-3 py-2 text-left text-eyebrow uppercase text-navy/60">{t("colStatus")}</th>
                <th className="px-3 py-2 text-left text-eyebrow uppercase text-navy/60">{t("colInterest")}</th>
                <th className="px-3 py-2 text-left text-eyebrow uppercase text-navy/60">{t("colActions")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-border last:border-0 hover:bg-paper transition-colors">
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selected.has(row.id)}
                      onChange={() => toggle(row.id)}
                      disabled={row.published}
                      aria-label={row.name}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <p className="text-body-sm font-medium text-navy">{row.name}</p>
                    <p className="text-eyebrow text-ink-tertiary">/{row.slug}</p>
                  </td>
                  <td className="px-3 py-2 text-body-sm text-ink">{row.university ?? "–"}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${
                        row.published ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {row.published ? t("statusPublished") : t("statusDraft")}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-body-sm text-ink">{row.interestCount || "–"}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/associations/${row.slug}`}
                        className="text-body-sm text-petrol underline underline-offset-2 decoration-1 hover:text-petrol-700"
                      >
                        {t("review")}
                      </Link>
                      <button
                        onClick={() => handleToggle(row)}
                        disabled={busyId === row.id}
                        className="text-body-sm font-medium text-navy hover:underline disabled:opacity-40"
                      >
                        {row.published ? t("unpublish") : t("publish")}
                      </button>
                      <button
                        onClick={() => handleDelete(row)}
                        disabled={busyId === row.id}
                        className="text-body-sm text-error hover:underline disabled:opacity-40"
                      >
                        {t("delete")}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
