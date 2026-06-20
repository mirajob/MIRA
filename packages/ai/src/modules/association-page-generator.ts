import { getAIClient, AI_CONFIG } from "../provider";

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
  const client = getAIClient();

  const prompt = `Sei MIRA, una piattaforma universitaria. Genera una pagina pubblica per l'associazione "${input.associationName}".

${input.websiteText ? `Testo estratto dal sito web:\n${input.websiteText.slice(0, 6000)}` : ""}
${input.manualNotes ? `Note aggiuntive:\n${input.manualNotes}` : ""}

Rispondi SOLO in JSON valido con questa struttura:
{
  "short_description": "descrizione breve (max 200 caratteri)",
  "long_description": "descrizione completa dell'associazione",
  "suggested_category": "una tra: finance, consulting, entrepreneurship, tech, marketing, social_impact, politics, culture, sports, other",
  "suggested_sectors": ["settore1", "settore2"],
  "suggested_team_structure": [{"team_name": "nome", "description": "descrizione"}],
  "detected_links": [{"label": "etichetta", "url": "url"}],
  "uncertainties": ["cosa non sei sicuro"]
}

Non inventare informazioni non presenti nel testo. Segna le incertezze.`;

  const response = await client.chat.completions.create({
    model: AI_CONFIG.defaultModel,
    messages: [{ role: "user", content: prompt }],
    max_tokens: AI_CONFIG.maxTokens.scraping,
    temperature: 0.3,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("Empty AI response");

  return JSON.parse(content) as GeneratedPage;
}

export async function scrapeWebsiteText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: { "User-Agent": "MIRA Bot/1.0" },
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);

  const html = await response.text();

  const text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();

  return text.slice(0, 8000);
}
