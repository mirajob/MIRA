-- Stato del percorso guidato dell'associazione (Panoramica): quali tappe il board ha
-- saltato e se ha chiuso la guida. Il "completato" di ogni tappa NON e' salvato qui: e'
-- derivato dai dati reali (pagina pubblicata, collaboratori invitati, membri, cicli), cosi'
-- non puo' andare fuori sync. Qui teniamo solo le decisioni esplicite dell'utente.
alter table association_profiles
  add column if not exists onboarding_state jsonb not null default '{}'::jsonb;

comment on column association_profiles.onboarding_state is
  'Percorso guidato: {"skipped": ["<tappa>"...], "dismissed": bool}. Il completamento delle tappe e'' derivato dai dati, non salvato qui.';
