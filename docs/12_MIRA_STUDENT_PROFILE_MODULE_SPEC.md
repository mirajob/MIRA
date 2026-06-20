# MIRA Student Profile Module Specification

**Version:** 1.0  
**Date:** 2026-06-15  
**Status:** Core profile architecture specification  
**Primary services:** Supabase, AI provider abstraction, Supabase Storage  

---

## 0. Purpose

This document defines the MIRA Student Profile Module.

The student profile is the core asset of MIRA. It is not a CV and not a static self-description. It is an evidence-based representation of how a student thinks, works, learns and contributes over time.

The profile begins during the Associations Build and expands through simulations, projects, AI interactions, company interactions and orientation.

---

## 1. Product Role

The MIRA profile serves different audiences:

- student: self-understanding, orientation and progress;
- association: application evaluation and membership context;
- company: anonymous evidence-based recruiting;
- MIRA admin: support, quality and moderation;
- future university: aggregated, anonymized analytics only.

The same underlying profile has multiple visibility layers.

---

## 2. Core Principles

### 2.1 Evidence Over Claims

The profile should prioritize verified or semi-verified evidence.

Bad:

```text
I am good at financial modeling.
```

Good:

```text
Completed Investment Banking M&A simulation with DCF deliverable and contributed to association valuation report.
```

### 2.2 Human, Not Generic

MIRA must avoid creating identical AI-generated profiles.

The profile should include:

- evidence;
- interests;
- work style;
- goals;
- personal tags chosen by student;
- constraints and preferences where the student wants to share them.

### 2.3 Student Control

Student controls visibility of personal and sensitive information.

### 2.4 Profile Changes Over Time

The profile updates progressively:

- after onboarding;
- after transcript upload;
- after association applications;
- after association membership;
- after project uploads;
- after simulations;
- after orientation interactions;
- after company interactions if consented.

---

## 3. Profile Layers

### 3.1 Private Student Layer

Visible only to the student and limited MIRA admin support.

Contains:

- full onboarding answers;
- private goals;
- private tags;
- orientation questions;
- transcript file reference;
- draft profile summaries;
- internal skill estimates;
- private AI notes;
- simulation attempts not published.

### 3.2 Association Application Layer

Visible to an association only when the student applies.

Contains:

- name;
- Bocconi email;
- degree program;
- current year;
- application answers;
- relevant onboarding summary;
- transcript summary or raw transcript if explicitly consented;
- AI evaluation for that application;
- status and notes created by association.

Associations cannot see data from applications to other associations.

### 3.3 Association Membership Layer

Visible according to membership/public profile rules.

Contains:

- association membership;
- role;
- period;
- projects contributed;
- verified contributions;
- public reports or work.

### 3.4 Company Anonymous Layer

Visible to verified companies before student consent.

Contains:

- anonymous candidate ID;
- university;
- degree program;
- year;
- evidence-based skills;
- simulations completed if visible;
- association/project evidence if visible;
- AI profile summary without identity;
- public or explicitly shared tags;
- availability if shared.

Does not contain:

- name;
- email;
- raw transcript;
- private onboarding answers;
- private tags;
- private orientation history.

### 3.5 Company Revealed Layer

Visible after explicit student consent.

Contains only the fields the student chooses to reveal.

### 3.6 Admin Layer

MIRA admin can access data needed for:

- support;
- security;
- moderation;
- data correction;
- debugging;
- abuse prevention.

Admin access must be audited.

---

## 4. Profile Data Sources

### 4.1 Onboarding

Source type: student-provided.

Produces:

- interests;
- experiences;
- goals;
- motivation;
- preferred work style;
- initial personal tags;
- baseline profile summary.

### 4.2 Transcript/Libretto

Source type: uploaded academic document.

Produces:

- university;
- program;
- courses;
- grades if extracted;
- credits if extracted;
- academic interests inferred from courses;
- course-level evidence context.

Transcript data is sensitive.

### 4.3 Association Applications

Source type: application-specific.

Produces:

- motivation evidence;
- communication style;
- association interests;
- availability;
- role preferences;
- AI evaluation for that application.

Application answers are not automatically visible outside that association.

### 4.4 Association Membership

Source type: association-confirmed.

Produces:

- membership evidence;
- role;
- responsibility;
- leadership evidence;
- team evidence;
- timeline.

### 4.5 Association Projects

Source type: uploaded report/project plus human confirmation.

Produces:

- project evidence;
- contributor role;
- technical skills;
- sophistication level;
- public artifact reference.

### 4.6 Simulations

Source type: structured MIRA task.

Produces:

- skill evidence;
- deliverable summary;
- feedback;
- quality category;
- level progression.

### 4.7 AI Conversations

Source type: interaction over time.

Produces:

- interests;
- preferences;
- style signals;
- orientation history;
- self-reflection;
- possible profile updates.

Conversation-derived insights must be marked as inference, not fact.

### 4.8 Company Interactions

Source type: consented recruiting interaction.

Produces:

- expressed interest in roles;
- availability;
- company engagement;
- outcomes if student chooses to record them.

---

## 5. Evidence Graph

### 5.1 Evidence Object

Every important profile claim should link to evidence.

Fields:

```text
evidence_id
student_user_id
evidence_type
source_type
source_entity_id
title
description
skills
confidence
visibility
verified_by
created_at
updated_at
```

### 5.2 Evidence Types

