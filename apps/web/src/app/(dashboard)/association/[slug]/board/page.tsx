/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServiceClient } from "@mira/supabase/server";
import { getUserContext } from "@/lib/auth";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { InviteCodeSection } from "./invite-code-section";
import { PendingBoardRequests } from "./pending-board-requests";
import { MemberActions } from "./member-actions";
import { MembershipToggle } from "./membership-toggle";
import { MembersPanel } from "./members-panel";
import { WORKSPACE_ROLES } from "@/lib/association-roles";

interface Props {
  params: Promise<{ slug: string }>;
}

function isBoard(m: any): boolean {
  if (WORKSPACE_ROLES.includes(m.role)) return true;
  const perms = m.permissions as Record<string, boolean> | null;
  return !!perms && Object.values(perms).some((v) => v === true);
}

export default async function BoardPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createServiceClient();
  const ctx = await getUserContext();
  const currentUserId = (ctx.profile as any).id as string;
  const t = await getTranslations("Board");
  const c = await getTranslations("Common");

  const { data: association } = await (supabase.from("association_profiles") as any)
    .select("id, name, slug, invite_code, membership_enabled")
    .eq("slug", slug)
    .maybeSingle();

  if (!association) notFound();

  const { data: allMemberships } = await (supabase.from("association_memberships") as any)
    .select("id, user_id, role, title, permissions, status, section_id, created_at")
    .eq("association_id", association.id)
    .in("status", ["active", "pending_approval"])
    .order("created_at");

  const { data: sectionsData } = await (supabase.from("association_sections") as any)
    .select("id, name, position")
    .eq("association_id", association.id)
    .order("position");

  const userIds = (allMemberships ?? []).map((m: any) => m.user_id).filter(Boolean);
  const { data: profilesData } = userIds.length > 0
    ? await (supabase.from("profiles") as any)
        .select("id, full_name, email, avatar_url")
        .in("id", userIds)
    : { data: [] };

  const profileMap = new Map<string, any>();
  for (const p of (profilesData ?? [])) profileMap.set(p.id, p);

  const allMembers = (allMemberships ?? []).map((m: any) => ({
    ...m,
    profiles: profileMap.get(m.user_id) ?? { id: m.user_id, full_name: null, email: "—", avatar_url: null },
  }));

  // Due gruppi distinti: chi ha accesso alla dashboard (board) e i membri semplici,
  // che esistono solo se l'associazione ha acceso la gestione membership.
  const boardMembers = allMembers.filter((m: any) => m.status === "active" && isBoard(m));
  const plainMembers = allMembers.filter((m: any) => m.status === "active" && !isBoard(m));
  const pendingBoardRequests = allMembers.filter((m: any) => m.status === "pending_approval");

  const sections = (sectionsData ?? []) as { id: string; name: string; position: number }[];

  const mapMember = (m: any) => ({
    id: m.id,
    role: m.role,
    title: m.title as string | null,
    permissions: m.permissions as Record<string, boolean>,
    profile: m.profiles as { id: string; full_name: string | null; email: string; avatar_url: string | null },
  });

  function renderMemberRow(m: any) {
    const profile = m.profiles;
    const isSelf = m.user_id === currentUserId;
    const isPresident = m.role === "association_president";

    return (
      <tr key={m.id} className="border-b border-border last:border-0 hover:bg-navy-50/50">
        <td className="py-4 px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full text-eyebrow font-semibold bg-navy text-white">
              {(profile?.full_name ?? profile?.email ?? "?").charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-body font-medium text-navy">{profile?.full_name ?? "—"}</p>
              <p className="text-body-sm text-ink-tertiary">{profile?.email}</p>
            </div>
          </div>
        </td>
        <td className="py-4 px-4 text-body-sm text-ink-secondary">
          {m.title || "—"}
        </td>
        <td className="py-4 px-4 text-right">
          {!isSelf && !isPresident && (
            <MemberActions
              membershipId={m.id}
              associationId={association.id}
              memberName={profile?.full_name ?? ""}
              currentTitle={m.title}
              role={m.role}
            />
          )}
          {isPresident && <span className="text-xs text-ink-tertiary">{c("boardRoles.association_president")}</span>}
          {isSelf && !isPresident && <span className="text-xs text-ink-tertiary">{t("selfBadge")}</span>}
        </td>
      </tr>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-h2 text-navy">{t("heading")}</h2>
        <p className="mt-1 text-body text-ink-secondary">
          {t("subhead")}
        </p>
      </div>

      <InviteCodeSection
        associationId={association.id}
        currentCode={association.invite_code}
        slug={slug}
      />

      {pendingBoardRequests.length > 0 && (
        <PendingBoardRequests
          requests={pendingBoardRequests.map(mapMember)}
          associationId={association.id}
        />
      )}

      <div>
        <h3 className="font-sans text-h3 text-navy mb-3">{t("boardCount", { count: boardMembers.length })}</h3>
        {boardMembers.length === 0 ? (
          <div className="rounded-lg border border-border bg-white p-6 text-center">
            <p className="text-body text-ink-secondary">{t("noMembers")}</p>
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-white overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-eyebrow text-navy/60 uppercase py-3 px-4">{t("tableHeaderMember")}</th>
                  <th className="text-left text-eyebrow text-navy/60 uppercase py-3 px-4">{t("tableHeaderRole")}</th>
                  <th className="text-right text-eyebrow text-navy/60 uppercase py-3 px-4">{t("tableHeaderActions")}</th>
                </tr>
              </thead>
              <tbody>
                {boardMembers.map((m: any) => renderMemberRow(m))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <MembershipToggle
        associationId={association.id}
        enabled={Boolean(association.membership_enabled)}
      />

      {association.membership_enabled && (
        <MembersPanel
          associationId={association.id}
          sections={sections}
          members={plainMembers.map((m: any) => ({
            id: m.id,
            role: m.role,
            title: m.title as string | null,
            sectionId: (m.section_id as string | null) ?? null,
            profile: {
              full_name: m.profiles?.full_name ?? null,
              email: m.profiles?.email ?? "—",
            },
          }))}
        />
      )}
    </div>
  );
}
