import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";

/**
 * Immagine che si vede quando qualcuno incolla mirajob.cloud su WhatsApp, Instagram
 * o Telegram. Prima non c'era: l'anteprima ripescava l'icona quadrata dell'app e
 * sembrava un link qualsiasi.
 *
 * Il marchio è l'SVG del brand (tracciati, non font: viene identico). Il testo prova
 * a usare Playfair e Inter presi da Google Fonts in fase di build; se la rete non
 * risponde si ripiega sul font di default, così una build non fallisce mai per questo.
 */

export const alt = "MIRA, il profilo con cui le associazioni e le aziende ti trovano";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const HEADING = "Non mandi CV.\nSono le aziende a scrivere a te.";
const SUBHEAD = "Rispondi a MIRA in chat e nasce la tua MiraCard.";
const DOMAIN = "mirajob.cloud";

/** Scarica un font da Google Fonts limitato ai caratteri usati. `null` se non ci riesce. */
async function loadFont(family: string, weight: number, text: string): Promise<ArrayBuffer | null> {
  try {
    const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}&text=${encodeURIComponent(text)}`;
    // Niente User-Agent di proposito: a un browser moderno Google risponde in woff2,
    // che satori non sa leggere. Senza header restituisce truetype.
    const css = await fetch(url).then((r) => r.text());

    const src = /src:\s*url\(([^)]+)\)\s*format\('(?:truetype|opentype|woff)'\)/.exec(css)?.[1];
    if (!src) return null;

    const font = await fetch(src);
    if (!font.ok) return null;
    return await font.arrayBuffer();
  } catch {
    return null;
  }
}

function lockupDataUri(): string {
  const svg = readFileSync(join(process.cwd(), "public/brand/mira-lockup-knockout.svg"), "utf8");
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

export default async function OpengraphImage() {
  const [playfair, inter] = await Promise.all([
    loadFont("Playfair Display", 500, HEADING),
    loadFont("Inter", 400, `${SUBHEAD}${DOMAIN}`),
  ]);

  // Se uno dei due non arriva si usa l'altro per tutto. Se non arriva nessuno restiamo
  // senza font: satori non saprebbe disegnare testo, quindi resta il solo marchio.
  const fonts = [
    playfair ? { name: "Playfair Display", data: playfair, weight: 500 as const, style: "normal" as const } : null,
    inter ? { name: "Inter", data: inter, weight: 400 as const, style: "normal" as const } : null,
  ].filter((f): f is NonNullable<typeof f> => f !== null);

  const displayFamily = playfair ? "Playfair Display" : "Inter";
  const sansFamily = inter ? "Inter" : "Playfair Display";

  if (fonts.length === 0) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#0A1F33",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lockupDataUri()} alt="MIRA" width={408} height={140} />
        </div>
      ),
      size,
    );
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#0A1F33",
          padding: "72px 80px",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={lockupDataUri()} alt="MIRA" width={204} height={70} />

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontFamily: displayFamily,
              fontSize: 62,
              lineHeight: 1.15,
              color: "#FFFFFF",
              letterSpacing: "-0.01em",
            }}
          >
            {HEADING.split("\n").map((line) => (
              <span key={line}>{line}</span>
            ))}
          </div>
          <div
            style={{
              marginTop: 24,
              fontFamily: sansFamily,
              fontSize: 27,
              color: "#B0D0D6",
            }}
          >
            {SUBHEAD}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontFamily: sansFamily,
            fontSize: 22,
            color: "#94A3B5",
          }}
        >
          <div style={{ width: 40, height: 2, backgroundColor: "#0E5A6F" }} />
          {DOMAIN}
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
