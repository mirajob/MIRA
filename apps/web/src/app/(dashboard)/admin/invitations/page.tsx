import { createServerClient } from "@mira/supabase/server";
import { InvitationForm } from "./invitation-form";
import { InvitationList } from "./invitation-list";

export default async function AdminInvitationsPage() {
  const supabase = await createServerClient();

  const { data: invitations } = await supabase
    .from("invitations")
    .select("*")
    .eq("invitation_type", "association_president")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-h1 text-navy">Inviti Presidenti</h1>
        <p className="mt-1 text-body text-ink-secondary">
          Invita ufficialmente i presidenti delle associazioni su MIRA
        </p>
      </div>

      <InvitationForm />

      <div>
        <h2 className="font-display text-h2 text-navy mb-4">Inviti inviati</h2>
        <InvitationList invitations={invitations ?? []} />
      </div>
    </div>
  );
}
