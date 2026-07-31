-- Migration: collegamento tra una pagina appena creata e la sua possibile gemella.
--
-- Da quando MIRA semina le pagine delle associazioni note di un ateneo, chi si registra
-- dalla landing può creare una seconda pagina della STESSA associazione senza saperlo.
-- Il confronto sul nome (packages/domain/src/association-matching.ts) è volutamente
-- prudente: se è quasi certo, il form propone di prendere in gestione la pagina che
-- esiste già e non crea niente; se è solo somigliante, la pagina si crea comunque e qui
-- resta il riferimento, così in admin la riga arriva con l'avviso e il pulsante Unisci.
--
-- on delete set null: unendo o cancellando la pagina puntata, la riga che punta resta.

alter table association_profiles
  add column if not exists possible_duplicate_of uuid references association_profiles(id) on delete set null;

create index if not exists association_profiles_possible_duplicate_idx
  on association_profiles(possible_duplicate_of)
  where possible_duplicate_of is not null;

comment on column association_profiles.possible_duplicate_of is
  'Pagina già esistente che potrebbe essere la stessa associazione: la decide l''admin con Unisci.';
