/**
 * Conversione delle disponibilità scritte a mano nella struttura del rework 2026-08.
 *
 * Prima erano cinque caselle di testo libero ("da giugno 2027", "3-6 mesi", "Milano o
 * altre sedi"). Ora sono date vere, mesi, ambiti, luoghi con modalità e tipi di azienda.
 * Questo script legge le righe esistenti e le riscrive nella forma nuova.
 *
 *   node scripts/migrate-disponibilita.mjs            # anteprima, non scrive niente
 *   node scripts/migrate-disponibilita.mjs --apply    # scrive su Supabase
 *
 * Regole non negoziabili:
 * - Quello che non si capisce NON si inventa: i campi liberi restano dove sono e la
 *   card continua a mostrarli finché lo studente non li rimette a mano.
 * - Dove c'era solo il mese, il periodo parte dal primo e finisce all'ultimo giorno:
 *   è la scelta esplicita del founder, meglio una data piena approssimata che nessuna.
 * - Ogni riga convertita viene stampata prima/dopo, così la si controlla a occhio
 *   prima di dare --apply.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const APPLY = process.argv.includes("--apply");

// ——— Ambiente ———
const env = Object.fromEntries(
  readFileSync(join(here, "..", "apps", "web", ".env.local"), "utf8")
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => {
      const i = line.indexOf("=");
      return [line.slice(0, i).trim(), line.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
    })
);

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Mancano NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY in apps/web/.env.local");
  process.exit(1);
}

async function rest(path, init = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

// ——— Lettura del testo libero ———

const MESI = {
  gennaio: 1, gen: 1, january: 1, jan: 1,
  febbraio: 2, feb: 2, february: 2,
  marzo: 3, mar: 3, march: 3,
  aprile: 4, apr: 4, april: 4,
  maggio: 5, mag: 5, may: 5,
  giugno: 6, giu: 6, june: 6, jun: 6,
  luglio: 7, lug: 7, july: 7, jul: 7,
  agosto: 8, ago: 8, august: 8, aug: 8,
  settembre: 9, set: 9, sett: 9, september: 9, sep: 9, sept: 9,
  ottobre: 10, ott: 10, october: 10, oct: 10,
  novembre: 11, nov: 11, november: 11,
  dicembre: 12, dic: 12, december: 12, dec: 12,
};

const MESE_RE = new RegExp(`\\b(${Object.keys(MESI).join("|")})\\b\\s*(\\d{4})?`, "gi");

function ultimoGiorno(anno, mese) {
  return new Date(Date.UTC(anno, mese, 0)).getUTCDate();
}

function iso(anno, mese, giorno) {
  return `${anno}-${String(mese).padStart(2, "0")}-${String(giorno).padStart(2, "0")}`;
}

/**
 * Da "giugno 2027 - agosto 2027", "da settembre 2026", "June 2027 - August 2027"
 * a finestre con date piene. Un solo mese trovato = periodo aperto da quel mese.
 */
function leggiFinestre(periodo) {
  if (!periodo) return { finestre: [], capito: false };
  const testo = periodo.toLowerCase();

  const trovati = [];
  let match;
  MESE_RE.lastIndex = 0;
  while ((match = MESE_RE.exec(testo)) !== null) {
    trovati.push({ mese: MESI[match[1]], anno: match[2] ? Number(match[2]) : null });
  }
  if (trovati.length === 0) return { finestre: [], capito: false };

  // Anno mancante su un estremo: si eredita dall'altro. "giugno - agosto 2027".
  const annoNoto = trovati.find((t) => t.anno)?.anno ?? null;
  if (!annoNoto) return { finestre: [], capito: false };
  for (const t of trovati) if (!t.anno) t.anno = annoNoto;

  const apertoInPoi = /\b(da|dal|from|onwards|in poi)\b/.test(testo) && trovati.length === 1;
  const primo = trovati[0];
  const ultimo = trovati[trovati.length - 1];

  if (apertoInPoi || trovati.length === 1) {
    return {
      finestre: [{ id: nuovoId(), da: iso(primo.anno, primo.mese, 1), a: apertoInPoi ? null : iso(primo.anno, primo.mese, ultimoGiorno(primo.anno, primo.mese)) }],
      capito: true,
    };
  }

  return {
    finestre: [{ id: nuovoId(), da: iso(primo.anno, primo.mese, 1), a: iso(ultimo.anno, ultimo.mese, ultimoGiorno(ultimo.anno, ultimo.mese)) }],
    capito: true,
  };
}

