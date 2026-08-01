/**
 * Fuso orario di riferimento del prodotto.
 *
 * Serve perché il rendering delle date avviene sul server, e in produzione il server
 * sta su UTC: senza dichiararlo, un'iscrizione delle 17:55 italiane compariva come
 * 15:55. Studenti, associazioni e aziende sono in Italia, quindi il fuso corretto è
 * uno solo e va imposto ovunque si formatti una data.
 *
 * Da usare in ogni toLocaleDateString / toLocaleString dell'app.
 */
export const APP_TIME_ZONE = "Europe/Rome";
