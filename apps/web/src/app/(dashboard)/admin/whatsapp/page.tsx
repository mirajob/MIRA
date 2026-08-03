import { WhatsappSimulator } from "./whatsapp-simulator";

/**
 * Banco di prova dell'agente WhatsApp (solo admin MIRA).
 *
 * Fa girare il motore vero di packages/domain/src/whatsapp-agent.ts nel browser, così la
 * conversazione si legge e si corregge prima di avere un numero attivo su Meta. Non parla
 * con Meta e non scrive niente sul database.
 */
export default function AdminWhatsappPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <p className="text-eyebrow uppercase text-navy/50">Strumento interno</p>
      <h1 className="font-semibold text-h1 text-navy">Agente WhatsApp</h1>
      <p className="mt-2 max-w-2xl text-body-sm text-ink-secondary">
        Prova della conversazione, senza Meta e senza database. Quello che vedi qui è
        esattamente quello che riceverebbe uno studente. La specifica è in{" "}
        <code className="text-ink">docs/15_MIRA_WHATSAPP_AGENT_SPEC.md</code>.
      </p>

      <div className="mt-6">
        <WhatsappSimulator />
      </div>
    </div>
  );
}
