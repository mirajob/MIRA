// Motore conversazionale dell'agente WhatsApp — docs/15_MIRA_WHATSAPP_AGENT_SPEC.md
//
// Questo file è PURO: nessuna rete, nessun database, nessuna data letta dall'orologio.
// Prende lo stato in cui si trova una persona più l'evento che è arrivato, e restituisce
// il nuovo stato e i messaggi da mandare. Così la conversazione si può provare tutta
// (vedi /admin/whatsapp) senza avere un numero attivo su Meta.
//
// Struttura: uno SMISTATORE più dei PERCORSI indipendenti. Aggiungere un percorso nuovo
// (per esempio "trova il coinquilino") deve voler dire aggiungere una voce a PATHS e una
// funzione, senza toccare gli altri percorsi.

import type { DisponibilitaProseContent, PianoCarrieraProseContent } from "@mira/types";

// ---------------------------------------------------------------------------
// Limiti di WhatsApp
// ---------------------------------------------------------------------------

/** Meta rifiuta i messaggi che sforano. Vengono controllati da `validateOutbound`. */
export const WA_LIMITS = {
  /** Massimo di bottoni di risposta rapida in un messaggio interattivo. */
  buttons: 3,
  /** Caratteri nel testo di un bottone. */
  buttonTitle: 20,
  /** Caratteri nel corpo di un messaggio interattivo (i messaggi di solo testo arrivano a 4096). */
  interactiveBody: 1024,
  /** Caratteri nel corpo di un messaggio di solo testo. */
  textBody: 4096,
} as const;

// ---------------------------------------------------------------------------
// Percorsi e stato
// ---------------------------------------------------------------------------

export const PATHS = ["card", "associazioni", "domanda"] as const;
export type PathId = (typeof PATHS)[number];

/**
 * Dove si trova la conversazione. `path` dice a quale percorso appartiene lo stato:
 * lo smistatore lo usa per sapere a chi passare l'evento.
 */
export type AgentStep =
  /** Non ha ancora scritto niente, o ha scritto ed è tornato al menu. */
  | { step: "menu" }
  /** Percorso card: menu scelto, in attesa che apra il modulo. */
  | { step: "card_intro" }
  /** Percorso card: modulo mandato, in attesa delle risposte. */
  | { step: "card_form" }
  /** Percorso card: risposte ricevute, link consegnato. */
  | { step: "card_done" }
  /** Percorso associazioni: link dato, gli è stato chiesto se vuole fare la card. */
  | { step: "associazioni_offer" }
  /** Percorso domanda: in attesa che scriva la domanda. */
  | { step: "domanda_wait" }
  /** Percorso domanda: domanda ricevuta, risponde una persona. */
  | { step: "domanda_sent" };

export type StepName = AgentStep["step"];

/** Quello che l'agente ha raccolto. Le due forme combaciano con i blocchi della card. */
export interface CollectedData {
  disponibilita?: DisponibilitaProseContent;
  piano_carriera?: PianoCarrieraProseContent;
  /** Testo libero della domanda, se il percorso è "domanda". */
  domanda?: string;
}

export interface AgentState {
  current: AgentStep;
  path: PathId | null;
  collected: CollectedData;
}

export function initialState(): AgentState {
  return { current: { step: "menu" }, path: null, collected: {} };
}

// ---------------------------------------------------------------------------
// Eventi in entrata e messaggi in uscita
// ---------------------------------------------------------------------------

export type InboundEvent =
  | { type: "text"; body: string }
  | { type: "button"; id: string }
  | { type: "flow_response"; data: FlowAnswers };

/** Le risposte grezze che torna il modulo. Nomi dei campi = nomi nel Flow JSON. */
export interface FlowAnswers {
  in_cerca?: string;
  cosa_cerca?: string;
  ambito?: string;
  dove?: string;
  periodo?: string;
  durata?: string;
  piano_stato?: string;
  piano_testo?: string;
}

export interface OutboundButton {
  id: string;
  title: string;
}

export type OutboundMessage =
  | { kind: "text"; body: string }
  | { kind: "buttons"; body: string; buttons: OutboundButton[] }
  /** Apre il modulo dentro la chat. `flow` è il Flow pubblicato su Meta. */
  | { kind: "flow"; body: string; cta: string; flow: "card" };

export interface AgentReply {
  state: AgentState;
  messages: OutboundMessage[];
  /**
   * Segnala al chiamante che serve un effetto fuori dalla conversazione: generare il
   * token e il link, o avvisare una persona. Il motore resta puro, l'effetto lo fa chi
   * lo usa. `card_link` va risolto PRIMA di mandare i messaggi (vedi LINK_PLACEHOLDER).
   */
  effect?: "card_link" | "notify_human";
}

