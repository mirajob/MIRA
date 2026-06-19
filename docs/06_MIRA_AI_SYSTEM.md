# MIRA AI System Specification

**Version:** 1.0  
**Date:** 2026-06-15  
**Status:** AI architecture, prompts and structured outputs blueprint  

---

## 0. Purpose

This document defines how AI should work inside MIRA.

MIRA is AI-first, but AI must be structured, logged, privacy-aware and safe. AI must not be a collection of uncontrolled prompts inside UI components.

All AI features must go through a dedicated AI service layer with typed inputs, structured outputs, schemas, logging, privacy rules and fallback behavior.

---

## 1. AI Architecture Principles

### 1.1 Provider Abstraction

MIRA must not be hardcoded to one AI provider.

The codebase should expose product-level functions such as:

- `evaluateApplication()`;
- `parseTranscript()`;
- `summarizeStudentProfile()`;
- `generateAssociationPageDraft()`;
- `analyzeAssociationProject()`;
- `matchCandidatesForCompany()`;
- `assistAnonymousChat()`;
- `generateSimulationFeedback()`;
- `generateOrientationAdvice()`.

Internally, these functions may call OpenAI, Anthropic or future providers.

### 1.2 No AI Calls from UI Components

UI components must never call provider APIs directly.

Use server-side code:

- Next.js server actions/API routes;
- Supabase Edge Functions where useful;
- backend jobs/queues later.

### 1.3 Structured Outputs

Production AI modules must return structured JSON validated by schemas.

Do not rely on free-form text when the output drives product state.

### 1.4 Evidence, Inference, Uncertainty

AI must separate:

- evidence: facts found in inputs;
- inference: reasonable interpretation;
- uncertainty: where evidence is incomplete;
- recommendation: suggested next step.

### 1.5 Human Final Decision

AI never accepts, rejects, hires, ranks for final outcome or decides a student's career.

AI supports humans.

### 1.6 Privacy by Design

AI inputs should include only data needed for the task.

Sensitive raw files should be avoided when extracted summaries are sufficient.

AI logs should minimize sensitive raw content.

---

## 2. Recommended Code Structure

```text
packages/ai/
  providers/
    provider.types.ts
    openai.provider.ts
    anthropic.provider.ts
    index.ts

  modules/
    applicationEvaluator.ts
    transcriptParser.ts
    studentOnboardingSummarizer.ts
    profileSummarizer.ts
    associationPageGenerator.ts
    projectAnalyzer.ts
    companyMatcher.ts
    anonymousChatAssistant.ts
    simulationFeedback.ts
    orientationAdvisor.ts
    knowledgeBaseQA.ts

  schemas/
    applicationEvaluation.schema.ts
    transcriptExtraction.schema.ts
    onboardingSummary.schema.ts
    associationPageDraft.schema.ts
    projectAnalysis.schema.ts
    companyMatch.schema.ts
    simulationFeedback.schema.ts
    orientationAdvice.schema.ts

  prompts/
    applicationEvaluator.prompt.ts
    transcriptParser.prompt.ts
    onboardingSummarizer.prompt.ts
    associationPageGenerator.prompt.ts
    projectAnalyzer.prompt.ts
    companyMatcher.prompt.ts
    simulationFeedback.prompt.ts
    orientationAdvisor.prompt.ts
```

---

## 3. Global System Rules for MIRA AI

Use these rules in every module where relevant.

```text
You are an AI assistant inside MIRA, an AI-first university talent platform.
Your role is to structure evidence, summarize information, support human decisions and explain uncertainty.
You must not invent facts.
You must separate evidence from inference.
You must state uncertainty when input data is incomplete.
You must not make final admission, rejection, hiring or career decisions.
You must not discriminate based on protected or irrelevant personal characteristics.
You must avoid over-penalizing lack of experience in entry-level students.
You must use the provided data only.
When returning structured output, you must follow the requested JSON schema exactly.
```

---

## 4. AI Module: Application Evaluator

### Purpose

Evaluate a student's application to a university association and help the board review the candidate.

### First Build Priority

Required for Associations First Build.

### Inputs

```ts
type ApplicationEvaluatorInput = {
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
};
```

### Output Schema

