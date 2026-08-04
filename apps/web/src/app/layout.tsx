import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";

/**
 * I font passano da un <link> a Google Fonts a next/font: vengono scaricati in fase di
 * build e serviti dal nostro dominio. Con il link il browser mostrava prima il font di
 * sistema e poi rifaceva il testo, con lo scatto visibile a ogni primo caricamento.
 * I nomi delle variabili sono quelli usati da globals.css.
 */
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-playfair",
  display: "swap",
});

/**
 * Anteprima dei link condivisi (WhatsApp, Instagram, Telegram, Google).
 *
 * Titolo e descrizione ripetono quello che c'è davvero scritto nella prima
 * schermata: quando non combaciano, Google scarta la descrizione e si costruisce
 * lui il riassunto pescando frasi a caso dalla pagina. Se cambia il testo
 * dell'hero, va cambiato anche qui.
 *
 * Sono in italiano, come la lingua che i crawler ricevono per default (vedi
 * `i18n/request.ts`): con la pagina in una lingua e la descrizione in un'altra,
 * Google usa la sua.
 *
 * L'immagine larga la genera `opengraph-image.tsx`, Next la collega da sé.
 */
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mirajob.cloud";
const SITE_TITLE = "MIRA · Non mandi CV, sono le aziende a scrivere a te";
const SITE_DESCRIPTION =
  "Rispondi a MIRA in chat, bastano cinque minuti, e nasce la tua MiraCard: il profilo con cui le associazioni del tuo campus e le aziende ti trovano.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: "%s · MIRA",
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: "MIRA",
    url: SITE_URL,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    locale: "it_IT",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  icons: {
    icon: [
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
  other: {
    "theme-color": "#0A1F33",
    "apple-mobile-web-app-title": "MIRA",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} className={`${inter.variable} ${playfair.variable}`}>
      <body className="antialiased">
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
