import type { Metadata } from "next";

/**
 * Vedi il gemello in `aziende/layout.tsx`: la pagina è client, titolo e descrizione
 * per Google stanno qui e ripetono quello che c'è scritto nella pagina.
 */
export const metadata: Metadata = {
  title: "Candida la tua associazione",
  description:
    "Porta la tua associazione universitaria su MIRA: gestisci i membri e, quando vuoi, le selezioni per prenderne di nuovi. Candidature, colloqui e team in un posto solo.",
};

export default function CandidatiLayout({ children }: { children: React.ReactNode }) {
  return children;
}
