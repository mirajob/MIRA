-- Migration: gestione dei colloqui a sessioni e slot.
--
-- Oggi un colloquio è una data secca scritta a mano dal board dentro
-- interview_invites, e lo studente la subisce. Il board si organizza fuori dal
-- prodotto, con Calendly o Doodle e messaggi su WhatsApp.
--
-- Il modello nuovo ricalca come funzionano davvero le selezioni associative:
--
--   sessione = un round ("Primo colloquio", "Colloquio finale"). Ogni round ha la
--   sua modalità: uno in presenza con un'aula, il successivo online con un link.
--   I round sono indipendenti, non c'è avanzamento automatico: chi passa il primo
--   viene invitato al secondo dal board.
--
--   slot = una casella della griglia generata dalla sessione. Lo sceglie lo
--   studente fra quelli liberi, come su Calendly.
--
--   panel = chi copre quello slot. Sta sullo slot e non sulla sessione perché i
--   membri del board si prendono le fasce in cui ci sono, e un colloquio può
--   essere con una persona o con tre.

do $$ begin
  create type interview_session_mode as enum ('online', 'in_person');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type interview_session_status as enum ('draft', 'open', 'closed');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type interview_slot_status as enum ('open', 'booked', 'cancelled', 'no_show', 'done');
exception when duplicate_object then null;
end $$;

create table if not exists interview_sessions (
  id uuid primary key default gen_random_uuid(),
  association_id uuid not null references association_profiles(id) on delete cascade,
  application_cycle_id uuid not null references application_cycles(id) on delete cascade,

  title text not null,
  description text,
  -- Ordina i round dentro il ciclo: 1 = primo colloquio, 2 = secondo...
  round_index smallint not null default 1,

  mode interview_session_mode not null,
  -- Uno dei due, a seconda della modalità. Il vincolo sotto lo impone.
  location text,
  meeting_link text,

  slot_duration_minutes smallint not null default 20,
  break_minutes smallint not null default 0,
  -- Quanti colloqui in parallelo: due aule, due panel, due colonne nella griglia.
  parallel_tracks smallint not null default 1,

  -- Le finestre da cui si genera la griglia:
  -- [{"date":"2026-10-15","start":"15:00","end":"19:00"}, ...]
  windows jsonb not null default '[]'::jsonb,

  status interview_session_status not null default 'draft',
  created_by_user_id uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  constraint interview_sessions_duration_positive check (slot_duration_minutes > 0),
  constraint interview_sessions_tracks_positive check (parallel_tracks between 1 and 12),
  -- Una sessione online senza link, o in presenza senza luogo, manderebbe lo
  -- studente a un colloquio che non sa dove si tiene.
  constraint interview_sessions_place_present check (
    (mode = 'online' and meeting_link is not null and length(trim(meeting_link)) > 0)
    or (mode = 'in_person' and location is not null and length(trim(location)) > 0)
    or status = 'draft'
  )
);

create index if not exists interview_sessions_cycle_idx on interview_sessions(application_cycle_id);
create index if not exists interview_sessions_association_idx on interview_sessions(association_id);

create trigger interview_sessions_updated_at
  before update on interview_sessions
  for each row execute function update_updated_at_column();

create table if not exists interview_slots (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references interview_sessions(id) on delete cascade,

  starts_at timestamptz not null,
  ends_at timestamptz not null,
  -- Quale dei colloqui in parallelo: 1..parallel_tracks.
  track smallint not null default 1,

  -- Chi ha prenotato. Null = libero.
  application_id uuid references applications(id) on delete set null,
  booked_at timestamptz,

  status interview_slot_status not null default 'open',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  constraint interview_slots_ends_after_start check (ends_at > starts_at),
  unique (session_id, starts_at, track)
);

-- Un candidato non può occupare due slot nello stesso round.
create unique index if not exists interview_slots_one_per_application
  on interview_slots(session_id, application_id)
  where application_id is not null;

create index if not exists interview_slots_session_idx on interview_slots(session_id, starts_at);
create index if not exists interview_slots_application_idx on interview_slots(application_id);

create trigger interview_slots_updated_at
  before update on interview_slots
  for each row execute function update_updated_at_column();

-- Chi conduce il colloquio. Uno slot senza nessuno qui dentro non è prenotabile:
-- il controllo sta nella query che mostra gli slot liberi allo studente.
create table if not exists interview_slot_interviewers (
  slot_id uuid not null references interview_slots(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (slot_id, user_id)
);

create index if not exists interview_slot_interviewers_user_idx
  on interview_slot_interviewers(user_id);

-- L'invito esistente diventa "sei invitato al round N, scegliti l'orario".
-- selected_time resta e si riempie alla prenotazione: la dashboard studente lo
-- legge già oggi e continua a funzionare senza modifiche.
alter table interview_invites
  add column if not exists session_id uuid references interview_sessions(id) on delete cascade,
  add column if not exists slot_id uuid references interview_slots(id) on delete set null;

create index if not exists interview_invites_session_idx on interview_invites(session_id);

-- Nessuna policy client-side: lettura e scrittura passano da server action con
-- service role, come il resto della dashboard associazione.
alter table interview_sessions enable row level security;
alter table interview_slots enable row level security;
alter table interview_slot_interviewers enable row level security;
