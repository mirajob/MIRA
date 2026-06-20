import { getAIClient, AI_CONFIG } from "../provider";

interface StudentProfile {
  id: string;
  full_name?: string;
  degree_program?: string;
  degree_level?: string;
  current_year?: number;
  interests?: string[];
  goals?: string[];
  experiences?: string[];
  profile_summary?: string;
  onboarding_answers?: Record<string, string>;
}

interface MatchCriteria {
  association_name: string;
  association_description?: string;
  cycle_title?: string;
  evaluation_criteria?: Record<string, unknown>;
  available_roles?: Array<{ name: string }>;
}

interface CandidateMatch {
  student_id: string;
  fit_category: "strong_fit" | "good_fit" | "uncertain_fit" | "weak_fit";
  fit_summary: string;
  strengths: string[];
  gaps: string[];
  suggested_role?: string;
  confidence: "low" | "medium" | "high";
}

interface MatchResult {
  matches: CandidateMatch[];
  total_evaluated: number;
}

export async function matchCandidates(
  candidates: StudentProfile[],
  criteria: MatchCriteria
): Promise<MatchResult> {
  if (candidates.length === 0) {
    return { matches: [], total_evaluated: 0 };
  }

  const client = getAIClient();

  const candidatesText = candidates.map((c, i) => `
Candidato ${i + 1} (ID: ${c.id}):
- Corso: ${c.degree_program ?? "N/A"}, ${c.degree_level ?? ""}, anno ${c.current_year ?? "N/A"}
- Interessi: ${c.interests?.join(", ") ?? "N/A"}
- Obiettivi: ${c.goals?.join(", ") ?? "N/A"}
- Esperienze: ${c.experiences?.join(", ") ?? "N/A"}
- Profilo: ${c.profile_summary ?? "N/A"}
${c.onboarding_answers ? Object.entries(c.onboarding_answers).map(([k, v]) => `- ${k}: ${v}`).join("\n") : ""}
`).join("\n---\n");

  const prompt = `Sei MIRA. Confronta questi candidati con i criteri dell'associazione e ordina per compatibilità.

ASSOCIAZIONE: ${criteria.association_name}
${criteria.association_description ? `Descrizione: ${criteria.association_description}` : ""}
${criteria.cycle_title ? `Ciclo: ${criteria.cycle_title}` : ""}
${criteria.available_roles?.length ? `Ruoli disponibili: ${criteria.available_roles.map(r => r.name).join(", ")}` : ""}

CANDIDATI:
${candidatesText}

Rispondi SOLO in JSON:
{
  "matches": [
    {
      "student_id": "id del candidato",
      "fit_category": "strong_fit | good_fit | uncertain_fit | weak_fit",
      "fit_summary": "perché matcha o no, in 1-2 frasi",
      "strengths": ["punto forte 1"],
      "gaps": ["cosa manca"],
      "suggested_role": "ruolo suggerito se applicabile",
      "confidence": "low | medium | high"
    }
  ],
  "total_evaluated": numero
}

Regole:
- Non inventare fatti. Usa solo i dati forniti.
- Se mancano informazioni, confidenza = low.
- Non penalizzare studenti per mancanza di esperienza (sono entry-level).
- Ordina per fit (strong first).`;

  const response = await client.chat.completions.create({
    model: AI_CONFIG.defaultModel,
    messages: [{ role: "user", content: prompt }],
    max_tokens: AI_CONFIG.maxTokens.matching,
    temperature: 0.2,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("Empty AI response");

  return JSON.parse(content) as MatchResult;
}
