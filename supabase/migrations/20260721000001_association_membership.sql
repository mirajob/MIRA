-- Migration: gestione membership associazioni (modello "gruppo WhatsApp")
--
-- Tre livelli soli: presidente, amministratore, membro.
--   - presidente     -> tutto, non retrocedibile ne' rimuovibile (creatore del gruppo)
--   - amministratore -> dashboard + gestione membri/sezioni + nomina altri amministratori
--   - membro         -> nessun accesso alla dashboard (permissions vuoto => hasWorkspaceAccess false)
--
-- I valori enum association_reviewer / association_interviewer NON vengono rimossi:
-- togliere valori da un enum Postgres richiede di ricreare il tipo e tutte le colonne
-- che lo usano, ed e' rischioso su dati vivi. Vengono semplicemente ritirati dalla UI:
-- nessun nuovo membro potra' averli. Le righe esistenti restano leggibili.

-- Toggle per associazione: la gestione membership e' opt-in.
-- Gratis in questa fase, ma isolato in una colonna sua cosi' che un eventuale
-- paywall futuro non richieda di rifare il modello.
alter table association_profiles
  add column if not exists membership_enabled boolean not null default false;

-- Sezioni/divisioni create dall'associazione stessa (es. "Marketing", "M&A").
-- Non sono predefinite da MIRA: nome e ordine li decide l'associazione.
create table if not exists association_sections (
  id uuid primary key default gen_random_uuid(),
  association_id uuid not null references association_profiles(id) on delete cascade,
  name text not null,
  position int not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (association_id, name)
);

create index if not exists association_sections_association_idx
  on association_sections(association_id, position);

create trigger association_sections_updated_at
  before update on association_sections
  for each row execute function update_updated_at_column();

-- Un membro sta in una sola sezione, oppure in nessuna.
-- on delete set null: cancellare una sezione NON cancella i membri, li rimanda
-- in "Senza sezione".
alter table association_memberships
  add column if not exists section_id uuid references association_sections(id) on delete set null;

create index if not exists association_memberships_section_idx
  on association_memberships(section_id);

alter table association_sections enable row level security;

-- Le sezioni sono dati interni dell'associazione: nessuna esposizione pubblica.
-- L'accesso applicativo passa dal service client, che bypassa la RLS; questa policy
-- copre solo la lettura diretta da parte di chi e' membro attivo dell'associazione.
create policy association_sections_read_own
  on association_sections for select
  using (is_association_member(get_profile_id(), association_id));
