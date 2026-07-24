"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { MemberActions } from "./member-actions";
import type { Person } from "./members-list";

/**
 * I membri come card: una griglia di schede compatte, ognuna apre la MiraCard della persona.
 * Sostituisce la lista densa nella dashboard beta — stesso linguaggio visivo della pagina
 * pubblica e dei cicli. Gli amministratori vengono prima.
 */
export function MemberCardsGrid({
  associationId,
  slug,
  people,
}: {
  associationId: string;
  slug: string;
  people: Person[];
}) {
  const t = useTranslations("Board");

  if (people.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-white px-5 py-8 text-center">
        <p className="text-body-sm text-ink-secondary">{t("noPeople")}</p>
        <p className="mt-1 text-eyebrow text-ink-tertiary">{t("noPeopleHint")}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {people.map((p) => {
        const isAdmin = p.role === "association_admin" || p.role === "association_president";
        const studies = [p.degreeLevel, p.degreeProgram].filter(Boolean).join(" · ");

        return (
          <div key={p.membershipId} className="flex flex-col rounded-lg border border-border bg-white p-4">
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
      })}
    </div>
  );
}
