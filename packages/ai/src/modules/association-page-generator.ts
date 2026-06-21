import { chatCompletion } from "../provider";

interface GeneratedPage {
  short_description: string;
  long_description: string;
  suggested_category: string;
  suggested_sectors: string[];
  suggested_team_structure: Array<{ team_name: string; description: string }>;
  detected_links: Array<{ label: string; url: string }>;
  uncertainties: string[];
}

export async function generateAssociationPage(input: {
  associationName: string;
  websiteText?: string;
  manualNotes?: string;
}): Promise<GeneratedPage> {
  const content = await chatCompletion(
    [
      {
        role: "user",
        content: `Genera una pagina pubblica per l'associazione "${input.associationName}".

${input.websiteText ? `Testo dal sito:\n${input.websiteText.slice(0, 6000)}` : ""}
${input.manualNotes ? `Note:\n${input.manualNotes}` : ""}

Rispondi SOLO in JSON:
{
  "short_description": "max 200 caratteri",
  "long_description": "descrizione completa",
  "suggested_category": "finance|consulting|entrepreneurship|tech|marketing|social_impact|politics|culture|sports|other",
  "suggested_sectors": ["settore1"],
  "suggested_team_structure": [{"team_name": "nome", "description": "desc"}],
  "detected_links": [{"label": "label", "url": "url"}],
  "uncertainties": ["cosa non sei sicuro"]
}

Non inventare. Segna le incertezze.`,
      },
    ],
    { temperature: 0.3, maxTokens: 2048, jsonMode: true }
  );

  return JSON.parse(content) as GeneratedPage;
}

export async function scrapeWebsiteText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: { "User-Agent": "MIRA Bot/1.0" },
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);

  const html = await response.text();
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 8000);
}
