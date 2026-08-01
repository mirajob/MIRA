import { APP_TIME_ZONE } from "@/lib/format-date";

/**
 * Generazione della griglia di colloqui a partire dalle finestre di una sessione.
 *
 * Modulo separato e non "use server": esporta tipi e funzioni pure, usate sia dalle
 * server action sia dall'anteprima nel form di creazione.
 */

export interface InterviewWindow {
  /** Giorno in formato YYYY-MM-DD. */
  date: string;
  /** Ora di inizio in formato HH:MM, intesa come ora italiana. */
  start: string;
  /** Ora di fine in formato HH:MM, intesa come ora italiana. */
  end: string;
}

export interface GeneratedSlot {
  startsAt: string;
  endsAt: string;
  track: number;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function parseWindows(raw: unknown): InterviewWindow[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (w): w is InterviewWindow =>
        Boolean(w) &&
        typeof w === "object" &&
        DATE_RE.test((w as InterviewWindow).date ?? "") &&
        TIME_RE.test((w as InterviewWindow).start ?? "") &&
        TIME_RE.test((w as InterviewWindow).end ?? "")
    )
    .map((w) => ({ date: w.date, start: w.start, end: w.end }));
}

/**
 * Scarto fra l'ora del fuso e UTC per un dato istante. Ricavato da Intl invece che
 * da una costante perché fra marzo e ottobre l'Italia è a +2 e non a +1: una
 * costante sbaglierebbe di un'ora metà dell'anno.
 */
function zoneOffsetMs(instant: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIME_ZONE,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
    .formatToParts(instant)
    .filter((p) => p.type !== "literal");

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? "0");
  const asIfUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") % 24,
    get("minute"),
    get("second")
  );
  return asIfUtc - instant.getTime();
}

/** "2026-10-15" + "15:00" intesi come ora italiana, restituiti come istante reale. */
export function zonedToInstant(date: string, time: string): Date {
  const naive = new Date(`${date}T${time}:00Z`);
  // Doppio passaggio: vicino al cambio dell'ora legale il primo scarto è calcolato
  // sull'istante sbagliato, il secondo lo corregge.
  const first = new Date(naive.getTime() - zoneOffsetMs(naive));
  return new Date(naive.getTime() - zoneOffsetMs(first));
}

/**
 * La griglia: per ogni finestra, tanti slot quanti ne stanno fra inizio e fine,
 * ripetuti su ciascun colloquio in parallelo. Uno slot che sfora la fine della
 * finestra non viene creato.
 */
export function generateSlots(input: {
  windows: InterviewWindow[];
  slotDurationMinutes: number;
  breakMinutes: number;
  parallelTracks: number;
}): GeneratedSlot[] {
  const { windows, slotDurationMinutes, breakMinutes, parallelTracks } = input;
  if (slotDurationMinutes <= 0) return [];

  const step = (slotDurationMinutes + Math.max(0, breakMinutes)) * 60_000;
  const duration = slotDurationMinutes * 60_000;
  const slots: GeneratedSlot[] = [];

  for (const window of windows) {
    const windowStart = zonedToInstant(window.date, window.start);
    const windowEnd = zonedToInstant(window.date, window.end);
    if (windowEnd <= windowStart) continue;

    for (let t = windowStart.getTime(); t + duration <= windowEnd.getTime(); t += step) {
      for (let track = 1; track <= parallelTracks; track++) {
        slots.push({
          startsAt: new Date(t).toISOString(),
          endsAt: new Date(t + duration).toISOString(),
          track,
        });
      }
    }
  }

  return slots;
}
