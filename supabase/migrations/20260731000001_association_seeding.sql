-- Migration: pagine associazione seminate da MIRA.
--
-- MIRA crea le pagine delle associazioni note di un ateneo partendo da fonti
-- pubbliche, senza aspettare che il presidente si registri. La pagina resta
-- invisibile finché l'admin non la pubblica, e non appartiene a nessuno finché
-- l'associazione non la rivendica.
--
-- Due assi indipendenti, entrambi già modellati o aggiunti qui:
--   public_page_status  draft (solo admin) → published (visibile agli studenti)
--   claim_status        seeded (nostra)    → claimed (dell'associazione)
--
-- Una pagina seeded non ha membership, non ha created_by_user_id, non può avere
-- cicli e non può ricevere candidature: uno studente non deve mai poter mandare
-- una candidatura che nessuno leggerà.

do $$ begin
  create type association_claim_status as enum ('seeded', 'claimed');
exception when duplicate_object then null;
end $$;

-- Le associazioni esistenti sono tutte nate da una registrazione reale, quindi
-- il default 'claimed' le lascia esattamente come sono.
alter table association_profiles
  add column if not exists claim_status association_claim_status not null default 'claimed',
  -- Da dove abbiamo preso le informazioni della scheda: serve a rispondere con
  -- precisione se un'associazione contesta una riga della sua pagina.
  add column if not exists source_urls text[];

create index if not exists association_profiles_claim_status_idx
  on association_profiles(claim_status);

-- Studenti che hanno chiesto di essere avvisati quando l'associazione apre le
-- selezioni. Su una pagina seminata è l'unica azione possibile al posto della
-- candidatura, ed è anche la domanda già raccolta da mostrare al presidente
-- quando lo invitiamo a rivendicare la pagina.
create table if not exists association_interest (
  id uuid primary key default gen_random_uuid(),
  association_id uuid not null references association_profiles(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique(association_id, user_id)
);

create index if not exists association_interest_association_idx
  on association_interest(association_id);
create index if not exists association_interest_user_idx
  on association_interest(user_id);

-- Nessuna policy client-side: inserimento e lettura passano da server action con
-- service role, come company_access_requests.
alter table association_interest enable row level security;