```json
{
  "overall_fit_category": "strong_fit | good_fit | uncertain_fit | weak_fit",
  "internal_score": 0,
  "summary": "string",
  "strengths": [
    {
      "point": "string",
      "evidence": "string"
    }
  ],
  "gaps": [
    {
      "point": "string",
      "evidence_or_reason": "string"
    }
  ],
  "concerns": [
    {
      "point": "string",
      "severity": "low | medium | high",
      "evidence": "string"
    }
  ],
  "evidence": [
    {
      "source": "onboarding | transcript | application_answer | association_criteria | knowledge_base",
      "detail": "string"
    }
  ],
  "recommended_next_step": "review | interview | waitlist | reject",
  "suggested_interview_questions": ["string"],
  "confidence": "low | medium | high"
}
```

### Prompt Template

```text
Evaluate this student application for the association board.

You are not making the decision. You are helping human reviewers understand the candidate.

Assess:
- motivation;
- consistency with association goals;
- relevant experience;
- academic context;
- potential;
- commitment;
- communication clarity;
- gaps and uncertainties.

Do not invent facts.
Do not over-penalize a student for limited experience.
Use only the provided data.
Separate evidence from inference.
Return JSON only following the schema.
```

### Rules

- AI result can be shown only to users with `view_candidate_ai_evaluation` permission.
- AI cannot change application status.
- If confidence is low, recommend human review rather than rejection.
- Use categories in UI; internal score can be kept less prominent.

### Failure Behavior

- Store failed AI log.
- Application remains reviewable manually.
- Authorized user can retry.

---

## 5. AI Module: Transcript Parser

### Purpose

Extract academic data from student transcript/libretto.

### First Build Priority

Required in basic form for Associations First Build.

### Inputs

- PDF or image/text extraction from transcript;
- student declared university;
- student declared degree program;
- optional known university transcript format.

### Output Schema

```json
{
  "student_name_detected": "string | null",
  "university_detected": "string | null",
  "degree_program_detected": "string | null",
  "courses": [
    {
      "course_name": "string",
      "course_code": "string | null",
      "credits": 0,
      "grade": "string | null",
      "grade_numeric": 0,
      "academic_year": "string | null",
      "semester": "string | null",
      "confidence": "low | medium | high"
    }
  ],
  "weighted_average": 0,
  "total_credits": 0,
  "warnings": ["string"],
  "overall_confidence": "low | medium | high"
}
```

### Prompt Rules

```text
Extract structured academic information from the transcript text.
Do not guess missing grades or credits.
If a value is unclear, set it to null and add a warning.
Return JSON only.
```

### Privacy Rules

- Associations see transcript summary by default.
- Raw transcript file visibility requires explicit consent and permissions.
- AI logs should not store full transcript text unless protected and necessary.

---

## 6. AI Module: Student Onboarding Summarizer

### Purpose

Turn student onboarding answers into an initial profile summary.

### First Build Priority

Required in basic form for Associations First Build.

### Inputs

- onboarding Q&A;
- academic basics;
- transcript summary if available;
- student interests/goals/experiences.

### Output Schema

```json
{
  "profile_summary": "string",
  "interests": ["string"],
  "career_goals": ["string"],
  "experiences": [
    {
      "title": "string",
      "description": "string",
      "evidence_level": "self_declared | document_supported | verified"
    }
  ],
  "working_style_signals": ["string"],
  "association_motivation_signals": ["string"],
  "uncertainties": ["string"],
  "suggested_follow_up_questions": ["string"]
}
```

### Prompt Rules

```text
Summarize the student as a person and early talent profile.
Do not use exaggerated language.
Do not claim verified skills unless there is evidence.
Distinguish self-declared interests from demonstrated evidence.
Return JSON only.
```

---

## 7. AI Module: Association Page Generator

### Purpose

Help presidents create public association pages from website, pasted text or uploaded documents.

### First Build Priority

Recommended for Associations First Build.

### Inputs

- association name;
- website text or URL extraction;
- manual president notes;
- uploaded association documents;
- category options.

### Output Schema

```json
{
  "suggested_short_description": "string",
  "suggested_long_description": "string",
  "suggested_category": "string",
  "suggested_sectors": ["string"],
  "suggested_team_structure": [
    {
      "team_name": "string",
      "description": "string"
    }
  ],
  "detected_links": [
    {
      "label": "string",
      "url": "string"
    }
  ],
  "uncertainties": ["string"],
  "fields_requiring_human_confirmation": ["string"]
}
```

### Rules

- AI drafts only.
- President or MIRA admin must approve before publishing.
- Do not invent projects, team members or alumni destinations.

---

## 8. AI Module: Knowledge Base QA Admin

### Purpose

Allow MIRA admin to query uploaded knowledge documents for operational support and product building.

