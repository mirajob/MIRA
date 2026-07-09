import { createServerClient } from "@mira/supabase/server";
import { AcceptInvitation } from "./accept-invitation";
import Link from "next/link";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function InvitePage({ params }: Props) {
  const { token } = await params;
  const supabase = await createServerClient();

  const { data: { user } } = await supabase.auth.getUser();

  const { data: invitation } = await supabase
    .from("invitations")
    .select("*")
    .eq("invitation_token", token)
    .maybeSingle();

  if (!invitation) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <div className="max-w-md text-center space-y-4 px-4">
          <img src="/brand/mira-lockup.svg" alt="MIRA" className="mx-auto h-7" />
          <h1 className="font-display text-h1 text-navy mt-8">Invito non trovato</h1>
          <p className="text-body text-ink-secondary">
            Questo link di invito non è valido o è stato rimosso.
          </p>
          <Link href="/" className="text-petrol underline underline-offset-2 decoration-1 hover:text-petrol-700">
            Torna alla homepage
          </Link>
        </div>
      </div>
    );
  }

  if (invitation.status !== "pending") {
    const message =
      invitation.status === "accepted" ? "Questo invito è già stato accettato."
      : invitation.status === "expired" ? "Questo invito è scaduto."
      : invitation.status === "revoked" ? "Questo invito è stato revocato."
      : "Questo invito non è più valido.";

    return (
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <div className="max-w-md text-center space-y-4 px-4">
          <img src="/brand/mira-lockup.svg" alt="MIRA" className="mx-auto h-7" />
          <h1 className="font-display text-h1 text-navy mt-8">Invito non disponibile</h1>
          <p className="text-body text-ink-secondary">{message}</p>
          <Link href="/login" className="text-petrol underline underline-offset-2 decoration-1 hover:text-petrol-700">
            Accedi a MIRA
          </Link>
        </div>
      </div>
    );
  }

  const isExpired = new Date(invitation.expires_at) < new Date();
  if (isExpired) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <div className="max-w-md text-center space-y-4 px-4">
          <img src="/brand/mira-lockup.svg" alt="MIRA" className="mx-auto h-7" />
          <h1 className="font-display text-h1 text-navy mt-8">Invito scaduto</h1>
          <p className="text-body text-ink-secondary">
            Questo invito è scaduto. Contatta l&apos;amministratore MIRA per riceverne uno nuovo.
          </p>
        </div>
      </div>
    );
  }

  const metadata = invitation.metadata as Record<string, string>;

  const copy =
    invitation.invitation_type === "company_admin"
      ? {
          title: `Amministratore di ${metadata.company_name}`,
          body: (
            <>
              Sei stato invitato ufficialmente ad attivare l&apos;account di{" "}
              <strong className="text-navy">{metadata.company_name}</strong> su MIRA.
            </>
          ),
        }
      : {
          title: `Presidente di ${metadata.association_name}`,
          body: (
            <>
              Sei stato invitato ufficialmente a gestire l&apos;associazione{" "}
              <strong className="text-navy">{metadata.association_name}</strong> su MIRA.
            </>
          ),
        };

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper">
      <div className="w-full max-w-md space-y-6 px-4">
        <div className="text-center">
          <img src="/brand/mira-lockup.svg" alt="MIRA" className="mx-auto h-7" />
        </div>

        <div className="rounded-lg border border-border bg-white p-6 space-y-4">
          <p className="text-eyebrow text-navy/60 uppercase">Invito ufficiale</p>
          <h1 className="font-display text-h1 text-navy">{copy.title}</h1>
          <p className="text-body text-ink-secondary">{copy.body}</p>
          {metadata.note && (
            <p className="text-body-sm text-ink-tertiary italic">
              &ldquo;{metadata.note}&rdquo;
            </p>
          )}

          <AcceptInvitation
            token={token}
            invitedEmail={invitation.invited_email}
            currentEmail={user?.email ?? null}
            invitationType={invitation.invitation_type}
          />
        </div>
      </div>
    </div>
  );
}
