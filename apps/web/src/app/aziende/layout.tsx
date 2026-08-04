import type { Metadata } from "next";

/**
 * La pagina è un componente client (ha il modulo di registrazione), quindi il titolo
 * e la descrizione per Google e per le anteprime stanno qui. Devono dire quello che
 * la pagina dice davvero: senza, Google si costruisce il riassunto da solo pescando
 * frasi dalla pagina, e resta indietro di mesi.
 */
export const metadata: Metadata = {
  title: "Aziende",
  description:
    "Descrivi chi cerchi e MIRA ti mostra gli studenti che corrispondono, con la disponibilità che hanno già dichiarato. Niente annunci da pubblicare, niente CV da scremare.",
};

export default function AziendeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
