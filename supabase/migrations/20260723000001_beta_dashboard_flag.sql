-- Flag di rilascio graduale per la nuova dashboard associazioni (card + percorso guidato).
--
-- La nuova esperienza si accende PER ASSOCIAZIONE, non per utente: la dashboard e' un
-- oggetto dell'associazione, e i collaboratori del board devono vedere tutti la stessa
-- cosa. Di conseguenza anche gli studenti che si candidano a un'associazione beta vedono
-- la nuova vista del ciclo, mentre sulle altre resta quella attuale.
--
-- Finche' il flag esiste convivono due percorsi: il vecchio non va toccato.

alter table profiles
  add column if not exists beta_owner boolean not null default false;

comment on column profiles.beta_owner is
  'Account di test interno: le associazioni che crea nascono con beta_dashboard = true.';

alter table association_profiles
  add column if not exists beta_dashboard boolean not null default false;

comment on column association_profiles.beta_dashboard is
  'Nuova dashboard a card + percorso guidato. Rimuovere insieme al vecchio percorso a rilascio completato.';

create index if not exists association_profiles_beta_dashboard_idx
  on association_profiles(beta_dashboard)
  where beta_dashboard;

-- Account beta iniziale (founder).
update profiles
  set beta_owner = true
  where lower(email) = 'federico.germani@studbocconi.it';

-- Associazioni gia' create dagli account beta.
update association_profiles a
  set beta_dashboard = true
  from profiles p
  where a.created_by_user_id = p.id
    and p.beta_owner
    and not a.beta_dashboard;

-- Le associazioni future create da un account beta nascono gia' accese. Sta in un trigger
-- e non nel codice applicativo perche' i percorsi di creazione sono due
-- (association-register.ts e accept-invitation.ts) e ne servirebbero altrettante patch.
create or replace function set_beta_dashboard_on_association()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.created_by_user_id is not null and not coalesce(new.beta_dashboard, false) then
    new.beta_dashboard := exists (
      select 1 from profiles
      where id = new.created_by_user_id and beta_owner
    );
  end if;
  return new;
end;
$$;

drop trigger if exists association_profiles_beta_dashboard on association_profiles;

create trigger association_profiles_beta_dashboard
  before insert on association_profiles
  for each row execute function set_beta_dashboard_on_association();

-- Stato di costruzione della card del ciclo: quale blocco e' in corso e quali sono gia'
-- confermati. Vive sul ciclo stesso (che nasce in draft e si riempie un blocco alla volta)
-- invece che in una tabella separata, cosi' riprendere da dove si era rimasti e' gratis.
alter table application_cycles
  add column if not exists build_state jsonb not null default '{}'::jsonb;

comment on column application_cycles.build_state is
  'Percorso di costruzione: {"phase": "<blocco corrente>", "approved": ["<blocchi confermati>"]}. Vuoto = ciclo creato col vecchio flusso.';
