import { createServerClient } from "@mira/supabase/server";
import { notFound } from "next/navigation";
import { BoardMemberList } from "./board-member-list";
import { InviteMemberForm } from "./invite-member-form";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function BoardPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createServerClient();

  const { data: association } = await supabase
    .from("association_profiles")
    .select("id, name, slug")
    .eq("slug", slug)
    .maybeSingle();

  if (!association) notFound();

  const { data: members } = await supabase
    .from("association_memberships")
    .select("*, profiles(id, full_name, email, avatar_url)")
    .eq("association_id", association.id)
    .eq("status", "active")
    .order("created_at");

  const { data: pendingInvites } = await supabase
    .from("invitations")
    .select("*")
    .eq("association_id", association.id)
    .eq("invitation_type", "association_board_member")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-h2 text-navy">Board</h2>
        <p className="mt-1 text-body text-ink-secondary">
          Gestisci i membri del board e i loro permessi
        </p>
      </div>

      <InviteMemberForm associationId={association.id} slug={slug} />

      {pendingInvites && pendingInvites.length > 0 && (
        <div>
          <h3 className="font-sans text-h3 text-navy mb-3">Inviti in attesa</h3>
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
                {pendingInvites.map((inv) => (
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
        <h3 className="font-sans text-h3 text-navy mb-3">Membri attivi</h3>
        <BoardMemberList
          members={(members ?? []).map((m) => ({
            id: m.id,
            role: m.role,
            permissions: m.permissions as Record<string, boolean>,
            profile: m.profiles as { id: string; full_name: string | null; email: string; avatar_url: string | null },
          }))}
          associationId={association.id}
          slug={slug}
        />
      </div>
    </div>
  );
}
