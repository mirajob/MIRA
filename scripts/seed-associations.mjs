/**
 * Inserisce (o aggiorna) le pagine associazione seminate da MIRA a partire da un file
 * di seed versionato in supabase/seed/.
 *
 *   node scripts/seed-associations.mjs supabase/seed/associations-bocconi.json
 *   node scripts/seed-associations.mjs supabase/seed/associations-bocconi.json --dry-run
 *
 * Regole di sicurezza:
 *  - le pagine nascono in bozza (public_page_status = draft): nessuno le vede finché
 *    l'admin non le pubblica da /admin/associations/seminate;
 *  - una pagina già rivendicata da un'associazione (claim_status = claimed) non viene
 *    MAI toccata, nemmeno se lo slug coincide: il contenuto scritto dal board vince
 *    sempre sul nostro;
 *  - nessun proprietario e nessuna membership: la rivendicazione crea la prima.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");

// supabase-js è una dipendenza diretta di packages/supabase: risolviamo da lì invece
// che dalla root, che non ce l'ha in dipendenze.
const require = createRequire(path.join(repoRoot, "packages/supabase/package.json"));
const { createClient } = require("@supabase/supabase-js");

const seedPath = process.argv[2];
const dryRun = process.argv.includes("--dry-run");

if (!seedPath) {
  console.error("Uso: node scripts/seed-associations.mjs <file-di-seed.json> [--dry-run]");
  process.exit(1);
}

const envFile = fs.readFileSync(path.join(repoRoot, "apps/web/.env.local"), "utf8");
const readEnv = (key) => {
  const match = envFile.match(new RegExp(`^${key}=(.*)$`, "m"));
  if (!match) throw new Error(`${key} non trovata in apps/web/.env.local`);
  return match[1].trim();
};

const supabase = createClient(
  readEnv("NEXT_PUBLIC_SUPABASE_URL"),
  readEnv("SUPABASE_SERVICE_ROLE_KEY")
);

const seed = JSON.parse(fs.readFileSync(path.resolve(repoRoot, seedPath), "utf8"));
const university = seed.university;
if (!university) throw new Error("Il file di seed deve dichiarare 'university'.");

console.log(
  `${dryRun ? "[dry run] " : ""}${seed.associations.length} associazioni · ${university}\n`
);

let created = 0;
let updated = 0;
let skipped = 0;

for (const a of seed.associations) {
  const { data: existing, error: lookupError } = await supabase
    .from("association_profiles")
    .select("id, name, claim_status, public_page_status")
    .eq("slug", a.slug)
    .maybeSingle();

  if (lookupError) {
    console.error(`  ERRORE lettura ${a.slug}: ${lookupError.message}`);
    process.exitCode = 1;
    continue;
  }

  if (existing && existing.claim_status !== "seeded") {
    console.log(`  SALTATA  ${a.name} — pagina già gestita dall'associazione`);
    skipped++;
    continue;
  }

  // Solo i campi presenti nella voce di seed finiscono nella riga. Serve perché i
  // file sono due e complementari: il roster porta nome, ambito e sito di tutte le
  // associazioni, le schede portano i testi di quelle già scritte. Se scrivessimo
  // anche i campi assenti, rilanciare il roster cancellerebbe le schede.
  const row = { university, claim_status: "seeded", official: false };
  for (const field of [
    "name",
    "slug",
    "category",
    "sectors",
    "short_description",
    "long_description",
    "website_url",
    "recruiting_timeline",
    "source_urls",
  ]) {
    if (a[field] !== undefined) row[field] = a[field];
  }

  if (existing) {
    // Non tocchiamo public_page_status: se l'admin l'ha già pubblicata, un
    // aggiornamento del testo non deve farla sparire dalla vista studenti.
    if (dryRun) {
      console.log(`  aggiorna ${a.name}`);
      updated++;
      continue;
    }
    const { error } = await supabase
      .from("association_profiles")
      .update(row)
      .eq("id", existing.id);
    if (error) {
      console.error(`  ERRORE aggiornamento ${a.slug}: ${error.message}`);
      process.exitCode = 1;
      continue;
    }
    console.log(`  aggiornata ${a.name}`);
    updated++;
  } else {
    if (dryRun) {
      console.log(`  crea ${a.name}`);
      created++;
      continue;
    }
    const { error } = await supabase.from("association_profiles").insert({
      ...row,
      public_page_status: "draft",
      verification_status: "verified",
      created_by_user_id: null,
    });
    if (error) {
      console.error(`  ERRORE creazione ${a.slug}: ${error.message}`);
      process.exitCode = 1;
      continue;
    }
    console.log(`  creata ${a.name}`);
    created++;
  }
}

console.log(`\ncreate ${created} · aggiornate ${updated} · saltate ${skipped}`);
