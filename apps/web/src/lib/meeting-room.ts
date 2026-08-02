import { randomUUID } from "node:crypto";

/**
 * Link della videochiamata generato da MIRA.
 *
 * Usiamo Jitsi Meet perché è l'unico modo di avere un link diverso per ogni
 * colloquio senza integrare niente: su Jitsi la stanza non va creata, esiste nel
 * momento in cui qualcuno apre l'URL. Un link Google Meet invece lo può generare
 * solo Google, e servirebbe collegare il calendario di chi conduce.
 *
 * Si apre dal browser, anche da telefono, senza installare né registrarsi.
 *
 * Chiunque abbia il link può entrare: l'unica protezione reale è che il nome
 * della stanza sia impossibile da indovinare, quindi ci mettiamo dentro due UUID
 * senza trattini. Non va accorciato.
 */
const JITSI_HOST = "https://meet.jit.si";

export function generateMeetingRoomUrl(): string {
  const secret = `${randomUUID()}${randomUUID()}`.replace(/-/g, "");
  return `${JITSI_HOST}/mira-${secret}`;
}
