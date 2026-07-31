-- Migration: richieste di gestione di una pagina associazione.
--
-- Su una pagina seminata non c'è nessun recapito MIRA: chi fa parte del board
-- chiede di prenderla in gestione da dentro il prodotto, e da lì segue lo stato
-- della richiesta nella sua sezione Associazioni.
--
-- L'invio richiede due passaggi espliciti nell'interfaccia (compilazione +
-- conferma) perché una richiesta partita per sbaglio costa una revisione manuale
-- all'admin e una risposta all'associazione.
--
-- request_type distingue chi vuole gestire la pagina da chi ne chiede la
-- rimozione: senza questa seconda via un'associazione che non vuole comparire
-- non avrebbe alcun modo di dirlo, avendo tolto i recapiti dalla pagina.

do $$ begin
  create type association_claim_request_type as enum ('claim', 'removal');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type association_claim_request_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null;
end $$;

create table if not exists association_claim_requests (
  id uuid primary key default gen_random_uuid(),
  association_id uuid not null references association_profiles(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  request_type association_claim_request_type not null default 'claim',
  -- Ruolo dichiarato dal richiedente nell'associazione (presidente, responsabile
  -- recruiting, ...). È il dato su cui l'admin decide se approvare.
  role_in_association text,
  note text,
  status association_claim_request_status not null default 'pending',
  rejected_reason text,
  reviewed_by_user_id uuid references profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz default now(),
  -- Una sola richiesta per persona e associazione: un secondo tentativo aggiorna
  -- quella esistente invece di creare una coda di doppioni.
  unique(association_id, user_id)
);

create index if not exists association_claim_requests_association_idx
  on association_claim_requests(association_id);
create index if not exists association_claim_requests_status_idx
  on association_claim_requests(status);
create index if not exists association_claim_requests_user_idx
  on association_claim_requests(user_id);

-- Nessuna policy client-side: invio, lettura dello stato e revisione passano tutti
-- da server action con service role, come association_interest.
alter table association_claim_requests enable row level security;