```text
transcript_course
onboarding_answer
association_application
association_membership
association_project
simulation_completion
simulation_feedback
student_uploaded_project
company_assessment
admin_verified_note
```

### 5.3 Evidence Confidence

```text
self_declared
inferred
document_extracted
association_confirmed
simulation_validated
admin_verified
company_confirmed
```

### 5.4 Evidence Visibility

```text
private
student_only
association_context
company_anonymous
company_revealed
public_future
```

---

## 6. Profile Sections

### 6.1 Header

Student-visible:

- name;
- photo optional;
- university;
- program;
- year;
- current goals;
- completion status.

Company-anonymous:

- anonymous ID;
- university;
- program;
- year;
- no name/photo.

### 6.2 AI Summary

Generated from evidence and student-controlled visibility.

Variants:

```text
private_summary
association_application_summary
company_anonymous_summary
company_revealed_summary
admin_support_summary
```

### 6.3 Skills

Each skill shows:

- skill name;
- level;
- evidence count;
- strongest evidence;
- last updated;
- visibility.

### 6.4 Projects

Projects can be:

- personal;
- association;
- simulation;
- company assessment future.

### 6.5 Association Activity

Shows:

- applications;
- memberships;
- roles;
- projects;
- leadership evidence.

### 6.6 Simulations

Shows:

- completed paths;
- branches;
- levels;
- feedback summaries;
- published evidence.

### 6.7 Personal Tags

Student-defined and AI-suggested tags.

Examples:

```text
first-generation student
international background
family business exposure
loves public markets
prefers small teams
interested in healthcare
```

Personal tags are private by default.

### 6.8 Work Style

Derived from onboarding and interactions.

Must be framed carefully:

```text
MIRA has observed signals that suggest...
```

Not deterministic psychological labeling.

---

## 7. Profile Summary Generation

### 7.1 AI Module

```text
AI_MODULE_PROFILE_SUMMARIZER
```

### 7.2 Inputs

```text
student_profile
visible_evidence
onboarding_summary
academic_summary
simulation_evidence
association_evidence
visibility_context
```

### 7.3 Output

```json
{
  "summary": "...",
  "headline": "...",
  "core_strengths": [],
  "evidence_highlights": [],
  "growth_areas": [],
  "uncertainties": [],
  "visibility_context": "company_anonymous"
}
```

### 7.4 Rules

- Do not invent facts.
- Link statements to evidence.
- Do not expose private data in public summaries.
- Avoid exaggeration.
- Distinguish evidence from inference.

---

## 8. Profile Visibility Controls

### 8.1 Student Privacy Center

Student can control:

- which simulations are visible;
- which projects are visible;
- whether association memberships are visible;
- personal tags visibility;
- company anonymous profile visibility;
- whether companies can contact them;
- transcript raw file sharing;
- identity reveal decisions.

### 8.2 Visibility Levels

```text
private_only
visible_to_association_when_applying
visible_to_verified_companies_anonymously
visible_after_company_consent
public_future
```

### 8.3 Preview Mode

Student should be able to preview:

- what an association sees;
- what a company sees anonymously;
- what a company sees after reveal.

---

## 9. Transcript Policy

Raw transcript is sensitive.

Default:

- stored privately;
- parsed into academic summary;
- raw file not visible to associations/companies unless explicitly consented.

Association application cycle can request raw transcript visibility, but student must see this before submitting.

Companies should not see raw transcript by default.

---

## 10. Profile Update Triggers

Profile updates after:

```text
onboarding_completed
transcript_uploaded
transcript_parsed
association_application_submitted
association_status_accepted
association_membership_confirmed
association_project_analyzed
simulation_completed
student_visibility_changed
company_identity_revealed
manual_admin_correction
```

Updates should create profile version or audit event.

---

## 11. Database Entities

```text
student_profiles
student_onboarding_answers
student_transcripts
student_courses
student_skills
student_profile_evidence
student_profile_summaries
student_visibility_settings
student_personal_tags
student_projects
student_profile_versions
student_company_consents
```

---

## 12. UI Requirements

### 12.1 Student Profile Page

Sections:

- summary;
- academic profile;
- skills;
- evidence;
- associations;
- simulations;
- projects;
- personal tags;
- visibility center.

### 12.2 Profile Completeness

MIRA can show profile completeness, but avoid making it feel like a CV checklist.

Use:

```text
Profile evidence strength
```

instead of:

```text
CV completion percentage
```

### 12.3 Evidence Detail View

Clicking evidence shows:

- source;
- date;
- description;
- skills;
- visibility;
- linked file/project if allowed.

---

## 13. Association Impact

When a student is accepted into an association:

- create membership evidence;
- update profile summary;
- optionally show role;
- allow association projects to enrich profile later.

Rejected applications should not create negative public evidence.

---

## 14. Company Impact

Companies see anonymous version only.

Student can decide whether they are open to company discovery.

Company matching uses profile evidence, but output must respect visibility settings.

---

## 15. Admin Requirements

MIRA admin can:

- inspect profile records for support;
- correct broken data;
- trigger summary regeneration;
- remove inappropriate evidence;
- handle deletion/export requests;
- view audit logs.

Admin actions must be audited.

---

## 16. Acceptance Criteria for First Profile Release

Ready when:

- student profile is created on registration;
- onboarding updates profile;
- transcript upload updates academic profile;
- application submission creates association context;
- accepted association status can create membership evidence;
- profile summary is generated safely;
- student can see what is private;
- associations see only application-relevant data;
- companies cannot see identity before consent.

