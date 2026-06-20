# MIRA Orientation Module Specification

**Version:** 1.0  
**Date:** 2026-06-15  
**Status:** Future module specification for surgical career and academic orientation  
**Primary services:** Supabase, Knowledge Base/RAG, AI provider abstraction  

---

## 0. Purpose

This document defines the MIRA Orientation Module.

The goal is not generic career advice. MIRA should provide surgical orientation: precise guidance connecting a student's current profile to specific micro-careers, skills, university courses, simulations and next steps.

This module is future scope. The first Associations Build should not implement the full orientation engine, but data structures and knowledge base design must remain compatible.

---

## 1. Product Role

MIRA orientation helps students answer questions like:

```text
Am I ready for Equity Research Healthcare?
What skills am I missing for Growth Equity?
Which Bocconi electives help me prepare for M&A?
Which simulation should I do next?
What is the difference between DCM and M&A for someone like me?
```

MIRA should not answer only:

```text
You might like finance.
```

MIRA should answer:

```text
For Growth Equity, your current profile already shows valuation interest and strong association motivation. You are missing evidence in SaaS metrics and advanced LBO modeling. At Bocconi, the most relevant courses are X and Y. In MIRA, you should start the Growth Equity branch and complete the SaaS valuation micro-exercises before attempting the deep simulation.
```

---

## 2. Core Principles

### 2.1 Micro-Sector Precision

MIRA maps real entry-level micro-sectors, not only macro-categories.

Bad:

```text
Finance
Consulting
Marketing
```

Good:

```text
M&A Healthcare
Growth Equity
Leveraged Finance
Operations Consulting
Product Manager B2B SaaS
Performance Marketing
```

### 2.2 Evidence-Based Guidance

Advice must be based on:

- student profile;
- transcript;
- association evidence;
- simulation evidence;
- project evidence;
- stated interests;
- academic knowledge base;
- career knowledge base;
- uncertainty where data is missing.

### 2.3 Actionable Recommendations

Every orientation output should include next actions:

- courses to explore;
- simulations to complete;
- skills to build;
- association/projects to consider;
- questions to ask;
- career paths to compare.

### 2.4 Student Control

Orientation may use private student data, but outputs should be visible only to the student unless explicitly shared.

---

## 3. Career Path Taxonomy

### 3.1 Macro Areas

Initial macro areas:

```text
Investment Banking
Private Equity
Consulting
Asset Management
Corporate Finance
Technology and Product
Marketing and Growth
Data and Analytics
Entrepreneurship and Startups
Public Sector and Policy future
Legal and Compliance future
```

### 3.2 Micro-Sectors

Examples:

```text
Investment Banking
  M&A Generalist
  M&A Healthcare
  M&A TMT
  M&A FIG
  DCM
  ECM
  Leveraged Finance
  Restructuring

Private Equity
  Large Cap Buyout
  Mid-Market Buyout
  Growth Equity
  Venture Capital
  Private Debt
  Infrastructure Private Equity

Consulting
  Strategy Generalist
  Operations
  Digital Transformation
  Financial Advisory
  Public Sector
  Restructuring Advisory

Asset Management
  Equity Long Only
  Equity Long/Short
  Fixed Income
  Multi-Asset
  ESG Investing
  Quantitative Investing

Technology and Product
  Product Manager B2B SaaS
  Product Manager B2C
  Growth Product Manager
  Data Product Manager
  Platform Product Manager

Marketing and Growth
  Performance Marketing
  Brand Management
  Growth Hacking
  CRM
  Product Marketing

Data and Analytics
  Business Intelligence
  Data Analyst
  Analytics Engineer
  Data Science Entry-Level
```

### 3.3 Micro-Sector Fields

Each micro-sector should have:

```text
id
name
macro_area
description
what_work_looks_like
entry_level_roles
required_skills
preferred_skills
academic_relevance
simulation_paths
common_companies
common_associations
recommended_projects
seniority_progression
misconceptions
```

---

## 4. Skill Taxonomy

### 4.1 Skill Categories

```text
technical_skills
analytical_skills
communication_skills
domain_knowledge
software_tools
work_style_signals
```

