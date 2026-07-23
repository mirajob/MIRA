/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServiceClient } from "@mira/supabase/server";
import { notFound } from "next/navigation";
import { ChatCycleWizard } from "./chat-cycle-wizard";
import { StartCycleCard } from "./start-cycle-card";

interface Props {
  params: Promise<{ slug: string }>;
}

/**
 * Associazioni in beta: il ciclo si costruisce a blocchi sulla sua card. Le altre restano sul
 * vecchio percorso a chat finche' la nuova esperienza non viene accesa per tutti.
 */
export default async function NewCyclePage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createServiceClient();

  // select("*") e non la sola colonna: finche' la migration del flag non e' applicata la
  // colonna non esiste, e chiederla per nome farebbe fallire la query invece di ricadere
  // sul vecchio percorso.
  const { data: association } = await (supabase.from("association_profiles") as any)
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (!association) notFound();
  if (!association.beta_dashboard) return <ChatCycleWizard />;

  return <StartCycleCard associationId={association.id} slug={slug} />;
}