### Inputs

- admin question;
- retrieved chunks;
- document metadata;
- scope.

### Output Schema

```json
{
  "answer": "string",
  "sources": [
    {
      "document_id": "string",
      "title": "string",
      "chunk_index": 0
    }
  ],
  "uncertainty": "low | medium | high",
  "missing_information": ["string"]
}
```

### Rules

- Cite internal source references in admin UI.
- Do not expose admin-only documents to non-admin modules.

---

## 9. AI Module: Project Analyzer

### Purpose

Analyze association projects/reports and create student profile evidence.

### Future Module

Implement after Associations First Build.

### Inputs

- project/report document;
- association profile;
- declared contributors;
- detected names if available;
- president confirmations.

### Output Schema

```json
{
  "project_title": "string",
  "project_summary": "string",
  "analysis_types": ["string"],
  "technical_skills_detected": [
    {
      "skill": "string",
      "evidence": "string",
      "confidence": "low | medium | high"
    }
  ],
  "sophistication_level": "basic | intermediate | advanced",
  "possible_contributors": [
    {
      "name_detected": "string",
      "possible_role": "string",
      "evidence": "string",
      "confidence": "low | medium | high"
    }
  ],
  "profile_evidence_suggestions": [
    {
      "title": "string",
      "description": "string",
      "skills": ["string"],
      "requires_human_confirmation": true
    }
  ]
}
```

### Rules

- AI may suggest contributors.
- Association admin must confirm contributors before profile update.
- Do not update external profile visibility automatically without rules/consent.

---

## 10. AI Module: Company Matcher

### Purpose

Match verified company recruiting queries with anonymous student profiles.

### Future Module

Implement in Company phase.

### Inputs

- company profile;
- recruiter natural language query;
- structured filters;
- eligible anonymous student profiles;
- profile evidence;
- visibility settings.

### Output Schema

```json
{
  "structured_query": {
    "target_roles": ["string"],
    "skills_required": ["string"],
    "skills_preferred": ["string"],
    "academic_filters": {},
    "attitude_signals": ["string"],
    "location_or_availability": {}
  },
  "matches": [
    {
      "student_profile_id": "string",
      "anonymous_candidate_code": "string",
      "match_score": 0,
      "match_category": "strong | good | possible | weak",
      "fit_explanation": "string",
      "evidence": [
        {
          "type": "simulation | project | transcript | association | onboarding",
          "detail": "string"
        }
      ],
      "uncertainties": ["string"],
      "suggested_outreach_angle": "string"
    }
  ]
}
```

### Privacy Rules

- Do not return student name, email, photo or identifying details.
- Use only fields allowed for anonymous company profile.
- Student identity reveal requires explicit student consent.

---

## 11. AI Module: Anonymous Chat Assistant

### Purpose

Support safety and context in anonymous company-student chats.

### Future Module

Optional. The chat can work without AI assistance at first.

### Uses

- summarize company opportunity for student;
- help student understand why they were matched;
- generate recruiter outreach draft;
- detect possible policy issues;
- summarize conversation before identity reveal.

### Rules

- Do not reveal student identity.
- Do not pressure student to reveal identity.
- Student sees company identity.
- Company remains unable to see identity until explicit reveal.

---

## 12. AI Module: Simulation Feedback

### Purpose

Evaluate student simulation deliverables and generate feedback.

### Future Module

Implement in Simulation phase.

### Inputs

- simulation task brief;
- materials;
- student deliverable;
- rubric;
- allowed AI assistance log if tracked.

### Output Schema

```json
{
  "overall_score": 0,
  "rubric_scores": [
    {
      "criterion": "string",
      "score": 0,
      "max_score": 0,
      "feedback": "string",
      "evidence": "string"
    }
  ],
  "strengths": ["string"],
  "improvements": ["string"],
  "profile_evidence": {
    "should_update_profile": true,
    "evidence_title": "string",
    "skills_demonstrated": ["string"],
    "visibility_default": "private_to_student | company_anonymous"
  },
  "integrity_flags": [
    {
      "flag": "string",
      "severity": "low | medium | high",
      "reason": "string"
    }
  ]
}
```

### Anti-Cheating Rules

- AI support during task can explain context, not produce full deliverable.
- The evaluator should flag suspicious mismatch between task and output if detectable.
- Do not rely only on AI for integrity decisions.

---

## 13. AI Module: Orientation Advisor

### Purpose

Provide surgical career and academic guidance.

### Future Module