### 4.2 Skill Entity Fields

```text
skill_id
name
category
description
related_skills
proof_methods
relevant_micro_sectors
course_topics
simulation_tasks
```

### 4.3 Skill Levels

```text
unknown
introduced
practiced
validated_basic
validated_intermediate
validated_advanced
```

MIRA should distinguish:

- self-declared interest;
- academic exposure;
- micro-exercise performance;
- simulation validation;
- project evidence;
- association evidence.

---

## 5. Academic Knowledge Base

### 5.1 Academic Entities

```text
universities
schools_departments
degree_programs
majors_tracks
courses
course_offerings
syllabi
academic_topics
course_skill_mappings
```

### 5.2 Course Fields

```text
university
course_code
course_name
degree_program
level
credits
year
semester
mandatory_or_elective
syllabus_url
official_page_url
topics
skills_taught
assessment_methods
prerequisites
last_updated
```

### 5.3 Data Sources

Sources can include:

- official university websites;
- course catalogs;
- PDF syllabi;
- degree program brochures;
- public course pages;
- admin-uploaded documents;
- manually curated records.

### 5.4 Update Process

Academic data should be versioned by academic year.

MIRA must avoid silently overwriting past data because students may have taken courses under previous syllabi.

---

## 6. Career-Knowledge Mapping

### 6.1 Micro-Sector to Skill Mapping

Each micro-sector maps to required and preferred skills.

Example:

```json
{
  "micro_sector": "Growth Equity",
  "required_skills": [
    "financial_statement_analysis",
    "valuation",
    "unit_economics",
    "SaaS_metrics",
    "market_sizing"
  ],
  "preferred_skills": [
    "LBO_basics",
    "commercial_due_diligence",
    "founder_assessment"
  ]
}
```

### 6.2 Skill to Course Mapping

Each skill maps to academic courses and course topics.

Example:

```json
{
  "skill": "valuation",
  "courses": [
    {
      "university": "Bocconi",
      "course_name": "Corporate Valuation",
      "relevance": "high",
      "topics": ["DCF", "multiples", "cost of capital"]
    }
  ]
}
```

### 6.3 Skill to Simulation Mapping

Each skill maps to MIRA simulations.

Example:

```json
{
  "skill": "DCF",
  "simulation_paths": [
    "Investment Banking > M&A > Level 1",
    "Private Equity > Buyout > Level 1"
  ]
}
```

---

## 7. Gap Analysis Engine

### 7.1 Inputs

```text
student academic profile
transcript summary
completed courses
student interests
simulation evidence
association/project evidence
target micro-sector
career skill requirements
academic course mappings
simulation mappings
```

### 7.2 Output

```json
{
  "target_micro_sector": "Growth Equity",
  "readiness_category": "partially_ready",
  "current_strengths": [],
  "missing_skills": [],
  "academic_recommendations": [],
  "simulation_recommendations": [],
  "project_recommendations": [],
  "next_3_actions": [],
  "confidence": "medium",
  "uncertainties": []
}
```

### 7.3 Readiness Categories

```text
exploration_stage
foundation_ready
partially_ready
strongly_ready
needs_more_evidence
```

### 7.4 Recommendation Logic

MIRA should prioritize recommendations by:

1. biggest skill gap;
2. student stated interest;
3. evidence already present;
4. timing constraints;
5. available courses;
6. available simulations;
7. confidence level.

---

## 8. Orientation UX

### 8.1 Chat-Centric Entry

Students should be able to ask:

```text
What should I do if I want to work in private equity?
Am I more suited for consulting or investment banking?
Which Bocconi courses help with product management?
What do I need for M&A Healthcare?
```

MIRA responds conversationally and evokes widgets.

### 8.2 Widgets

Orientation widgets:

```text
Career Path Card
Micro-Sector Card
Skill Gap Analysis
Course Recommendation Card
Simulation Path Card
Comparison Widget
Roadmap Widget
```

### 8.3 Career Path Card

Contains:

- description;
- daily work;
- entry-level roles;
- skills required;
- relevant MIRA simulations;
- relevant courses;
- typical companies;
- student readiness summary.

