"use client";

import { useState } from "react";
import {
  initialState,
  handleEvent,
  validateOutbound,
  LINK_PLACEHOLDER,
  type AgentState,
  type OutboundMessage,
  type InboundEvent,
  type FlowAnswers,
} from "@mira/domain";

/**
 * Simulatore della conversazione. Fa girare il motore vero, in memoria: niente Meta,
 * niente database. Serve a leggere i testi e a provare i percorsi prima di attivare il
 * numero, e a vedere subito se un messaggio sfora i limiti di WhatsApp.
 */

interface Bubble {
  from: "mira" | "studente";
  text: string;
  buttons?: { id: string; title: string }[];
  flow?: boolean;
  problems?: string[];
}

const LINK_ESEMPIO = "https://mirajob.cloud/wa/xK9f2a7b";

export function WhatsappSimulator() {
  const [state, setState] = useState<AgentState>(initialState);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [input, setInput] = useState("");
  const [flowOpen, setFlowOpen] = useState(false);
  const [started, setStarted] = useState(false);

  function send(event: InboundEvent, label: string) {
    const reply = handleEvent(state, event);
    setState(reply.state);

    const incoming: Bubble[] = reply.messages.map((message) => toBubble(message, reply.effect));
    setBubbles((prev) => [...prev, { from: "studente", text: label }, ...incoming]);
  }

  function reset() {
    setState(initialState());
    setBubbles([]);
    setStarted(false);
    setFlowOpen(false);
  }

  function sendText() {
    const body = input.trim();
    if (!body) return;
    setInput("");
    setStarted(true);
    send({ type: "text", body }, body);
  }

  const lastButtons = [...bubbles].reverse().find((b) => b.buttons)?.buttons;
  const awaitingFlow = [...bubbles].reverse().find((b) => b.flow || b.buttons)?.flow === true;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
      {/* Telefono */}
      <div className="rounded-xl border border-border bg-white">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <span className="text-label text-navy">MIRA</span>
          <button
            type="button"
            onClick={reset}
            className="text-body-sm text-ink-tertiary transition-colors duration-100 hover:text-navy"
          >
            Ricomincia
          </button>
        </div>

        <div className="flex h-[520px] flex-col gap-2 overflow-y-auto bg-cream/60 px-3 py-3">
          {bubbles.length === 0 && (
            <p className="m-auto max-w-[220px] text-center text-body-sm text-ink-tertiary">
              Scrivi qualcosa qui sotto, come farebbe uno studente che apre la chat per la prima
              volta.
            </p>
          )}
          {bubbles.map((bubble, i) => (
            <BubbleView key={i} bubble={bubble} />
          ))}
        </div>

        <div className="border-t border-border p-3">
          {awaitingFlow && (
            <button
              type="button"
              onClick={() => setFlowOpen(true)}
              className="mb-2 w-full rounded-md bg-petrol py-2 text-body-sm font-medium text-white transition-colors duration-100 hover:bg-petrol-700"
            >
              Apri il modulo
            </button>
          )}
          {lastButtons && !awaitingFlow && (
            <div className="mb-2 flex flex-col gap-1.5">
              {lastButtons.map((button) => (
                <button
                  key={button.id}
                  type="button"
                  onClick={() => {
                    setStarted(true);
                    send({ type: "button", id: button.id }, button.title);
                  }}
                  className="rounded-md border border-navy/25 py-2 text-body-sm font-medium text-navy transition-colors duration-100 hover:bg-navy-50"
                >
                  {button.title}
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendText()}
              placeholder={started ? "Scrivi un messaggio" : "es. ciao"}
              className="min-w-0 flex-1 rounded-md border border-border px-3 py-2 text-body-sm focus:border-petrol focus:outline-none"
            />
            <button
              type="button"
              onClick={sendText}
              className="rounded-md bg-navy px-4 text-body-sm text-white transition-colors duration-100 hover:bg-navy-700"
            >
              Invia
            </button>
          </div>
        </div>
      </div>

      {/* Stato */}
      <div className="space-y-4">
        <Panel title="Dove si trova">
          <dl className="grid grid-cols-[110px_minmax(0,1fr)] gap-y-1.5 text-body-sm">
            <dt className="text-ink-tertiary">Passo</dt>
            <dd className="font-mono text-ink">{state.current.step}</dd>
            <dt className="text-ink-tertiary">Percorso</dt>
            <dd className="font-mono text-ink">{state.path ?? "nessuno"}</dd>
          </dl>
        </Panel>

        <Panel title="Cosa ha raccolto">
          {Object.keys(state.collected).length === 0 ? (
            <p className="text-body-sm text-ink-tertiary">Ancora niente.</p>
          ) : (
            <pre className="overflow-x-auto rounded-md bg-navy-50 p-3 text-[12px] leading-relaxed text-ink">
              {JSON.stringify(state.collected, null, 2)}
            </pre>
          )}
          <p className="mt-2 text-body-sm text-ink-tertiary">
            Queste due forme sono identiche ai blocchi <span className="font-mono">disponibilita</span>{" "}
            e <span className="font-mono">piano_carriera</span> della card: alla registrazione si
            copiano e basta.
          </p>
        </Panel>

        <Panel title="Percorsi disponibili">
          <p className="text-body-sm text-ink-secondary">
            Al lancio sono tre, tutti reali. Nessun bottone per cose che non esistono: un pulsante
            che risponde &quot;presto disponibile&quot; fa più danno che non averlo. Il percorso
            coinquilino entra come quarta voce quando la funzione esiste su MIRA.
          </p>
        </Panel>
      </div>

      {flowOpen && (
        <FlowForm
          onCancel={() => setFlowOpen(false)}
          onSubmit={(answers) => {
            setFlowOpen(false);
            send({ type: "flow_response", data: answers }, "(modulo compilato)");
          }}
        />
      )}
    </div>
  );
}

function toBubble(message: OutboundMessage, effect: string | undefined): Bubble {
  const problems = validateOutbound(message);
  const body =
    effect === "card_link" ? message.body.replace(LINK_PLACEHOLDER, LINK_ESEMPIO) : message.body;

  if (message.kind === "buttons") {
    return { from: "mira", text: body, buttons: [...message.buttons], problems };
  }
  if (message.kind === "flow") {
    return { from: "mira", text: body, flow: true, problems };
  }
  return { from: "mira", text: body, problems };
}

function BubbleView({ bubble }: { bubble: Bubble }) {
  const mine = bubble.from === "studente";
  return (
    <div className={mine ? "flex justify-end" : "flex justify-start"}>
      <div className="max-w-[85%]">
        <div
          className={`whitespace-pre-wrap rounded-lg px-3 py-2 text-body-sm ${
            mine ? "bg-navy text-white" : "bg-white text-ink shadow-sm"
          }`}
        >
          {bubble.text}
        </div>
        {bubble.buttons && (
          <div className="mt-1 flex flex-col gap-1">
            {bubble.buttons.map((button) => (
              <span
                key={button.id}
                className="rounded-md border border-border bg-white px-3 py-1.5 text-center text-body-sm text-petrol"
              >
                {button.title}
              </span>
            ))}
          </div>
        )}
        {bubble.flow && (
          <span className="mt-1 block rounded-md border border-petrol/30 bg-petrol-50 px-3 py-1.5 text-center text-body-sm text-petrol-700">
            Compila
          </span>
        )}
        {bubble.problems && bubble.problems.length > 0 && (
          <ul className="mt-1 space-y-0.5">
            {bubble.problems.map((problem) => (
              <li key={problem} className="rounded bg-error-bg px-2 py-1 text-body-sm text-error">
                Meta lo rifiuterebbe: {problem}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-white p-4">
      <p className="text-eyebrow uppercase text-navy/50">{title}</p>
      <div className="mt-2.5">{children}</div>
    </section>
  );
}

/** Il modulo che su WhatsApp sarebbe un Flow: due schermate, campi guidati. */
function FlowForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (answers: FlowAnswers) => void;
  onCancel: () => void;
}) {
  const [screen, setScreen] = useState<1 | 2>(1);
  const [answers, setAnswers] = useState<FlowAnswers>({ in_cerca: "cerco", piano_stato: "ipotesi" });

  function set<K extends keyof FlowAnswers>(key: K, value: FlowAnswers[K]) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 p-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-white p-5">
        <div className="flex items-baseline justify-between">
          <p className="text-label text-navy">
            {screen === 1 ? "Cosa stai cercando" : "Dove vuoi arrivare"}
          </p>
          <span className="text-body-sm text-ink-tertiary">{screen} di 2</span>
        </div>

        {screen === 1 ? (
          <div className="mt-4 space-y-3">
            <Field label="In questo momento">
              <Select
                value={answers.in_cerca ?? "cerco"}
                onChange={(v) => set("in_cerca", v)}
                options={[
                  ["cerco", "Sto cercando"],
                  ["aperto", "Sono aperto a opportunità"],
                ]}
              />
            </Field>
            <Field label="Che tipo di esperienza">
              <Select
                value={answers.cosa_cerca ?? ""}
                onChange={(v) => set("cosa_cerca", v)}
                options={[
                  ["", "Scegli"],
                  ["stage curriculare", "Stage curriculare"],
                  ["stage extracurriculare", "Stage extracurriculare"],
                  ["part-time", "Part-time"],
                  ["progetto", "Progetto"],
                ]}
              />
            </Field>
            <Field label="In che ambito">
              <Text value={answers.ambito ?? ""} onChange={(v) => set("ambito", v)} placeholder="es. venture capital" />
            </Field>
            <Field label="Dove">
              <Text value={answers.dove ?? ""} onChange={(v) => set("dove", v)} placeholder="es. Milano" />
            </Field>
            <Field label="Da quando">
              <Text value={answers.periodo ?? ""} onChange={(v) => set("periodo", v)} placeholder="es. da settembre 2026" />
            </Field>
            <Field label="Per quanto">
              <Select
                value={answers.durata ?? ""}
                onChange={(v) => set("durata", v)}
                options={[
                  ["", "Scegli"],
                  ["1-3 mesi", "1-3 mesi"],
                  ["3-6 mesi", "3-6 mesi"],
                  ["oltre 6 mesi", "Oltre 6 mesi"],
                ]}
              />
            </Field>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <Field label="Rispetto al tuo futuro">
              <Select
                value={answers.piano_stato ?? "ipotesi"}
                onChange={(v) => set("piano_stato", v)}
                options={[
                  ["direzione_chiara", "Ho una direzione chiara"],
                  ["ipotesi", "Ho qualche ipotesi"],
                  ["esplorazione", "Sto ancora esplorando"],
                ]}
              />
            </Field>
            <Field label="Raccontamelo in poche righe">
              <textarea
                value={answers.piano_testo ?? ""}
                onChange={(e) => set("piano_testo", e.target.value)}
                rows={5}
                placeholder="Prossimi passi di studio, che ruolo ti immagini subito dopo, dove punti ad arrivare. Scrivi come parli."
                className="w-full rounded-md border border-border px-3 py-2 text-body-sm focus:border-petrol focus:outline-none"
              />
            </Field>
          </div>
        )}

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={screen === 1 ? onCancel : () => setScreen(1)}
            className="rounded-md border border-border px-4 py-2 text-body-sm text-ink-secondary transition-colors duration-100 hover:text-navy"
          >
            {screen === 1 ? "Annulla" : "Indietro"}
          </button>
          <button
            type="button"
            onClick={screen === 1 ? () => setScreen(2) : () => onSubmit(answers)}
            className="flex-1 rounded-md bg-navy py-2 text-body-sm text-white transition-colors duration-100 hover:bg-navy-700"
          >
            {screen === 1 ? "Avanti" : "Invia"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-body-sm text-ink-secondary">{label}</span>
      {children}
    </label>
  );
}

function Text({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-md border border-border px-3 py-2 text-body-sm focus:border-petrol focus:outline-none"
    />
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-md border border-border px-3 py-2 text-body-sm focus:border-petrol focus:outline-none"
    >
      {options.map(([v, label]) => (
        <option key={v} value={v}>
          {label}
        </option>
      ))}
    </select>
  );
}
