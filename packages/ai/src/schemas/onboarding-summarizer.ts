export interface OnboardingSummarizerInput {
  onboardingAnswers: Record<string, string>;
  degreeProgram?: string;
  degreeLevel?: string;
  currentYear?: number;
  transcriptSummary?: string;
}

export interface OnboardingSummarizerOutput {
  profile_summary: string;
  interests: string[];
  career_goals: string[];
  experiences: Array<{
    title: string;
    description: string;
    evidence_level: "self_declared" | "document_supported" | "verified";
  }>;
  working_style_signals: string[];
  association_motivation_signals: string[];
  uncertainties: string[];
  suggested_follow_up_questions: string[];
}
