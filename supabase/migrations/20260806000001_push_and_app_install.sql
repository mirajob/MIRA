-- Migration: notifiche push e MIRA installata sul telefono
--
-- Due cose distinte che arrivano insieme perché nascono dalla stessa cosa (la web app
-- installabile pubblicata il 2026-08-06):
--
-- 1. push_subscriptions: a chi spedire una notifica. Una riga per DISPOSITIVO, non per
--    persona: lo stesso studente puo' avere MIRA sul telefono e sul portatile e le vuole
--    su entrambi. L'endpoint e' l'indirizzo che ci da' il browser, e' unico e lungo.
-- 2. tre colonne su profiles per sapere chi usa MIRA come app: serve a decidere se un
--    giorno varra' la pena fare l'app vera degli store.

create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  -- L'URL che il browser ci da' per raggiungere quel dispositivo. Unico: se lo stesso
  -- dispositivo si iscrive di nuovo aggiorniamo la riga invece di crearne una seconda,
  -- altrimenti la stessa notifica arriverebbe doppia.
  endpoint text not null unique,
  -- Chiavi di cifratura del dispositivo: senza, il contenuto non e' leggibile da chi lo riceve.
  p256dh text not null,
  auth text not null,
  user_agent text,
  platform text,
  -- Iscritto da MIRA installata o da una scheda del browser. Su iPhone puo' essere solo
  -- installata: Apple non da' le notifiche web a Safari normale.
  standalone boolean not null default false,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  -- Consegne fallite di fila. Un dispositivo spento o senza rete fallisce e non vuol dire
  -- niente; quando il servizio di push risponde "questo indirizzo non esiste piu'" la riga
  -- viene cancellata subito dal codice, senza aspettare il contatore.
  failure_count integer not null default 0
);

create index push_subscriptions_user_idx on push_subscriptions(user_id);

alter table push_subscriptions enable row level security;

-- Le notifiche le spedisce il server con la chiave di servizio, che salta le policy.
-- Queste servono allo studente per vedere e togliere le proprie iscrizioni dal Profilo.
create policy "Users can read own push subscriptions"
  on push_subscriptions for select
  using (user_id = get_profile_id());

create policy "Users can delete own push subscriptions"
  on push_subscriptions for delete
  using (user_id = get_profile_id());

-- MIRA usata come app installata.
-- app_installed_at si riempie solo su Android, dove il browser avvisa nell'istante
-- dell'installazione. Su iPhone quell'evento non esiste: li' sappiamo solo che l'ha
-- aperta dall'icona, ed e' app_last_open_at a dircelo.
alter table profiles
  add column if not exists app_installed_at timestamptz,
  add column if not exists app_last_open_at timestamptz,
  add column if not exists app_platform text;

create index if not exists profiles_app_last_open_idx on profiles(app_last_open_at)
  where app_last_open_at is not null;
