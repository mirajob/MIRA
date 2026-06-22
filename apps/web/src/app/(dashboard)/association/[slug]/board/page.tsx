/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServiceClient } from "@mira/supabase/server";
import { notFound } from "next/navigation";
import { BoardMemberList } from "./board-member-list";
import { InviteMemberForm } from "./invite-member-form";
import { InviteCodeSection } from "./invite-code-section";
import { PendingBoardRequests } from "./pending-board-requests";

interface Props {
  params: Promise<{ slug: string }>;
}

const WORKSPACE_ROLES = ["association_president", "association_admin", "association_reviewer", "association_interviewer"];

export default async function BoardPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createServiceClient();

  const { data: association } = await (supabase.from("association_profiles") as any)
    .select("id, name, slug, invite_code")
    .eq("slug", slug)
    .maybeSingle();

  if (!association) notFound();

  // Query memberships (no join - PostgREST FK may not exist)
  const { data: allMemberships } = await (supabase.from("association_memberships") as any)
    .select("id, user_id, role, title, permissions, status, created_at")
    .eq("association_id", association.id)
    .in("status", ["active", "pending_approval"])
    .order("created_at");

  // Get profile data for all member user_ids
  const userIds = (allMemberships ?? []).map((m: any) => m.user_id).filter(Boolean);
  const { data: profilesData } = userIds.length > 0
    ? await (supabase.from("profiles") as any)
        .select("id, full_name, email, avatar_url")
        .in("id", userIds)
    : { data: [] };

  const profileMap = new Map<string, any>();
  for (const p of (profilesData ?? [])) {
    profileMap.set(p.id, p);
  }

  // Merge memberships with profiles
  const allMembers = (allMemberships ?? []).map((m: any) => ({
    ...m,
    profiles: profileMap.get(m.user_id) ?? { id: m.user_id, full_name: null, email: "—", avatar_url: null },
  }));

  const activeMembers = allMembers.filter((m: any) => m.status === "active");
  const pendingBoardRequests = allMembers.filter((m: any) => m.status === "pending_approval");

  const boardMembers = activeMembers.filter((m: any) => {
    if (WORKSPACE_ROLES.includes(m.role)) return true;
    const perms = m.permissions as Record<string, boolean> | null;
    return perms && Object.values(perms).some((v) => v === true);
  });

  const regularMembers = activeMembers.filter((m: any) => {
    if (WORKSPACE_ROLES.includes(m.role)) return false;
    const perms = m.permissions as Record<string, boolean> | null;
    return !perms || !Object.values(perms).some((v) => v === true);
  });

  const { data: pendingInvites } = await (supabase.from("invitations") as any)
    .select("*")
    .eq("association_id", association.id)
    .eq("invitation_type", "association_board_member")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  const mapMember = (m: any) => ({
    id: m.id,
    role: m.role,
    title: (m as any).title as string | null,
    permissions: m.permissions as Record<string, boolean>,
    profile: m.profiles as { id: string; full_name: string | null; email: string; avatar_url: string | null },
  });

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-h2 text-navy">Board & Membri</h2>
        <p className="mt-1 text-body text-ink-secondary">
          Gestisci il board, i membri e i codici invito
        </p>
      </div>

      <InviteCodeSection
        associationId={association.id}
        currentCode={association.invite_code}
        slug={slug}
      />

      <InviteMemberForm associationId={association.id} slug={slug} />

      {pendingBoardRequests.length > 0 && (
        <PendingBoardRequests
          requests={pendingBoardRequests.map(mapMember)}
          associationId={association.id}
        />
      )}

      {pendingInvites && pendingInvites.length > 0 && (
        <div>
          <h3 className="font-sans text-h3 text-navy mb-3">Inviti email in attesa</h3>
          <div className="rounded-lg border border-border bg-white overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-eyebrow text-navy/60 uppercase py-3 px-4">Email</th>
                  <th className="text-left text-eyebrow text-navy/60 uppercase py-3 px-4">Ruolo</th>
                  <th className="text-left text-eyebrow text-navy/60 uppercase py-3 px-4">Scadenza</th>
                </tr>
              </thead>
              <tbody>
                {pendingInvites.map((inv: any) => (
                  <tr key={inv.id} className="border-b border-border last:border-0">
                    <td className="py-3 px-4 text-body text-ink">{inv.invited_email}</td>
                    <td className="py-3 px-4 text-body-sm text-ink">{inv.invited_role?.replace("association_", "")}</td>
                    <td className="py-3 px-4 text-body-sm text-ink-tertiary">
                      {new Date(inv.expires_at).toLocaleDateString("it-IT")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div>
        <h3 className="font-sans text-h3 text-navy mb-3">Board ({boardMembers.length})</h3>
        <BoardMemberList
          members={boardMembers.map(mapMember)}
          associationId={association.id}
          slug={slug}
        />
      </div>

      <div>
        <h3 className="font-sans text-h3 text-navy mb-3">Membri ({regularMembers.length})</h3>
        {regularMembers.length === 0 ? (
          <div className="rounded-lg border border-border bg-white p-6 text-center">
            <p className="text-body text-ink-secondary">Nessun membro semplice</p>
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-white overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-eyebrow text-navy/60 uppercase py-3 px-4">Membro</th>
                  <th className="text-left text-eyebrow text-navy/60 uppercase py-3 px-4">Ruolo specifico</th>
                </tr>
              </thead>
              <tbody>
                {regularMembers.map((m: any) => {
                  const profile = m.profiles as any;
                  return (
                    <tr key={m.id} className="border-b border-border last:border-0 hover:bg-navy-50/50">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-ink-tertiary/20 text-ink text-eyebrow font-semibold">
                            {(profile?.full_name ?? profile?.email ?? "?").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-body font-medium text-navy">{profile?.full_name ?? "—"}</p>
                            <p className="text-body-sm text-ink-tertiary">{profile?.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-body-sm text-ink-secondary">
                        {(m as any).title ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