/** Segnaposto che il chiamante sostituisce con il link personale vero. */
export const LINK_PLACEHOLDER = "{{LINK}}";

// ---------------------------------------------------------------------------
// Testi
// ---------------------------------------------------------------------------

/**
 * Italiano, tono diretto, frasi corte: si legge sul telefono. Niente trattini lunghi.
 * Al lancio non serve la traduzione: il canale parte solo in italiano (spec, punto 11.4).
 */
export const COPY = {
  menu:
    "Ciao, sono MIRA.\n\n" +
    "Aiuto gli studenti a farsi trovare dalle associazioni del loro campus e dalle aziende, senza mandare CV in giro.\n\n" +
    "Perché sei qui?",
  menuButtons: [
    { id: "path_card", title: "Creare la mia card" },
    { id: "path_associazioni", title: "Le associazioni" },
    { id: "path_domanda", title: "Ho una domanda" },
  ],
  privacy: "Come trattiamo i tuoi dati: https://mirajob.cloud/privacy",
  notUnderstood: "Non ho capito. Scegli una delle tre opzioni qui sotto.",

  cardIntro:
    "Perfetto. Ti chiedo due cose: cosa stai cercando e dove vuoi arrivare.\n\n" +
    "Sono due minuti. Il resto della card (esami, esperienze, CV) lo finisci su MIRA, che da schermo è molto più comodo.",
  cardIntroCta: "Iniziamo",
  cardFormBody: "Rispondi qui sotto, sono due schermate.",
  cardFormCta: "Compila",
  cardDone:
    "Fatto. La tua card è già iniziata.\n\n" +
    "Finiscila qui: " +
    LINK_PLACEHOLDER +
    "\n\nÈ un link personale e vale 7 giorni. Non girarlo a nessuno.",

  associazioni:
    "Le associazioni della tua università hanno la loro pagina su MIRA: chi sono, cosa fanno e le selezioni aperte.\n\n" +
    "Le trovi qui: https://mirajob.cloud/associations",
  associazioniOffer: "Per candidarti ti serve la card. La facciamo adesso?",
  associazioniOfferButtons: [
    { id: "path_card", title: "Sì, facciamola" },
    { id: "menu", title: "Non ora" },
  ],
  associazioniDeclined: "Va bene. Se cambi idea scrivimi di nuovo e ripartiamo da qui.",

  domandaWait: "Dimmi pure, scrivi qui la tua domanda.",
  domandaSent:
    "Ricevuta. Ti risponde una persona vera, di solito in giornata.\n\n" +
    "Se non ti arriva risposta entro un giorno, riscrivimi qui: dopo 24 ore WhatsApp non ci lascia più scrivere per primi.",
} as const;

// ---------------------------------------------------------------------------
// Smistatore
// ---------------------------------------------------------------------------

export function handleEvent(state: AgentState, event: InboundEvent): AgentReply {
  // Il menu si può richiamare da ovunque: è l'unica scorciatoia globale.
  if (event.type === "button" && event.id === "menu") {
    return showMenu(state);
  }
  if (event.type === "button" && event.id.startsWith("path_")) {
    return enterPath(state, event.id.slice("path_".length) as PathId);
  }

  switch (state.current.step) {
    case "menu":
      return atMenu(state, event);
    case "card_intro":
    case "card_form":
    case "card_done":
      return cardPath(state, event);
    case "associazioni_offer":
      return associazioniPath(state, event);
    case "domanda_wait":
    case "domanda_sent":
      return domandaPath(state, event);
  }
}

function showMenu(state: AgentState, extra: OutboundMessage[] = []): AgentReply {
  return {
    state: { ...state, current: { step: "menu" }, path: null },
    messages: [
      ...extra,
      { kind: "buttons", body: COPY.menu, buttons: [...COPY.menuButtons] },
      { kind: "text", body: COPY.privacy },
    ],
  };
}

function enterPath(state: AgentState, path: PathId): AgentReply {
  switch (path) {
    case "card":
      return {
        state: { ...state, path: "card", current: { step: "card_intro" } },
        messages: [
          { kind: "text", body: COPY.cardIntro },
          { kind: "flow", body: COPY.cardFormBody, cta: COPY.cardFormCta, flow: "card" },
        ],
      };
    case "associazioni":
      return {
        state: { ...state, path: "associazioni", current: { step: "associazioni_offer" } },
        messages: [
          { kind: "text", body: COPY.associazioni },
          {
            kind: "buttons",
            body: COPY.associazioniOffer,
            buttons: [...COPY.associazioniOfferButtons],
          },
        ],
      };
    case "domanda":
      return {
        state: { ...state, path: "domanda", current: { step: "domanda_wait" } },
        messages: [{ kind: "text", body: COPY.domandaWait }],
      };
  }
}

