import { chatCompletion } from "../provider";

// Mirrors the "prosa" subset of CardBlockType from @mira/types (packages/types/src/card-blocks.ts).
// Not imported directly to avoid adding a cross-package dependency for a single string union.
type ProseCardBlockType = "esperienze" | "competenze" | "autodescrizione" | "interessi" | "piano_carriera";

const BLOCK_INSTRUCTIONS: Record<ProseCardBlockType, string> = {
  esperienze:
    "Per ogni esperienza, estrai settori, strumenti e tipo di attività menzionati esplicitamente (es. \"consulting\", \"Excel\", \"ricerca di mercato\", \"stage\"). Solo fatti concreti, mai giudizi di carattere.",
  competenze:
    "Estrai le competenze come tag normalizzati stile mercato del lavoro (es. \"financial modelling\", \"public speaking\", \"python\"), una per frase presente nel testo.",
  autodescrizione:
    "Estrai temi e ambiti concreti menzionati (es. \"lavoro di squadra su progetti concreti\", \"analisi dati\"). Mai aggettivi di carattere o inferenze psicologiche (vietato: \"intraprendente\", \"resiliente\", ecc.).",
  interessi:
    "Estrai gli argomenti/settori di interesse come tag concreti (es. \"finanza sostenibile\", \"fotografia\", \"public policy\").",
  piano_carriera:
    "Estrai ruoli e settori target menzionati esplicitamente, se presenti (es. \"consulting\", \"data analyst\").",
};

/**
 * Extracts matching-facing facets from a card block's free-text prose_content.
 * Best-effort: callers must treat failures as non-fatal (structured_data stays stale).
 */
export async function syncCardBlockStructuredData(
  blockType: ProseCardBlockType,
  proseContent: unknown
): Promise<Record<string, unknown>> {
  const instruction = BLOCK_INSTRUCTIONS[blockType];

  const result = await chatCompletion(
    [
      {
        role: "system",
        content: `Sei un estrattore di dati per il matching su MIRA, una piattaforma per studenti universitari. ${instruction}

Regole:
- Descrivi solo fatti e temi concreti, mai tratti di carattere o inferenze psicologiche.
- Non inventare: se il testo non contiene abbastanza informazioni, restituisci un array vuoto.
- Rispondi SOLO in JSON valido: {"facets": ["tag1", "tag2"]}`,
      },
      { role: "user", content: JSON.stringify(proseContent) },
    ],
    { temperature: 0.1, maxTokens: 512, jsonMode: true }
  );

  const parsed = JSON.parse(result);
  const facets = Array.isArray(parsed?.facets) ? parsed.facets.filter((f: unknown) => typeof f === "string") : [];
  return { facets };
}
