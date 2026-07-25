import { AiTestClient } from "./ai-test-client";

// Il parsing del libretto può richiedere parecchi secondi: allinea il budget di
// esecuzione a quello del percorso onboarding reale così la server action non
// viene troncata dalla piattaforma.
export const maxDuration = 120;

export default function AdminAiTestPage() {
  return <AiTestClient />;
}
