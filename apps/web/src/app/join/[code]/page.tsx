/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { createServiceClient } from "@mira/supabase/server";
import { getUser } from "@/lib/auth";
import { CornerLocale } from "@/components/corner-locale";
import { JoinForm } from "./join-form";

interface Props {
  params: Promise<{ code: string }>;
}

/**
 * Ingresso in un'associazione tramite link d'invito.
 *
 * Il codice va PRESERVATO attraverso l'autenticazione: chi apre il link senza essere loggato
 * viene mandato a login/registrazione con redirect=/join/CODE, cosi' torna qui gia' loggato e
 * la richiesta si collega davvero all'associazione. Prima il form era mostrato a tutti e il
 * pulsante rimbalzava al login perdendo il codice: la richiesta non veniva mai creata.
 */
export default async function JoinPage({ params }: Props) {
  const { code } = await params;
  const supabase = await createServiceClient();

  const { data: association } = await (supabase.from("association_profiles") as any)
    .select("id, name")
    .eq("invite_code", code)
    .maybeSingle();

  const backTo = `/join/${encodeURIComponent(code)}`;

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper">
      <div className="w-full max-w-md space-y-6 px-4">
        <div className="text-center">
          <CornerLocale />
          <img src="/brand/mira-lockup.svg" alt="MIRA" className="mx-auto h-7" />
        </div>

        {!association ? (
          <div className="rounded-lg border border-border bg-white p-6 space-y-3 text-center">
            <h1 className="font-display text-h2 text-navy">Codice non valido</h1>
            <p className="text-body text-ink-secondary">
              Questo link d&apos;invito non è più valido. Chiedi all&apos;associazione un link aggiornato.
            </p>
          </div>
        ) : (
          <JoinGate code={code} associationName={association.name as string} backTo={backTo} />
        )}
      </div>
    </div>
  );
}

/** Loggato -> form d'ingresso; non loggato -> accesso/registrazione col codice preservato. */
async function JoinGate({ code, associationName, backTo }: { code: string; associationName: string; backTo: string }) {
  const user = await getUser();

  if (user) return <JoinForm code={code} associationName={associationName} />;

  return (
    <div className="rounded-lg border border-border bg-white p-6 space-y-5">
      <h1 className="font-display text-h2 text-navy">Entra in {associationName}</h1>
      <p className="text-body text-ink-secondary">
        Sei stato invitato con il codice <strong className="text-navy">{code}</strong>. Accedi o registrati per inviare
        la richiesta: dopo l&apos;accesso torni qui e la completi.
      </p>

      <div className="space-y-2">
        <Link
          href={`/login?redirect=${encodeURIComponent(backTo)}`}
          className="block w-full text-center bg-navy text-white px-6 py-3 rounded-md text-label hover:bg-navy-700 active:scale-[0.98] transition-colors duration-100"
        >
          Accedi
        </Link>
        <Link
          href={`/signup?redirect=${encodeURIComponent(backTo)}`}
          className="block w-full text-center bg-white text-navy border border-border px-6 py-3 rounded-md text-label hover:border-border-strong transition-colors duration-100"
        >
          Registrati
        </Link>
      </div>
    </div>
  );
}
