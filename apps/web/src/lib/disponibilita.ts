import type {
  DisponibilitaProseContent,
  FinestraDisponibilita,
  LuogoDisponibilita,
  ModalitaLavoro,
  TipoAzienda,
} from "@mira/types";

/**
 * Come si legge e si scrive la disponibilità, in un posto solo.
 *
 * La disponibilità è passata da cinque caselle di testo libero a una struttura vera
 * (rework 2026-08): finestre a date piene, durata in mesi, ambiti, tipi di azienda,
 * luoghi con modalità. Card, profilo, ricerca aziende e agente WhatsApp devono
 * raccontarla nello stesso modo, quindi la formattazione vive qui e non in ogni vista.
 *
 * Le card scritte prima del rework restano leggibili: se la struttura è vuota ma i
 * vecchi campi hanno del testo, si mostra quello. Niente card che si svuota da sola.
 */

export const MAX_AMBITI = 3;

/** yyyy-mm-dd → parti numeriche, senza passare da Date (che sposta il giorno per fuso). */
export function splitISO(iso: string): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!match) return null;
  return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) };
}

export function toISO(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Oggi in ISO, per limitare il calendario al futuro. */
export function todayISO(): string {
  const now = new Date();
  return toISO(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

/** "12 giu 2027". Senza anno quando è l'anno in cui cade l'altro estremo. */
export function formatDay(iso: string, locale: string, withYear = true): string {
  const parts = splitISO(iso);
  if (!parts) return iso;
  const date = new Date(Date.UTC(parts.y, parts.m - 1, parts.d));
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    ...(withYear ? { year: "numeric" } : {}),
    timeZone: "UTC",
  }).format(date);
}

/**
 * Una finestra in una riga: "12 giu – 19 set 2027", oppure "da 3 mar 2027" quando non
 * ha fine. L'anno si ripete solo quando i due estremi cadono in anni diversi.
 */
export function formatFinestra(
  finestra: FinestraDisponibilita,
  locale: string,
  labels: { from: string; to: string }
): string {
  const from = splitISO(finestra.da);
  if (!from) return "";
  if (!finestra.a) return `${labels.from} ${formatDay(finestra.da, locale)}`;
  const to = splitISO(finestra.a);
  if (!to) return formatDay(finestra.da, locale);
  const sameYear = from.y === to.y;
  return `${formatDay(finestra.da, locale, !sameYear)} ${labels.to} ${formatDay(finestra.a, locale)}`;
}

export function formatLuogo(luogo: LuogoDisponibilita, modalitaLabel: (m: ModalitaLavoro) => string): string {
  const posto = luogo.posto.trim();
  const modalita = modalitaLabel(luogo.modalita);
  return posto ? `${posto} · ${modalita}` : modalita;
}

/**
 * La durata in parole: "3–6 mesi", "almeno 3 mesi", "fino a 6 mesi".
 * `disponibile_a_restare` non è una durata: si aggiunge come frase a parte.
 */
export function formatDurata(
  d: DisponibilitaProseContent,
  labels: { months: (n: number) => string; range: (a: number, b: number) => string; atLeast: (n: number) => string; upTo: (n: number) => string }
): string | null {
  const min = d.durata_min_mesi ?? null;
  const max = d.durata_max_mesi ?? null;
  if (min != null && max != null) return min === max ? labels.months(min) : labels.range(min, max);
  if (min != null) return labels.atLeast(min);
  if (max != null) return labels.upTo(max);
  return null;
}

/** Ha almeno un campo della struttura nuova compilato. */
export function hasStructuredDisponibilita(d: DisponibilitaProseContent | null | undefined): boolean {
  if (!d) return false;
  return Boolean(
    d.finestre?.length ||
      d.ambiti?.length ||
      d.luoghi?.length ||
      d.tipi_azienda?.length ||
      d.durata_min_mesi != null ||
      d.durata_max_mesi != null ||
      d.disponibile_a_restare
  );
}

/** Card scritta prima del rework e non ancora convertita: struttura vuota, testo vecchio pieno. */
export function hasLegacyDisponibilita(d: DisponibilitaProseContent | null | undefined): boolean {
  if (!d || hasStructuredDisponibilita(d)) return false;
  return Boolean(d.cosa_cerca || d.ambito || d.periodo || d.durata || d.dove);
}

/** Le pill di una card legacy, deduplicate: mai "not looking / not looking". */
export function legacyPills(d: DisponibilitaProseContent): string[] {
  const raw = [d.cosa_cerca, d.ambito, d.periodo, d.durata ?? null, d.dove].filter(Boolean) as string[];
  const seen = new Set<string>();
  return raw.filter((p) => {
    const key = p.toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * La disponibilità in testo piano, per i prompt (ricerca aziende, agente WhatsApp).
 * In italiano: i prompt del prodotto sono in italiano, la card in inglese la scrive
 * chi la mostra.
 */
export function disponibilitaPerPrompt(d: DisponibilitaProseContent | null | undefined): string {
  if (!d) return "n/d";
  if (d.attiva === false) {
    return `NON in cerca al momento${d.periodo ? ` (${d.periodo})` : ""}`;
  }

  const parts: string[] = [];

  if (d.finestre?.length) {
    const periodi = d.finestre
      .map((f) => (f.a ? `dal ${f.da} al ${f.a}` : `dal ${f.da} in poi`))
      .join("; ");
    parts.push(`quando: ${periodi}`);
  } else if (d.periodo) {
    parts.push(`quando: ${d.periodo}`);
  }

  const durata = formatDurata(d, {
    months: (n) => `${n} mesi`,
    range: (a, b) => `${a}-${b} mesi`,
    atLeast: (n) => `almeno ${n} mesi`,
    upTo: (n) => `fino a ${n} mesi`,
  });
  const durataParts = [durata, d.disponibile_a_restare ? "disponibile a restare oltre" : null].filter(Boolean);
  if (durataParts.length) parts.push(`durata: ${durataParts.join(", ")}`);
  else if (d.durata) parts.push(`durata: ${d.durata}`);

  if (d.ambiti?.length) parts.push(`ambiti: ${d.ambiti.join(", ")}`);
  else if (d.ambito) parts.push(`ambito: ${d.ambito}`);

  if (d.luoghi?.length) {
    parts.push(`luoghi: ${d.luoghi.map((l) => `${l.posto} (${MODALITA_PROMPT[l.modalita]})`).join(", ")}`);
  } else if (d.dove) parts.push(`dove: ${d.dove}`);

  if (d.tipi_azienda?.length) {
    parts.push(`tipo di azienda: ${d.tipi_azienda.map((t) => TIPO_AZIENDA_PROMPT[t]).join(", ")}`);
  }

  if (d.cosa_cerca && !d.tipi_azienda?.length) parts.push(`cerca: ${d.cosa_cerca}`);

  return parts.length ? parts.join(" · ") : "n/d";
}

const MODALITA_PROMPT: Record<ModalitaLavoro, string> = {
  in_presenza: "in presenza",
  ibrido: "ibrido",
  remoto: "da remoto",
};

const TIPO_AZIENDA_PROMPT: Record<TipoAzienda, string> = {
  startup: "startup",
  pmi: "piccola o media impresa",
  grande: "grande azienda",
  multinazionale: "multinazionale",
  boutique: "studio o boutique specializzata",
  pubblico_no_profit: "ente pubblico o no profit",
};

/** Identificatore breve per finestre e luoghi creati nel browser. */
export function newId(): string {
  return Math.random().toString(36).slice(2, 10);
}
