/**
 * Costanti delle pagine associazione seminate da MIRA.
 *
 * Non è un file "use server": è importato sia da componenti server sia da pagine,
 * e i file con "use server" possono esportare solo funzioni async.
 */

/**
 * Recapito mostrato sulle pagine seminate, sia a chi vuole rivendicare la pagina
 * della propria associazione sia a chi ne chiede la rimozione. Deve restare un
 * indirizzo presidiato: una richiesta di rimozione va evasa entro 24 ore.
 */
export const SEEDED_CONTACT_EMAIL = "dev@mirajob.cloud";
