import type { FitCategory, Confidence } from "@mira/types";

export interface ApplicationEvaluatorInput {
  association: {
    name: string;
    category?: string;
    description?: string;
    sectors?: string[];
    teamStructure?: unknown;
  };
  applicationCycle: {
    title: string;
    description?: string;
    evaluationCriteria?: unknown;
    availableRoles?: unknown;
  };
  student: {
    degreeProgram?: string;
    degreeLevel?: string;
    currentYear?: number;
    onboardingSummary?: string;
    interests?: unknown;
    goals?: unknown;
    experiences?: unknown;
    transcriptSummary?: unknown;
  };
  answers: Array<{
    question: string;
    answer: string | unknown;
  }>;
  knowledgeContext?: Array<{
    title: string;
    content: string;
    source?: string;
  }>;
}

export interface ApplicationEvaluationOutput {
  overall_fit_category: FitCategory;
  internal_score: number;
  summary: string;
  strengths: Array<{ point: string; evidence: string }>;
  gaps: Array<{ point: string; evidence_or_reason: string }>;
  concerns: Array<{ point: string; severity: "low" | "medium" | "high"; evidence: string }>;
  evidence: Array<{
    source: "onboarding" | "transcript" | "application_answer" | "association_criteria" | "knowledge_base";
    detail: string;
  }>;
  recommended_next_step: "review" | "interview" | "waitlist" | "reject";
  suggested_interview_questions: string[];
  confidence: Confidence;
}
