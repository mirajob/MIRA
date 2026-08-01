-- Migration: le disponibilità del board sostituiscono la scelta degli slot a mano.
--
-- Nella prima versione ogni membro si prendeva le singole caselle della griglia.
-- Sbagliato: nessuno ragiona per caselle, si ragiona per fasce ("giovedì dalle 15
-- alle 17"). Ora ognuno dichiara quando c'è, e uno slot è prenotabile se ci si
-- sovrappongono almeno tante disponibilità quante ne chiede la sessione.
--
-- Sul link: un link Meet lo può generare solo Google, quindi finché non colleghiamo
-- il calendario esistono due modi, e la sessione dichiara quale usa.
--   shared        -> una stanza sola, sulla sessione o su chi conduce
--   per_interview -> chi conduce incolla il link sul singolo colloquio, dopo la
--                    prenotazione. È il flusso manuale di oggi, ma tracciato.

do $$ begin
  create type interview_link_mode as enum ('shared', 'per_interview');
exception when duplicate_object then null;
end $$;

-- Nessuno si è ancora preso slot a mano (tabella vuota) e il meccanismo è
-- sostituito: si toglie invece di lasciare due strade che fanno la stessa cosa.
drop table if exists interview_slot_interviewers;

create table if not exists interview_availability (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references interview_sessions(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz default now(),

  constraint interview_availability_ends_after_start check (ends_at > starts_at),
  -- Due fasce identiche della stessa persona non aggiungono nulla.
  unique (session_id, user_id, starts_at, ends_at)
);

create index if not exists interview_availability_session_idx
  on interview_availability(session_id, starts_at);
create index if not exists interview_availability_user_idx
  on interview_availability(session_id, user_id);

alter table interview_availability enable row level security;

alter table interview_sessions
  -- Quante persone servono per condurre un colloquio. Una di norma; chi li fa in
  -- due lo dichiara e gli orari coperti da una sola persona non si aprono.
  add column if not exists required_interviewers smallint not null default 1,
  add column if not exists link_mode interview_link_mode not null default 'shared';

alter table interview_sessions
  add constraint interview_sessions_required_interviewers_positive
  check (required_interviewers between 1 and 5);

-- Il vincolo precedente pretendeva un link su ogni sessione online. Con
-- link_mode = 'per_interview' quel link non esiste ancora al momento della
-- creazione: arriva dopo, sul singolo colloquio.
alter table interview_sessions drop constraint if exists interview_sessions_place_present;

alter table interview_sessions
  add constraint interview_sessions_place_present check (
    status = 'draft'
    or (mode = 'in_person' and location is not null and length(trim(location)) > 0)
    or (mode = 'online' and link_mode = 'per_interview')
    or (mode = 'online' and meeting_link is not null and length(trim(meeting_link)) > 0)
  );

alter table interview_slots
  -- Chi conduce, deciso alla prenotazione fra chi è disponibile in quella fascia.
  add column if not exists interviewer_user_id uuid references profiles(id) on delete set null,
  -- Link del singolo colloquio, quando la sessione lavora in per_interview.
  add column if not exists meeting_link text;

create index if not exists interview_slots_interviewer_idx
  on interview_slots(interviewer_user_id);

-- La stanza personale di chi conduce: si imposta una volta e vale per tutti i suoi
-- colloqui. Sta sul profilo e non sull'associazione perché è la stanza della
-- persona, e chi fa parte di due associazioni non la reimposta due volte.
alter table profiles
  add column if not exists meeting_link text;

comment on column profiles.meeting_link is
  'Stanza permanente per le videochiamate (Meet, Zoom, Teams). Usata sui colloqui quando la sessione e'' in modalita'' shared.';
