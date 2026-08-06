import { getUserContext } from "@/lib/auth";
import { createServerClient } from "@mira/supabase/server";
import { redirect } from "next/navigation";
import { OnboardingFlow } from "./onboarding-flow";
import { isPianoDone } from "@/lib/card-completeness";

/* eslint-disable @typescript-eslint/no-explicit-any */

// Il parsing del libretto (uploadTranscript) usa un modello ad alto reasoning effort per
// la massima accuratezza su voti/esami: può superare il timeout di default delle funzioni
// serverless, quindi questa route (da cui la Server Action viene invocata) ne ha bisogno.
export const maxDuration = 120;

export default async function OnboardingPage() {
  const ctx = await getUserContext();
  if (!ctx.isStudent) redirect("/api/auth/redirect");

  const supabase = await createServerClient();
  const { data: student } = await supabase
    .from("student_profiles")
    .select("id, onboarding_completed, onboarding_answers")
    .eq("user_id", ctx.profile.id)
    .single();

  if ((student as any)?.onboarding_completed) {
    // Fase A completa non basta più: reindirizza solo se anche la Fase B lo è.
    // Fase B = competenze, lingue, profilo personale (riga autodescrizione) e piano di
    // carriera, che dal 2026-08 è la tappa finale. Senza il piano in questo elenco, alla
    // conferma del profilo personale la guardia dava la Fase B per chiusa e sbatteva
    // fuori lo studente proprio mentre compariva l'ultima domanda.
    const FASE_B = ["competenze", "lingue", "autodescrizione", "piano_carriera"] as const;
    const { data: blocks } = await (supabase.from("card_blocks") as any)
      .select("block_type, status, prose_content")
      .eq("student_profile_id", (student as any).id)
      .in("block_type", FASE_B);

    const byType = new Map((blocks ?? []).map((b: any) => [b.block_type as string, b]));
    const piano = byType.get("piano_carriera") as any;
    // Il piano si può confermare vuoto: in quel caso vale il flag, non il testo. Stessa
    // regola di derivePhase, altrimenti la guardia e il flusso si contraddicono.
    const pianoConfermato = !!((student as any).onboarding_answers as any)?.piano_confermato;
    const faseBComplete =
      ["competenze", "lingue", "autodescrizione"].every((t) => (byType.get(t) as any)?.status === "approved") &&
      (pianoConfermato || isPianoDone(piano?.status, piano?.prose_content?.testo));

    if (faseBComplete) redirect("/student");
  }

  return (
    <div className="fixed inset-0 z-50 bg-paper">
      <OnboardingFlow userName={ctx.profile.full_name ?? "Studente"} />
    </div>
  );
}