Implement after knowledge base, profile evidence and course mapping are stable.

### Inputs

- student profile;
- transcript courses;
- student goals;
- micro-sector target;
- skill taxonomy;
- course database;
- simulation paths;
- knowledge chunks.

### Output Schema

```json
{
  "target_micro_sector": "string",
  "current_strengths": [
    {
      "skill": "string",
      "evidence": "string"
    }
  ],
  "missing_skills": [
    {
      "skill": "string",
      "importance": "low | medium | high",
      "reason": "string"
    }
  ],
  "recommended_courses": [
    {
      "course_name": "string",
      "university": "string",
      "why_relevant": "string",
      "source": "string"
    }
  ],
  "recommended_simulations": [
    {
      "simulation_name": "string",
      "why_relevant": "string"
    }
  ],
  "recommended_association_actions": ["string"],
  "next_steps": ["string"],
  "confidence": "low | medium | high",
  "missing_information": ["string"]
}
```

### Rules

- Do not provide generic career advice when specific evidence exists.
- Always show sources for course/syllabus recommendations.
- Do not pretend to know a course content if not in knowledge base.

---

## 14. RAG and Knowledge Retrieval

### Document Scopes

AI modules can retrieve only documents within allowed scopes:

- `global_mira`;
- `association_specific`;
- `university_specific`;
- `company_specific`;
- `application_cycle_specific`;
- `admin_only`;
- `ai_internal_only`.

### Retrieval Rules

Before generation:

1. Identify module.
2. Identify user/context.
3. Determine allowed scopes.
4. Retrieve top relevant chunks.
5. Pass chunk summaries and source metadata to prompt.
6. Save source IDs in AI output/log when useful.

### Do Not

- retrieve admin-only documents for association users;
- retrieve company-specific documents for other companies;
- retrieve private student content unless task requires it and permissions allow it.

---

## 15. AI Logging

Every production AI call should create an `ai_logs` entry.

Log:

- module;
- provider;
- model;
- prompt version;
- entity type/id;
- user context;
- input metadata;
- output summary;
- status;
- error message;
- token usage if available;
- cost estimate if available.

Avoid logging sensitive raw content directly.

If raw input/output is necessary for debugging, store it as protected file with restricted admin access and retention policy.

---

## 16. Prompt Versioning

Every prompt must have a version.

Example:

```text
application_evaluator_v1
transcript_parser_v1
onboarding_summarizer_v1
```

When prompt changes materially:

- increment version;
- keep old logs tied to old version;
- avoid comparing scores across versions without caution.

---

## 17. Model Selection Strategy

Keep model choice configurable by module.

Example config:

```ts
const AI_MODULE_CONFIG = {
  applicationEvaluator: {
    provider: 'openai',
    model: 'selected-model-name',
    promptVersion: 'application_evaluator_v1'
  },
  transcriptParser: {
    provider: 'openai',
    model: 'selected-model-name',
    promptVersion: 'transcript_parser_v1'
  }
};
```

Do not hardcode model names in UI.

---

## 18. AI Failure and Fallback Policy

### Application Evaluation Fails

- Do not block submission.
- Show pending/failed state to authorized board users.
- Allow retry.

### Transcript Parsing Fails

- Keep file uploaded.
- Let student continue if product allows.
- Show warning.
- Allow manual correction/support.

### Association Page Draft Fails

- Let president fill page manually.

### Company Matching Fails

- Do not expose broken or partial candidate list.
- Ask recruiter to retry or refine query.

### Orientation Advisor Lacks Data

- Say what is missing.
- Do not invent course recommendations.

---

## 19. Safety and Fairness Rules

AI must not:

- make final admission or hiring decisions;
- infer protected characteristics;
- penalize students for irrelevant personal traits;
- fabricate evidence;
- expose hidden/private data;
- reveal anonymous candidate identity;
- generate discriminatory recommendations;
- use raw transcript beyond necessary processing.

AI should:

- focus on evidence;
- show uncertainty;
- support human judgment;
- explain reasoning in user-safe language;
- maintain student trust.

---

## 20. Build Rules for Claude Code

1. Build the AI provider abstraction before adding module calls.
2. Define schemas before prompts.
3. Validate every structured AI response.
4. Log AI calls.
5. Add fallback UI for AI failures.
6. Do not put prompts inside React components.
7. Do not expose provider API keys to the client.
8. Do not store sensitive raw AI logs casually.
9. Implement only AI modules needed by the current phase.
10. Keep prompts versioned and testable.
