-- Rollout: la dashboard a card + onboarding guidato diventa lo standard per tutte le
-- associazioni, non piu' solo quelle degli account beta.
--
-- NON si perde nessun contenuto: il costruttore a card legge gli stessi campi di prima, e le
-- pagine gia' pubblicate risultano "complete" (vedi effectivePageBuildState) — si aprono come
-- card gia' compilata, modificabile. Le associazioni esistenti NON vengono buttate in un
-- onboarding: hanno onboarding_state vuoto, quindi vanno dritte alle sezioni. Solo le NUOVE
-- associazioni (default acceso qui sotto) partono dal percorso guidato.
--
-- La valutazione AI resta visibile a tutti come oggi: questo rollout e' solo la UI, il gating
-- Base/Pro e' un lavoro separato e futuro.

-- Associazioni esistenti: accendi la dashboard a card e la gestione membri sempre attiva.
update association_profiles set beta_dashboard = true where not beta_dashboard;
update association_profiles set membership_enabled = true where not membership_enabled;

-- Nuove associazioni: nascono gia' con la dashboard a card. Il trigger esistente
-- (set_beta_dashboard_on_association) vede beta_dashboard = true e inizializza da solo
-- onboarding_state e membership_enabled.
alter table association_profiles alter column beta_dashboard set default true;
