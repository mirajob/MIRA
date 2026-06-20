# MIRA Simulations Module Specification

**Version:** 1.0  
**Date:** 2026-06-15  
**Status:** Future module specification for micro-exercises and deep simulations  
**Primary clients:** Web and mobile, with deep simulations desktop-only  

---

## 0. Purpose

This document defines the MIRA Simulations Module.

Simulations are one of the main sources of verified evidence in the MIRA student profile. They allow students to demonstrate practical ability through work-like tasks instead of self-declared CV claims.

This module is not part of the first Associations Build, but the platform architecture must support it.

---

## 1. Product Role

MIRA simulations serve four purposes:

1. help students learn by doing;
2. help MIRA understand student skills through behavior and outputs;
3. generate verified profile evidence;
4. help companies and associations evaluate students based on real work signals.

Simulations are not generic courses.

They are structured, task-based, AI-assisted work experiences.

---

## 2. Simulation System Overview

MIRA uses a dual-layer simulation system:

```text
Layer 1: Micro-exercises
  Short, mobile-friendly exercises.
  Build habits, calibrate skill level, unlock deeper tasks.

Layer 2: Deep simulations
  Desktop-only realistic work cases.
  Require deliverables and generate external profile evidence.
```

---

## 3. Core Principles

### 3.1 Work Evidence, Not Course Completion

The profile should not say:

```text
Completed finance course.
```

It should say:

```text
Built a DCF model for a simulated M&A case and received structured feedback on assumptions, valuation logic and sensitivity analysis.
```

### 3.2 Micro-Exercises Calibrate, Deep Simulations Validate

Micro-exercises:

- calibrate level;
- build habit;
- unlock branches;
- provide internal progress.

Deep simulations:

- produce deliverables;
- receive richer scoring;
- update external profile evidence;
- are visible to companies if the student allows.

### 3.3 Deep Simulations Are Desktop-Only

Deep simulations require real work conditions.

If a student attempts to start a deep simulation on mobile, MIRA should block the start and explain:

```text
This simulation requires a computer. You will download files, work on deliverables and submit real outputs. Please reopen it from desktop.
```

### 3.4 AI Helps Like a Senior Colleague, Not Like a Cheating Tool

During simulations, AI can:

- clarify instructions;
- explain context;
- answer conceptual questions;
- give hints;
- explain how to approach a task;
- identify common mistakes.

AI must not:

- produce the full deliverable;
- write the full memo;
- fill the financial model;
- solve the case directly;
- give final answer files;
- bypass the learning objective.

---

## 4. Simulation Taxonomy

### 4.1 Macro Paths

Initial paths:

```text
Investment Banking
Private Equity
Strategy Consulting
Marketing
Product Management
Data Analytics
Corporate Finance
Asset Management
```

### 4.2 Branches

Example branches:

```text
Investment Banking
  M&A
  Capital Markets
  Leveraged Finance
  Restructuring

Private Equity
  Buyout
  Growth Equity
  Venture Capital
  Private Debt

Strategy Consulting
  Corporate Strategy
  Operations
  Digital Transformation
  Public Sector

Marketing
  Brand
  Digital
  Growth
  CRM

Product Management
  B2B SaaS
  B2C Product
  Platform
  Data Product

Data Analytics
  Business Intelligence
  Data Science Basics
  SQL Analytics
  Dashboarding
```

### 4.3 Skill Tags

Examples:

```text
financial_statement_analysis
valuation
multiples
DCF
LBO
market_sizing
MECE_structuring
SQL_basics
funnel_analysis
user_story_writing
prioritization
TAM_SAM_SOM
sensitivity_analysis
memo_writing
slide_synthesis
```

---

## 5. Micro-Exercises

### 5.1 Purpose

Micro-exercises are short tasks designed for mobile and desktop.

They should take 2 to 5 minutes.

### 5.2 Supported Formats

```text
multiple_choice
short_numeric_answer
guided_calculation
rank_options
interpret_chart
identify_error
mini_case_reasoning
flashcard
fill_blank
scenario_decision
```

### 5.3 Micro-Exercise Structure

```json
{
  "id": "micro_001",
  "path": "investment_banking",
  "branch": "m_a",
  "skill": "valuation_multiples",
  "difficulty": 2,
  "prompt": "A company trades at 8x EBITDA...",
  "answer_type": "multiple_choice",
  "options": [],
  "correct_answer": "...",
  "explanation": "...",
  "feedback_rules": [],
  "estimated_minutes": 3
}
```

### 5.4 Scoring

Micro-exercise scoring should consider:

- correctness;
- response time optional;
- explanation quality where relevant;
- repeated attempts;
- difficulty;
- skill mastery curve.

Micro scores are internal by default.

### 5.5 Profile Impact

Micro-exercises do not directly update the external company-visible profile.

They can update:

- internal skill estimates;
- branch progress;
- recommended deep simulations;
- learning streaks;
- readiness indicators.

---

## 6. Deep Simulations

### 6.1 Purpose

Deep simulations validate practical ability through realistic deliverables.

They should feel like receiving an assignment from a manager or senior colleague.

### 6.2 Deep Simulation Structure

Each deep simulation includes:

```text
A. Brief
B. Context materials
C. Task instructions
D. Deliverable requirements
E. AI support rules
F. Submission upload
G. Evaluation rubric
H. Feedback report
I. Profile evidence output
```

### 6.3 Supported Deliverables

```text
Excel model
Google Sheets model
PowerPoint / slide deck
PDF memo
Word / written memo
CSV or dataset analysis
SQL query output
dashboard screenshot
structured text answer
zip file with multiple deliverables
```

### 6.4 Deep Simulation Statuses

```text
locked
available
started
in_progress
submitted
under_review
feedback_ready
completed
failed_quality_check
archived
```

### 6.5 Unlock Rules

A deep simulation can be unlocked by:

- completing required micro-exercises;
- reaching skill mastery threshold;
- being assigned by MIRA;
- being assigned by a company future;
- being manually unlocked by admin.

---

## 7. Example Simulation 1: Investment Banking M&A Level 1

### 7.1 Overview

```text
Path: Investment Banking
Branch: M&A
Level: 1
Title: Valuation Brief for a Consumer Goods Acquisition
Estimated time: 2-4 hours
Device: Desktop only
```

### 7.2 Brief

The student receives a manager-style email:

```text
We are preparing for an internal discussion on the potential acquisition of Aurora Foods, a fictional packaged foods company. Please prepare a short valuation view using comparable companies and a basic DCF sanity check.
```

### 7.3 Materials

- fictional company description PDF;
- historical financials XLSX;
- comparable companies table CSV;
- market notes PDF;
- deliverable template PPTX.

### 7.4 Required Deliverables

- one Excel model with valuation tabs;
- three-slide mini deck;
- short memo explaining assumptions.

### 7.5 Skills Evaluated

```text
financial_statement_interpretation
valuation_multiples
DCF_basics
assumption_quality
slide_synthesis
written_reasoning
```

### 7.6 Rubric

```text
Financial logic: 30%
Model structure: 20%
Assumption quality: 20%
Communication clarity: 15%
Professional formatting: 10%
Reflection and limitations: 5%
```

### 7.7 Profile Evidence Output

If completed with sufficient quality:

```text
Completed Investment Banking M&A Level 1 simulation. Built comparable company analysis and basic DCF sanity check for a fictional acquisition case. Demonstrated early valuation reasoning, model organization and slide synthesis.
```

---

## 8. Example Simulation 2: Strategy Consulting Market Entry

### 8.1 Overview

```text
Path: Strategy Consulting
Branch: Corporate Strategy
Level: 1
Title: Market Entry Assessment for a Fitness App
Estimated time: 2-3 hours
Device: Desktop only
```

### 8.2 Deliverables

- market sizing calculation;
- structured issue tree;
- recommendation memo;
- optional slide summary.

### 8.3 Skills Evaluated

```text
problem_structuring
market_sizing
assumption_transparency
recommendation_logic
communication
```

---

## 9. AI Tutor During Simulations

### 9.1 Allowed Behavior

AI tutor can respond to:

- "What does EBITDA mean?"
- "How should I think about choosing comparables?"
- "What is a sensitivity analysis?"
- "Can you explain the task again?"
- "What are common mistakes in this type of model?"

### 9.2 Disallowed Behavior

AI tutor must refuse or redirect:

- "Build the DCF for me."
- "Write the memo."
- "Fill the spreadsheet."
- "Give me the final answer."
- "Generate the full deck."

### 9.3 Response Pattern

When refusing direct solution generation, AI should say:

```text
I cannot complete the deliverable for you, but I can help you understand the approach. Here is how to think about the next step...
```

### 9.4 Logging

AI tutor interactions during simulations should be logged for:

- safety;
- quality;
- evidence interpretation;
- abuse detection;
- future feedback.

They should not automatically be shown to companies.

---

## 10. Submission and Evaluation

### 10.1 Submission Flow

