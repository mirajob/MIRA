-- Migration: canale WhatsApp — docs/15_MIRA_WHATSAPP_AGENT_SPEC.md
--
-- Qui vivono le persone che scrivono al numero di MIRA e non hanno ancora un account.
-- Stiamo raccogliendo dati personali di non utenti, quindi due regole stanno nello schema
-- e non nel codice: nessun accesso dal client (RLS accesa senza policy, si passa solo da
-- service role), e una data di scadenza oltre la quale il lead va cancellato.
--
-- Il numero di telefono NON e' una prova di identita': non si usa mai per riconoscere un
-- utente esistente o per unire account. Serve solo a ritrovare la conversazione.

create table if not exists whatsapp_leads (
  id uuid primary key default gen_random_uuid(),

  -- Numero in formato internazionale senza segni, come lo manda Meta (es. 393501234567).
  phone_e164 text not null unique,

  -- Quale percorso ha scelto dal menu di apertura. Null finche' non sceglie.
  path text check (path in ('card', 'associazioni', 'domanda')),

  -- A che punto e' la conversazione: uno degli step di packages/domain/src/whatsapp-agent.ts.
  -- Volutamente text e non enum: i percorsi cambieranno piu' spesso di quanto valga la pena
  -- migrare un tipo Postgres.
  step text not null default 'menu',

  -- Le risposte raccolte, nella stessa forma dei blocchi della card (disponibilita,
  -- piano_carriera), cosi' il travaso al momento della registrazione e' una copia.
  collected_json jsonb not null default '{}'::jsonb,

  -- Token del link personale mirajob.cloud/wa/<token>. Non fa accedere: apre solo una
  -- pagina che mostra cosa abbiamo raccolto e invita a registrarsi. WhatsApp si inoltra,
  -- quindi un token che creasse una sessione sarebbe un buco.
  token text unique,
  token_expires_at timestamptz,

  -- Consumato alla prima registrazione andata a buon fine, una volta sola.
  consumed_at timestamptz,
  claimed_by_profile_id uuid references profiles(id) on delete set null,

  -- Oltre questa data il lead va cancellato: e' un dato personale di chi non e' mai
  -- diventato utente e non ha accettato niente.
  purge_after timestamptz not null default now() + interval '90 days',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists whatsapp_leads_token_idx
  on whatsapp_leads(token)
  where token is not null and consumed_at is null;

create index if not exists whatsapp_leads_purge_idx
  on whatsapp_leads(purge_after)
  where consumed_at is null;

comment on column whatsapp_leads.phone_e164 is
  'Numero di chi ha scritto. Non e'' una prova di identita'': mai usato per riconoscere o unire account.';
comment on column whatsapp_leads.token is
  'Token monouso del link personale. Non crea sessione: apre solo la pagina di atterraggio.';
comment on column whatsapp_leads.purge_after is
  'Dopo questa data il lead va cancellato se non si e'' convertito (informativa privacy).';

-- Registro dei messaggi, separato dal lead: serve a capire cosa e' successo quando una
-- conversazione non torna. Non si cancella insieme al lead per errore, ha la sua scadenza.
create table if not exists whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references whatsapp_leads(id) on delete cascade,
  direction text not null check (direction in ('in', 'out')),
  -- Corpo grezzo cosi' come arriva da Meta o come lo mandiamo, per poter ricostruire.
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists whatsapp_messages_lead_idx
  on whatsapp_messages(lead_id, created_at);

-- Nessuna policy: lettura e scrittura passano solo da server con service role, come
-- association_claim_requests. Il client non tocca mai queste tabelle.
alter table whatsapp_leads enable row level security;
alter table whatsapp_messages enable row level security;
