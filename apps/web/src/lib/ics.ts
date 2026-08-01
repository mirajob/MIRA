/**
 * Generazione del file .ics per l'invito a un colloquio.
 *
 * È la scorciatoia che dà il 90% del valore di un'integrazione con il calendario
 * senza integrare niente: allegato a una mail, l'evento entra in Google Calendar,
 * Apple Calendario e Outlook con il promemoria, senza chiedere permessi a nessuno
 * e senza dipendere dalle API di terzi.
 *
 * Il formato vuole gli orari in UTC con la Z finale, le righe terminate da CRLF e
 * spezzate a 75 ottetti. Nessuna libreria: sono trenta righe di testo.
 */

function formatIcsDate(value: Date): string {
  return value.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** Il testo va protetto: virgole, punti e virgola e a capo hanno un significato. */
function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** Le righe oltre i 75 ottetti vanno spezzate con uno spazio a inizio riga. */
function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [line.slice(0, 75)];
  let rest = line.slice(75);
  while (rest.length > 74) {
    parts.push(" " + rest.slice(0, 74));
    rest = rest.slice(74);
  }
  if (rest) parts.push(" " + rest);
  return parts.join("\r\n");
}

export function buildInterviewIcs(input: {
  uid: string;
  title: string;
  description?: string | null;
  /** Luogo se in presenza, link se online. */
  location?: string | null;
  startsAt: Date;
  endsAt: Date;
  organizerName: string;
}): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//MIRA//Colloqui//IT",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${input.uid}@mirajob.cloud`,
    `DTSTAMP:${formatIcsDate(new Date())}`,
    `DTSTART:${formatIcsDate(input.startsAt)}`,
    `DTEND:${formatIcsDate(input.endsAt)}`,
    `SUMMARY:${escapeText(input.title)}`,
    input.description ? `DESCRIPTION:${escapeText(input.description)}` : null,
    input.location ? `LOCATION:${escapeText(input.location)}` : null,
    `ORGANIZER;CN=${escapeText(input.organizerName)}:mailto:noreply@mirajob.cloud`,
    "STATUS:CONFIRMED",
    // Promemoria trenta minuti prima: è il motivo per cui la gente si presenta.
    "BEGIN:VALARM",
    "TRIGGER:-PT30M",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapeText(input.title)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter((line): line is string => line !== null);

  return lines.map(foldLine).join("\r\n");
}
