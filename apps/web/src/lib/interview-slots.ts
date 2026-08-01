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
/**
 * Colore stabile per ogni membro del board, ricavato dal suo id.
 *
 * Serve a leggere il calendario delle disponibilità a colpo d'occhio: chi copre
 * cosa si distingue dal colore, non dal nome scritto in una casella da due
 * centimetri. Deterministico, così non cambia fra un caricamento e l'altro.
 */
const INTERVIEWER_COLORS = [
  { bg: "bg-petrol", text: "text-white", soft: "bg-petrol-50", border: "border-petrol" },
  { bg: "bg-amber-500", text: "text-white", soft: "bg-amber-50", border: "border-amber-500" },
  { bg: "bg-emerald-600", text: "text-white", soft: "bg-emerald-50", border: "border-emerald-600" },
  { bg: "bg-violet-500", text: "text-white", soft: "bg-violet-50", border: "border-violet-500" },
  { bg: "bg-rose-500", text: "text-white", soft: "bg-rose-50", border: "border-rose-500" },
  { bg: "bg-sky-600", text: "text-white", soft: "bg-sky-50", border: "border-sky-600" },
] as const;

export function interviewerColor(userId: string): (typeof INTERVIEWER_COLORS)[number] {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  return INTERVIEWER_COLORS[hash % INTERVIEWER_COLORS.length]!;
}

/** Iniziali per l'indicatore accanto al colore. */
export function personInitials(name: string | null, email: string | null): string {
  const source = (name ?? email ?? "?").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]!.charAt(0)}${parts[1]!.charAt(0)}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

/**
 * Fonde in intervalli continui i blocchi che una persona ha selezionato.
 *
 * L'interfaccia lavora a blocchi perché è così che si clicca, il database tiene
 * fasce perché è così che si ragiona ("giovedì dalle 15 alle 17"). Questa funzione
 * è il ponte fra le due cose.
 */
export function mergeBlocksIntoRanges(
  blocks: { startsAt: string; endsAt: string }[]
): { startsAt: string; endsAt: string }[] {
  const sorted = [...blocks].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const ranges: { startsAt: string; endsAt: string }[] = [];

  for (const block of sorted) {
    const last = ranges[ranges.length - 1];
    if (last && new Date(last.endsAt).getTime() >= new Date(block.startsAt).getTime()) {
      if (new Date(block.endsAt) > new Date(last.endsAt)) last.endsAt = block.endsAt;
    } else {
      ranges.push({ ...block });
    }
  }

  return ranges;
}

/** Una fascia copre un blocco se lo contiene per intero. */
export function rangeCoversBlock(
  range: { starts_at: string; ends_at: string },
  block: { startsAt: string; endsAt: string }
): boolean {
  return (
    new Date(range.starts_at).getTime() <= new Date(block.startsAt).getTime() &&
    new Date(range.ends_at).getTime() >= new Date(block.endsAt).getTime()
  );
}

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