1. Student starts simulation from desktop.
2. Student downloads materials.
3. Student works offline or in browser.
4. Student can ask AI contextual questions.
5. Student uploads deliverables.
6. MIRA validates file type and completeness.
7. AI evaluation starts.
8. Student receives feedback.
9. Profile evidence is generated if quality threshold is met.

### 10.2 Evaluation Inputs

- simulation brief;
- rubric;
- expected concepts;
- uploaded deliverables;
- AI tutor interaction summary;
- student reflection optional;
- prior skill level.

### 10.3 Evaluation Output

```json
{
  "overall_result": "completed",
  "quality_level": "solid",
  "score_internal": 78,
  "rubric_scores": {
    "financial_logic": 0.8,
    "model_structure": 0.7,
    "assumption_quality": 0.75,
    "communication": 0.85
  },
  "strengths": [],
  "improvement_areas": [],
  "evidence_statement": "...",
  "profile_visibility_recommendation": "student_can_publish",
  "confidence": "medium"
}
```

### 10.4 Human Review Future

For high-stakes company simulations, human review may be added.

---

## 11. Anti-Cheating and Integrity

### 11.1 Integrity Signals

Track:

- time spent;
- file metadata;
- upload patterns;
- AI tutor usage;
- repeated submissions;
- suspicious similarity;
- answer inconsistency with prior skill level.

### 11.2 AI Assistance Limits

Simulation AI must be separated from general-purpose chat.

It must have:

- task-specific guardrails;
- refusal rules;
- logging;
- no direct file generation for deliverables;
- no hidden answer keys exposed.

### 11.3 Similarity Checks Future

Future versions can compare submissions against:

- known templates;
- previous submissions;
- AI-generated outputs;
- plagiarism signals.

---

## 12. Profile Integration

### 12.1 Evidence Types Generated

```text
simulation_completed
simulation_skill_evidence
simulation_deliverable_summary
simulation_feedback_summary
simulation_level_unlock
```

### 12.2 Student Control

Student can decide whether simulation evidence is visible to:

- only student;
- associations;
- companies;
- public profile future.

Some aggregate skill updates can remain internal.

### 12.3 Company-Visible Evidence

Company-visible simulation evidence should include:

- simulation title;
- path and branch;
- level;
- skills demonstrated;
- evidence statement;
- quality category;
- completion date;
- optional deliverable preview if explicitly shared.

Companies should not see raw files unless student explicitly shares.

---

## 13. UI Requirements

### 13.1 Student Simulation Home

Shows:

- recommended paths;
- active branch;
- progress;
- unlocked deep simulations;
- daily micro-exercises;
- profile evidence generated;
- upcoming recommended tasks.

### 13.2 Micro-Exercise UI

Mobile-first:

- one question at a time;
- quick feedback;
- streak/progress optional;
- explanation after answer;
- no heavy dashboard.

### 13.3 Deep Simulation UI

Desktop layout:

```text
Left panel: brief and materials
Center/right: task progress and uploads
Side panel: AI support chat
Top: progress/status
```

Mobile deep simulation screen:

- blocked start;
- explanation;
- reminder option;
- send desktop link to self.

---

## 14. Database Entities

```text
simulation_paths
simulation_branches
simulation_skills
micro_exercises
micro_exercise_attempts
deep_simulations
simulation_materials
simulation_attempts
simulation_submissions
simulation_feedback
simulation_ai_interactions
student_skill_estimates
student_profile_evidence
```

---

## 15. Admin Requirements

MIRA admin can:

- create paths;
- create branches;
- upload simulation materials;
- review AI-generated simulations;
- publish/unpublish simulations;
- inspect failed evaluations;
- manually adjust evidence if necessary;
- monitor usage and quality.

---

## 16. Company Simulations Future

Companies may create custom simulations in a future phase.

Rules:

- company simulation must be reviewed or approved by MIRA;
- student must know whether results are shared with company;
- scoring rubric must be explicit;
- company cannot use hidden scoring criteria without disclosure;
- results must follow privacy and consent rules.

---

## 17. Rollout Sequence

1. Internal simulation schema.
2. One micro-exercise path.
3. One deep simulation in Investment Banking.
4. AI evaluation with rubric.
5. Profile evidence output.
6. Student visibility controls.
7. Additional paths.
8. Company custom simulations future.

---

## 18. Acceptance Criteria for First Simulation Release

The module is ready for first release when:

- students can complete micro-exercises;
- a deep simulation can be started only from desktop;
- materials can be downloaded;
- deliverables can be uploaded;
- AI feedback is structured by rubric;
- evidence can be added to profile;
- student controls visibility;
- AI tutor cannot complete deliverables for student;
- admin can inspect simulation attempts.

