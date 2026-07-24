-- Stato di costruzione della pagina pubblica come card, sullo stesso modello di
-- application_cycles.build_state. Vive sul profilo dell'associazione: cosi' costruire la
-- pagina a blocchi e riprendere da dove si era rimasti e' gratis, senza tabelle separate.
alter table association_profiles
  add column if not exists page_build_state jsonb not null default '{}'::jsonb;

comment on column association_profiles.page_build_state is
  'Percorso di costruzione della pagina pubblica: {"phase": "<blocco>", "approved": ["<blocchi>"]}. Vuoto = pagina creata prima del nuovo flusso.';