/** Da "3 mesi", "3-6 mesi", "un anno", "qualche settimana" a min/max in mesi. */
function leggiDurata(durata) {
  if (!durata) return { min: null, max: null, restare: false, capito: false };
  const testo = durata.toLowerCase();

  if (/indefinit|indetermin|permanent|lungo termine|long term/.test(testo)) {
    return { min: null, max: null, restare: true, capito: true };
  }
  if (/anno|year/.test(testo)) return { min: 12, max: 12, restare: false, capito: true };
  if (/settiman|week/.test(testo)) return { min: 1, max: 1, restare: false, capito: true };

  const range = /(\d+)\s*[-–a]\s*(\d+)\s*mes|(\d+)\s*[-–to]+\s*(\d+)\s*month/.exec(testo);
  if (range) {
    const a = Number(range[1] ?? range[3]);
    const b = Number(range[2] ?? range[4]);
    return { min: a, max: b, restare: false, capito: true };
  }

  const singolo = /(\d+)\s*(mes|month)/.exec(testo);
  if (singolo) {
    const n = Number(singolo[1]);
    return { min: n, max: n, restare: false, capito: true };
  }

  return { min: null, max: null, restare: false, capito: false };
}

/** "Sales & Trading, Macro Research, Asset Management" → al massimo tre ambiti. */
function leggiAmbiti(ambito) {
  if (!ambito) return [];
  return ambito
    .split(/[,;/]|\be\b|\band\b/i)
    .map((a) => a.trim())
    .filter((a) => a.length > 1)
    .slice(0, 3);
}

/** "Monza e brianza o Milano" → luoghi. La modalità non c'era: resta in presenza. */
function leggiLuoghi(dove) {
  if (!dove) return [];
  const remoto = /remot|smart working|ovunque|anywhere/i.test(dove);
  const pezzi = dove
    .split(/[,;/]|\bo\b|\boppure\b|\bor\b/i)
    .map((p) => p.trim())
    .filter((p) => p.length > 1 && !/^(disponibile|possibly|possibilmente)$/i.test(p))
    .slice(0, 4);

  if (pezzi.length === 0) return [];
  return pezzi.map((posto) => ({
    id: nuovoId(),
    posto,
    modalita: remoto && /remot|ovunque|anywhere/i.test(posto) ? "remoto" : "in_presenza",
  }));
}

function nuovoId() {
  return Math.random().toString(36).slice(2, 10);
}

// ——— Conversione di una riga ———

function converti(vecchio) {
  const attiva = vecchio.attiva === false ? false : vecchio.attiva ?? null;

  if (attiva === false) {
    // Chi non è in cerca ha solo il motivo da conservare.
    return {
      nuovo: {
        attiva: false,
        finestre: [],
        durata_min_mesi: null,
        durata_max_mesi: null,
        disponibile_a_restare: false,
        ambiti: [],
        tipi_azienda: [],
        luoghi: [],
        periodo: vecchio.periodo ?? null,
      },
      residuo: [],
      scartati: vecchio.cosa_cerca ? [`cosa cerca: "${vecchio.cosa_cerca.trim()}"`] : [],
    };
  }

  const { finestre, capito: dateCapite } = leggiFinestre(vecchio.periodo);
  const durata = leggiDurata(vecchio.durata);
  const ambiti = leggiAmbiti(vecchio.ambito);
  const luoghi = leggiLuoghi(vecchio.dove);

  const nuovo = {
    attiva,
    finestre,
    durata_min_mesi: durata.min,
    durata_max_mesi: durata.max,
    disponibile_a_restare: durata.restare,
    ambiti,
    tipi_azienda: [],
    luoghi,
  };

  // Quello che non siamo riusciti a leggere resta com'era: la card lo mostra ancora e
  // lo studente lo rimette a mano. Meglio un dato vecchio visibile che uno inventato.
  const residuo = [];
  const scartati = [];
  if (vecchio.periodo && !dateCapite) {
    nuovo.periodo = vecchio.periodo;
    residuo.push(`periodo: "${vecchio.periodo}"`);
  }
  if (vecchio.durata && !durata.capito) {
    nuovo.durata = vecchio.durata;
    residuo.push(`durata: "${vecchio.durata}"`);
  }
  if (vecchio.ambito && ambiti.length === 0) {
    nuovo.ambito = vecchio.ambito;
    residuo.push(`ambito: "${vecchio.ambito}"`);
  }
  if (vecchio.dove && luoghi.length === 0) {
    nuovo.dove = vecchio.dove;
    residuo.push(`dove: "${vecchio.dove}"`);
  }
  // `cosa_cerca` ("stage curriculare", "part time") esce dal prodotto per scelta: le
  // date, i mesi e il tipo di azienda dicono già la stessa cosa in modo utilizzabile.
  // Non lo riportiamo, altrimenti ogni card resterebbe segnalata come da sistemare.
  if (vecchio.cosa_cerca) scartati.push(`cosa cerca: "${vecchio.cosa_cerca.trim()}"`);

  return { nuovo, residuo, scartati };
}

