/**
 * Riconoscere che due nomi indicano la stessa associazione, senza AI.
 *
 * Serve quando qualcuno registra la sua associazione dalla landing e MIRA ha già seminato
 * quella pagina: senza questo controllo nasce un doppione che nessuno nota.
 *
 * La regola è volutamente prudente. Un collegamento automatico sbagliato manderebbe un
 * presidente a chiedere la gestione della pagina di un'altra associazione, mentre un
 * doppione in più costa solo un'unione manuale in admin. Quindi:
 *   - "certain": stesso nome normalizzato, oppure acronimo che combacia con l'altro nome.
 *     Qui il form propone di prendere in gestione la pagina esistente.
 *   - "possible": nomi molto simili ma non uguali. Qui la pagina si crea lo stesso e
 *     l'admin decide.
 */

/** Parole che non distinguono un'associazione dall'altra e vanno tolte prima del confronto. */
const STOPWORDS = new Set([
  "associazione",
  "association",
  "associazioni",
  "student",
  "students",
  "studenti",
  "studentesca",
  "club",
  "society",
  "societa",
  "team",
  "group",
  "gruppo",
  "organization",
  "organisation",
  "the",
  "of",
  "for",
  "and",
  "e",
  "di",
  "de",
  "del",
  "della",
  "dei",
  "delle",
  "da",
  "la",
  "il",
  "lo",
  "gli",
  "le",
  "in",
  "a",
  "at",
  "per",
  "con",
  "su",
  "un",
  "una",
  "al",
  "alla",
  // Atenei: compaiono a volte nel nome e a volte no, quindi non distinguono nulla
  // all'interno dello stesso ateneo, che è l'unico contesto in cui confrontiamo.
  "bocconi",
  "poli",
  "polimi",
  "politecnico",
  "milano",
  "milan",
  "universita",
  "university",
]);

/** Minuscole, via accenti e punteggiatura, spazi normalizzati. */
export function normalizeAssociationName(name: string): string {
  return (name ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Le parole che contano davvero, in ordine. */
export function significantWords(name: string): string[] {
  const words = normalizeAssociationName(name).split(" ").filter(Boolean);
  const kept = words.filter((w) => !STOPWORDS.has(w));
  // Se togliendo le parole generiche non resta niente (es. "Student Club"), meglio
  // confrontare il nome intero che confrontare il vuoto, che combacerebbe con tutto.
  return kept.length > 0 ? kept : words;
}

/**
 * Le sigle possibili di un nome, dalle iniziali delle parole.
 *
 * Ne servono due: chi scrive "JEBS" include l'iniziale di parole che il confronto scarta
 * come generiche ("Junior Enterprise **B**occoni **S**tudents"), mentre chi scrive "JE"
 * usa solo quelle che contano. Confrontando entrambe si prendono tutti e due i casi.
 */
export function associationAcronyms(name: string): string[] {
  const all = normalizeAssociationName(name).split(" ").filter(Boolean);
  const significant = significantWords(name);
  const acronyms = [all, significant]
    .filter((words) => words.length >= 2)
    .map((words) => words.map((w) => w[0]).join(""));
  return [...new Set(acronyms)];
}

/** Distanza di Levenshtein, iterativa su una sola riga. */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  let prev: number[] = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const curr: number[] = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min((curr[j - 1] ?? 0) + 1, (prev[j] ?? 0) + 1, (prev[j - 1] ?? 0) + cost);
    }
    prev = curr;
  }
  return prev[b.length] ?? 0;
}

/** 0 = niente in comune, 1 = identiche. */
function similarity(a: string, b: string): number {
  const longest = Math.max(a.length, b.length);
  if (longest === 0) return 1;
  return 1 - levenshtein(a, b) / longest;
}

export type AssociationMatchLevel = "certain" | "possible" | "none";

export interface AssociationMatchResult {
  level: AssociationMatchLevel;
  /** Perché è stato considerato lo stesso nome: utile in admin per spiegare l'avviso. */
  reason: "same_name" | "acronym" | "similar" | "none";
  score: number;
}

/** Confronta due nomi di associazione dello STESSO ateneo. */
export function matchAssociationNames(input: string, candidate: string): AssociationMatchResult {
  const a = significantWords(input).join(" ");
  const b = significantWords(candidate).join(" ");
  if (!a || !b) return { level: "none", reason: "none", score: 0 };

  if (a === b) return { level: "certain", reason: "same_name", score: 1 };

  // Acronimo: uno dei due è scritto per esteso e l'altro come sigla ("JEBS" ↔ "Junior
  // Enterprise Bocconi Students"). Almeno tre lettere, altrimenti combaciano sigle a caso.
  const compactA = a.replace(/\s/g, "");
  const compactB = b.replace(/\s/g, "");
  const acronymsA = associationAcronyms(input);
  const acronymsB = associationAcronyms(candidate);
  if (
    acronymsB.some((acr) => acr.length >= 3 && acr === compactA) ||
    acronymsA.some((acr) => acr.length >= 3 && acr === compactB)
  ) {
    return { level: "certain", reason: "acronym", score: 0.95 };
  }

  const score = similarity(compactA, compactB);
  if (score >= 0.9) return { level: "certain", reason: "same_name", score };
  if (score >= 0.7) return { level: "possible", reason: "similar", score };

  // Un nome contenuto per intero nell'altro ("Bocconi Students for Finance" dentro
  // "Bocconi Students for Sustainable Finance"): somigliante, mai automatico.
  if (compactA.length >= 6 && compactB.length >= 6 && (compactA.includes(compactB) || compactB.includes(compactA))) {
    return { level: "possible", reason: "similar", score: Math.max(score, 0.75) };
  }

  return { level: "none", reason: "none", score };
}

export interface AssociationCandidate {
  id: string;
  name: string;
}

export interface RankedAssociationMatch<T extends AssociationCandidate> {
  candidate: T;
  match: AssociationMatchResult;
}

/**
 * Ordina i candidati per somiglianza con il nome digitato. Chi chiama passa già solo le
 * associazioni dello stesso ateneo: confrontare nomi di atenei diversi produrrebbe
 * collegamenti sbagliati tra omonime (di "Consulting Club" ce n'è una per università).
 */
export function rankAssociationMatches<T extends AssociationCandidate>(
  input: string,
  candidates: T[]
): RankedAssociationMatch<T>[] {
  return candidates
    .map((candidate) => ({ candidate, match: matchAssociationNames(input, candidate.name) }))
    .filter((r) => r.match.level !== "none")
    .sort((a, b) => b.match.score - a.match.score);
}