### 8.4 Gap Analysis Widget

Shows:

```text
Skill required | Student evidence | Gap level | Recommended action
```

### 8.5 Course Recommendation Card

Shows:

- course name;
- university;
- credits;
- degree/program;
- mandatory/elective;
- relevant topics;
- why it matters;
- official link.

---

## 9. Recommendation Examples

### 9.1 Example: Equity Research Healthcare

Student asks:

```text
Am I ready for Equity Research Healthcare?
```

MIRA output:

```text
You have early finance evidence from your transcript and association interest, but I do not yet see healthcare-specific knowledge or public markets research evidence.

For Equity Research Healthcare, the key missing pieces are:
1. accounting and financial statement analysis at company level;
2. valuation of listed companies;
3. healthcare business model understanding;
4. writing investment theses.

Recommended next steps:
- complete the Equity Research micro-exercises when available;
- consider courses covering valuation and healthcare management;
- write or contribute to a public company research note if possible;
- use MIRA's company analysis simulation once unlocked.
```

### 9.2 Example: Growth Equity

MIRA should identify:

- valuation foundation;
- SaaS metrics gap;
- market sizing;
- commercial due diligence;
- simulations and electives.

---

## 10. AI Module

Relevant module:

```text
AI_MODULE_ORIENTATION_ADVISOR
```

### 10.1 Inputs

```text
student_profile
student_transcript_summary
student_evidence_graph
target_micro_sector optional
chat_question
career_knowledge_retrieval
academic_knowledge_retrieval
simulation_catalog
```

### 10.2 Output Schema

```json
{
  "answer_type": "career_guidance",
  "summary": "...",
  "target_paths": [],
  "strengths": [],
  "gaps": [],
  "recommended_courses": [],
  "recommended_simulations": [],
  "recommended_projects": [],
  "widgets_to_show": [],
  "next_actions": [],
  "confidence": "medium",
  "uncertainties": []
}
```

### 10.3 Rules

- Do not pretend certainty when data is missing.
- Cite official academic data internally when possible.
- Separate general career knowledge from student-specific advice.
- Do not recommend only prestige paths.
- Avoid deterministic labels like "you are not suited for X".
- Provide practical next steps.

---

## 11. Database Entities

```text
career_macro_areas
career_micro_sectors
career_roles
skills
micro_sector_skills
universities
degree_programs
courses
course_offerings
syllabi
course_topics
course_skill_mappings
simulation_skill_mappings
orientation_queries
orientation_recommendations
student_orientation_preferences
```

---

## 12. Knowledge Base Requirements

The orientation system depends heavily on the knowledge base.

Required document types:

- course syllabi;
- program brochures;
- official course pages;
- career path descriptions;
- company role descriptions;
- internal MIRA career taxonomy;
- simulation catalog metadata.

Documents must be scoped and versioned.

---

## 13. Admin Requirements

MIRA admin can:

- create/edit micro-sectors;
- create/edit skill mappings;
- upload academic documents;
- validate course extraction;
- approve AI-generated course mappings;
- mark outdated syllabi;
- inspect recommendation logs;
- manually correct incorrect mappings.

---

## 14. Privacy Rules

- Orientation outputs are private to the student by default.
- Companies cannot see what careers a student explored unless student explicitly shares.
- Associations cannot see private orientation queries.
- AI logs must avoid exposing sensitive private reasoning to operational users.

---

## 15. Rollout Sequence

1. Define taxonomy for 20-30 micro-sectors.
2. Add initial skill taxonomy.
3. Add Bocconi course database manually/semiautomatically.
4. Build orientation chat response without full widgets.
5. Build micro-sector cards.
6. Build gap analysis widget.
7. Connect simulations.
8. Add multi-university support.
9. Automate yearly syllabus updates.

---

## 16. Acceptance Criteria for First Orientation Release

Ready when:

- student can ask about a micro-sector;
- MIRA can produce structured guidance;
- output includes skills, gaps and actions;
- at least one university/course mapping exists;
- recommendations distinguish evidence from inference;
- orientation logs are private;
- UI can show at least one gap analysis widget.