// ---------------------------------------------------------------------------
// Percorsi
// ---------------------------------------------------------------------------

/** Primo messaggio di chiunque, e ritorno al menu: qualunque cosa scriva, si apre il menu. */
function atMenu(state: AgentState, _event: InboundEvent): AgentReply {
  return showMenu(state);
}

function cardPath(state: AgentState, event: InboundEvent): AgentReply {
  if (event.type === "flow_response") {
    const collected: CollectedData = {
      ...state.collected,
      disponibilita: toDisponibilita(event.data),
      piano_carriera: toPianoCarriera(event.data),
    };
    return {
      state: { ...state, collected, current: { step: "card_done" } },
      messages: [{ kind: "text", body: COPY.cardDone }],
      effect: "card_link",
    };
  }

  // Ha scritto invece di aprire il modulo, oppure riscrive dopo aver finito: il modulo
  // resta l'unica strada, non si raccoglie niente a testo libero.
  if (state.current.step === "card_done") {
    return showMenu(state);
  }
  return {
    state,
    messages: [{ kind: "flow", body: COPY.cardFormBody, cta: COPY.cardFormCta, flow: "card" }],
  };
}

function associazioniPath(state: AgentState, event: InboundEvent): AgentReply {
  if (event.type === "button") {
    return showMenu(state, [{ kind: "text", body: COPY.associazioniDeclined }]);
  }
  return showMenu(state);
}

function domandaPath(state: AgentState, event: InboundEvent): AgentReply {
  if (state.current.step === "domanda_wait" && event.type === "text") {
    return {
      state: {
        ...state,
        collected: { ...state.collected, domanda: event.body },
        current: { step: "domanda_sent" },
      },
      messages: [{ kind: "text", body: COPY.domandaSent }],
      effect: "notify_human",
    };
  }
  // Continua a scrivere dopo aver mandato la domanda: si accumula, senza rispondere due
  // volte la stessa cosa. Risponde una persona.
  if (state.current.step === "domanda_sent" && event.type === "text") {
    const domanda = `${state.collected.domanda ?? ""}\n${event.body}`.trim();
    return {
      state: { ...state, collected: { ...state.collected, domanda } },
      messages: [],
      effect: "notify_human",
    };
  }
  return showMenu(state);
}

// ---------------------------------------------------------------------------
// Dalle risposte del modulo ai blocchi della card
// ---------------------------------------------------------------------------

function clean(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function toDisponibilita(answers: FlowAnswers): DisponibilitaProseContent {
  return {
    // Il modulo manda una scelta secca: tutto ciò che non è "sto cercando" vale come
    // aperto a opportunità, mai dedotto da testo libero.
    attiva: answers.in_cerca === "cerco",
    cosa_cerca: clean(answers.cosa_cerca),
    ambito: clean(answers.ambito),
    periodo: clean(answers.periodo),
    durata: clean(answers.durata),
    dove: clean(answers.dove),
  };
}

export function toPianoCarriera(answers: FlowAnswers): PianoCarrieraProseContent {
  const stato =
    answers.piano_stato === "direzione_chiara" || answers.piano_stato === "ipotesi"
      ? answers.piano_stato
      : "esplorazione";
  return { stato, testo: clean(answers.piano_testo) };
}

// ---------------------------------------------------------------------------
// Controllo dei limiti di WhatsApp
// ---------------------------------------------------------------------------

/** Elenco dei problemi che farebbero rifiutare il messaggio da Meta. Vuoto = va bene. */
export function validateOutbound(message: OutboundMessage): string[] {
  const problems: string[] = [];

  if (message.kind === "text") {
    if (message.body.length > WA_LIMITS.textBody) {
      problems.push(`testo di ${message.body.length} caratteri, il massimo è ${WA_LIMITS.textBody}`);
    }
    return problems;
  }

  if (message.body.length > WA_LIMITS.interactiveBody) {
    problems.push(
      `corpo di ${message.body.length} caratteri, il massimo per un messaggio interattivo è ${WA_LIMITS.interactiveBody}`,
    );
  }

  if (message.kind === "buttons") {
    if (message.buttons.length > WA_LIMITS.buttons) {
      problems.push(`${message.buttons.length} bottoni, il massimo è ${WA_LIMITS.buttons}`);
    }
    for (const button of message.buttons) {
      if (button.title.length > WA_LIMITS.buttonTitle) {
        problems.push(
          `bottone "${button.title}" di ${button.title.length} caratteri, il massimo è ${WA_LIMITS.buttonTitle}`,
        );
      }
    }
  }

  return problems;
}
