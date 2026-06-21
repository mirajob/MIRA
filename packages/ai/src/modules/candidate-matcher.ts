import { chatCompletion } from "../provider";

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
  available_roles?: Array<{ name: string }>;
}

interface MatchResult {
  matches: Array<{
    student_id: string;
    fit_category: string;
    fit_summary: string;
    strengths: string[];
    gaps: string[];
    suggested_role?: string;
    confidence: string;
  }>;
  total_evaluated: number;
}

export async function matchCandidates(
  candidates: StudentProfile[],
  criteria: MatchCriteria
): Promise<MatchResult> {
  if (candidates.length === 0) return { matches: [], total_evaluated: 0 };

  const candidatesText = candidates
    .map(
      (c, i) =>
        `Candidato ${i + 1} (ID: ${c.id}): Corso: ${c.degree_program ?? "N/A"}, anno ${c.current_year ?? "N/A"}. Interessi: ${c.interests?.join(", ") ?? "N/A"}. Obiettivi: ${c.goals?.join(", ") ?? "N/A"}. Profilo: ${c.profile_summary ?? "N/A"}`
    )
    .join("\n");

  const content = await chatCompletion(
    [
      {
        role: "user",
        content: `Confronta questi candidati con ${criteria.association_name}. ${criteria.association_description ?? ""} Ruoli: ${criteria.available_roles?.map((r) => r.name).join(", ") ?? "N/A"}.

${candidatesText}

JSON: {"matches": [{"student_id":"id","fit_category":"strong_fit|good_fit|uncertain_fit|weak_fit","fit_summary":"perché","strengths":[""],"gaps":[""],"suggested_role":"","confidence":"low|medium|high"}],"total_evaluated":N}`,
      },
    ],
    { temperature: 0.2, maxTokens: 2048, jsonMode: true }
  );

  return JSON.parse(content) as MatchResult;
}