function riassunto(d) {
  const parti = [];
  if (d.finestre?.length) {
    parti.push(d.finestre.map((f) => (f.a ? `${f.da} → ${f.a}` : `${f.da} → in poi`)).join("; "));
  }
  if (d.durata_min_mesi || d.durata_max_mesi) parti.push(`${d.durata_min_mesi ?? "?"}-${d.durata_max_mesi ?? "?"} mesi`);
  if (d.disponibile_a_restare) parti.push("resta oltre");
  if (d.ambiti?.length) parti.push(`ambiti: ${d.ambiti.join(" / ")}`);
  if (d.luoghi?.length) parti.push(`luoghi: ${d.luoghi.map((l) => `${l.posto} (${l.modalita})`).join(", ")}`);
  if (d.attiva === false) parti.push(`non in cerca${d.periodo ? ` (${d.periodo})` : ""}`);
  return parti.join(" · ") || "(vuoto)";
}

// ——— Esecuzione ———

const righe = await rest("card_blocks?block_type=eq.disponibilita&select=id,student_profile_id,prose_content,status");

let convertite = 0;
let saltate = 0;
let conResiduo = 0;

for (const riga of righe) {
  const vecchio = riga.prose_content ?? {};
  const haStruttura =
    vecchio.finestre?.length ||
    vecchio.ambiti?.length ||
    vecchio.luoghi?.length ||
    vecchio.tipi_azienda?.length ||
    vecchio.durata_min_mesi != null ||
    vecchio.durata_max_mesi != null;
  const haTesto = vecchio.cosa_cerca || vecchio.ambito || vecchio.periodo || vecchio.durata || vecchio.dove;

  if (haStruttura || (!haTesto && vecchio.attiva !== false)) {
    saltate += 1;
    continue;
  }

  const { nuovo, residuo, scartati } = converti(vecchio);
  convertite += 1;
  if (residuo.length) conResiduo += 1;

  console.log(`\n— ${riga.id} (${riga.status})`);
  console.log(`  prima: ${JSON.stringify({ cosa_cerca: vecchio.cosa_cerca, ambito: vecchio.ambito, periodo: vecchio.periodo, durata: vecchio.durata, dove: vecchio.dove })}`);
  console.log(`  dopo:  ${riassunto(nuovo)}`);
  if (residuo.length) console.log(`  resta da rimettere a mano: ${residuo.join(" · ")}`);
  if (scartati.length) console.log(`  non riportato (campo eliminato): ${scartati.join(" · ")}`);

  if (APPLY) {
    await rest(`card_blocks?id=eq.${riga.id}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ prose_content: nuovo }),
    });
  }
}

console.log(
  `\n${APPLY ? "SCRITTE" : "ANTEPRIMA"} · righe totali ${righe.length} · convertite ${convertite} · già a posto o vuote ${saltate} · con pezzi da rimettere a mano ${conResiduo}`
);
if (!APPLY) console.log("Niente è stato scritto. Per applicare: node scripts/migrate-disponibilita.mjs --apply");
