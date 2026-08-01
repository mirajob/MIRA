// Controlli dell'agente WhatsApp — docs/15_MIRA_WHATSAPP_AGENT_SPEC.md
//
// Si lancia dalla radice del repo:
//   node --experimental-strip-types scripts/whatsapp-check.ts
//
// Il motore in packages/domain/src/whatsapp-agent.ts è puro, quindi si prova tutto senza
// database, senza rete e senza un numero attivo su Meta. Da rilanciare a ogni modifica
// dei percorsi o dei testi: controlla anche che nessun messaggio sfori i limiti di Meta.

import {
  initialState,
  handleEvent,
  validateOutbound,
  LINK_PLACEHOLDER,
  type AgentState,
  type InboundEvent,
} from "../packages/domain/src/whatsapp-agent.ts";

let failures = 0;
function check(label: string, condition: boolean) {
  if (!condition) {
    failures += 1;
    console.log("FALLITO: " + label);
  } else {
    console.log("ok: " + label);
  }
}

function run(events: InboundEvent[]) {
  let state: AgentState = initialState();
  const log: string[] = [];
  const effects: string[] = [];
  for (const event of events) {
    const reply = handleEvent(state, event);
    state = reply.state;
    if (reply.effect) effects.push(reply.effect);
    for (const message of reply.messages) {
      log.push(message.kind + ": " + message.body.slice(0, 60).replace(/\n/g, " | "));
      const problems = validateOutbound(message);
      check("limiti WhatsApp rispettati (" + message.kind + ")", problems.length === 0);
    }
  }
  return { state, log, effects };
}

console.log("--- primo messaggio qualsiasi apre il menu");
const a = run([{ type: "text", body: "ciao" }]);
check("finisce al menu", a.state.current.step === "menu");
check("manda i bottoni", a.log.some((l) => l.startsWith("buttons")));
check("manda la privacy prima di raccogliere", a.log.some((l) => l.includes("privacy")));

console.log("\n--- percorso card completo");
const b = run([
  { type: "text", body: "ciao" },
  { type: "button", id: "path_card" },
  {
    type: "flow_response",
    data: {
      in_cerca: "cerco",
      cosa_cerca: "stage curriculare",
      ambito: "venture capital",
      dove: "Milano",
      periodo: "da settembre 2026",
      durata: "3-6 mesi",
      piano_stato: "ipotesi",
      piano_testo: "  magistrale in finanza, poi consulenza  ",
    },
  },
]);
check("arriva a card_done", b.state.current.step === "card_done");
check("chiede il link al chiamante", b.effects.includes("card_link"));
check("disponibilita attiva", b.state.collected.disponibilita?.attiva === true);
check("ambito salvato", b.state.collected.disponibilita?.ambito === "venture capital");
check("durata salvata", b.state.collected.disponibilita?.durata === "3-6 mesi");
check("piano stato valido", b.state.collected.piano_carriera?.stato === "ipotesi");
check(
  "testo del piano ripulito",
  b.state.collected.piano_carriera?.testo === "magistrale in finanza, poi consulenza",
);
check("nessun dato inventato oltre ai due blocchi", Object.keys(b.state.collected).length === 2);

console.log("\n--- il segnaposto arriva davvero nel corpo");
let s2: AgentState = initialState();
s2 = handleEvent(s2, { type: "button", id: "path_card" }).state;
const done = handleEvent(s2, { type: "flow_response", data: { in_cerca: "aperto" } });
check("corpo con segnaposto", done.messages[0]!.body.includes(LINK_PLACEHOLDER));
check("aperto a opportunità", done.state.collected.disponibilita?.attiva === false);

console.log("\n--- stato del piano non riconosciuto ricade su esplorazione");
const c = handleEvent(
  handleEvent(initialState(), { type: "button", id: "path_card" }).state,
  { type: "flow_response", data: { piano_stato: "boh" } },
);
check("ricade su esplorazione", c.state.collected.piano_carriera?.stato === "esplorazione");

console.log("\n--- se scrive invece di aprire il modulo, il modulo torna");
const d = run([
  { type: "button", id: "path_card" },
  { type: "text", body: "cerco uno stage in finanza a Milano" },
]);
check("resta su card_intro", d.state.current.step === "card_intro");
check("rimanda il modulo", d.log.filter((l) => l.startsWith("flow")).length === 2);
check("non raccoglie testo libero", d.state.collected.disponibilita === undefined);

console.log("\n--- percorso associazioni con rientro sulla card");
const e = run([
  { type: "button", id: "path_associazioni" },
  { type: "button", id: "path_card" },
]);
check("il sì porta sulla card", e.state.current.step === "card_intro");
check("percorso aggiornato", e.state.path === "card");

console.log("\n--- percorso associazioni, rifiuto");
const f = run([
  { type: "button", id: "path_associazioni" },
  { type: "button", id: "menu" },
]);
check("torna al menu", f.state.current.step === "menu");
check("percorso azzerato", f.state.path === null);

console.log("\n--- percorso domanda");
const g = run([
  { type: "button", id: "path_domanda" },
  { type: "text", body: "posso iscrivermi se sono al primo anno?" },
  { type: "text", body: "e se non ho il CV?" },
]);
check("arriva a domanda_sent", g.state.current.step === "domanda_sent");
check("avvisa una persona", g.effects.filter((x) => x === "notify_human").length === 2);
check(
  "accumula i messaggi",
  (g.state.collected.domanda ?? "").includes("primo anno") &&
    (g.state.collected.domanda ?? "").includes("CV"),
);
check("non risponde due volte", g.log.filter((l) => l.includes("Ricevuta")).length === 1);

console.log("\n--- il menu è raggiungibile da ovunque");
const h = run([
  { type: "button", id: "path_domanda" },
  { type: "button", id: "menu" },
]);
check("torna al menu da un percorso", h.state.current.step === "menu");

console.log("\n" + (failures === 0 ? "TUTTO OK" : failures + " CONTROLLI FALLITI"));
process.exit(failures === 0 ? 0 : 1);
