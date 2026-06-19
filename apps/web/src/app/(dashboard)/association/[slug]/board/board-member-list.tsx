"use client";

import { removeBoardMember } from "@/lib/actions/board";
import { ASSOCIATION_PERMISSIONS } from "@mira/domain";

interface Member {
  id: string;
  role: string;
  permissions: Record<string, boolean>;
  profile: {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  };
}

const ROLE_LABELS: Record<string, string> = {
  association_president: "Presidente",
  association_admin: "Admin",
  association_reviewer: "Reviewer",
  association_interviewer: "Interviewer",
  association_member: "Membro",
};

export function BoardMemberList({
  members,
  associationId,
  slug,
}: {
  members: Member[];
  associationId: string;
  slug: string;
}) {
  if (members.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-white p-8 text-center">
        <p className="text-body text-ink-secondary">Nessun membro nel board</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-white overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left text-eyebrow text-navy/60 uppercase py-3 px-4">Membro</th>
            <th className="text-left text-eyebrow text-navy/60 uppercase py-3 px-4">Ruolo</th>
            <th className="text-left text-eyebrow text-navy/60 uppercase py-3 px-4">Permessi</th>
            <th className="text-right text-eyebrow text-navy/60 uppercase py-3 px-4">Azioni</th>
          </tr>
        </thead>
        <tbody>
          {members.map((member) => {
            const activePerms = ASSOCIATION_PERMISSIONS.filter(
              (p) => member.role === "association_president" || member.permissions[p]
            );
            const isPresident = member.role === "association_president";

            return (
              <tr key={member.id} className="border-b border-border last:border-0 hover:bg-navy-50/50">
                <td className="py-4 px-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-navy text-white text-eyebrow font-semibold">
                      {(member.profile.full_name ?? member.profile.email).charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-body font-medium text-navy">
                        {member.profile.full_name ?? "—"}
                      </p>
                      <p className="text-body-sm text-ink-tertiary">{member.profile.email}</p>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-body-sm font-medium ${
                    isPresident ? "bg-petrol-50 text-petrol-700" : "bg-navy-50 text-navy"
                  }`}>
                    {ROLE_LABELS[member.role] ?? member.role}
                  </span>
                </td>
                <td className="py-4 px-4">
                  <p className="text-body-sm text-ink-secondary">
                    {isPresident ? "Tutti" : `${activePerms.length} permessi`}
                  </p>
                </td>
                <td className="py-4 px-4 text-right">
                  {!isPresident && (
                    <form action={() => removeBoardMember(associationId, member.id)}>
                      <button
                        type="submit"
                        className="text-body-sm text-error hover:text-error/80 transition-colors duration-100"
                      >
                        Rimuovi
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
