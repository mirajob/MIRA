# MIRA Companies Module Specification

**Version:** 1.0  
**Date:** 2026-06-15  
**Status:** Future module specification for company recruiting and AI matching  
**Primary stack:** Next.js, Expo React Native, Supabase, AI provider abstraction  

---

## 0. Purpose

This document defines the company-side product of MIRA.

The Companies Module allows verified companies to search, evaluate and contact university talent through MIRA profiles based on real evidence, not CV claims.

This module is not part of the first Associations Build, but the current architecture must support it.

---

## 1. Product Role

MIRA's company product solves a specific problem: companies struggle to understand entry-level candidates before interviews because CVs are self-declared and weakly verified.

MIRA provides companies with:

- AI matching based on student evidence;
- anonymous candidate profiles;
- explainable candidate recommendations;
- controlled contact requests;
- anonymous chat before identity reveal;
- student consent management;
- future assessment and recruiting pipeline tools.

Companies do not receive CVs by default. They receive structured, evidence-based MIRA profiles.

---

## 2. Core Principles

### 2.1 Company Access Requires Authenticity

At the beginning, company access must be controlled to prevent fake accounts.

MIRA supports two access paths:

1. **MIRA Admin Invitation**: founder/admin invites a known company representative directly.
2. **Company Self-Registration Request**: company registers interest, but access is limited until verification.

Important companies, strategic pilots and early recruiters should be onboarded through direct MIRA admin invitation.

Normal companies can request access, but must be verified before seeing candidate data.

### 2.2 Student Identity Is Private by Default

Companies cannot see student identity until the student explicitly consents.

Before consent, companies may see:

- anonymous profile ID;
- university;
- degree program;
- year;
- skills and evidence;
- AI summary;
- simulations completed;
- association evidence;
- public or explicitly visible tags.

Before consent, companies must not see:

- full name;
- personal email;
- exact transcript file;
- private tags;
- private onboarding answers;
- unrelated association application answers;
- internal AI logs;
- private candidate notes.

### 2.3 AI Assists, Humans Decide

AI can recommend candidates, summarize evidence and suggest next steps.

AI must not make final hiring decisions.

### 2.4 Matching Must Be Explainable

Every recommended candidate must include a clear explanation of why the candidate matches the search.

The explanation must separate:

- direct evidence;
- AI inference;
- missing information;
- uncertainty.

---

## 3. Company User Roles

### 3.1 Company Roles

Initial roles:

```text
company_owner
company_admin
company_recruiter
company_interviewer
company_viewer
```

### 3.2 Role Definitions

#### `company_owner`

Full company workspace owner. Can:

- edit company profile;
- manage recruiters;
- manage billing;
- create searches;
- view candidates;
- open anonymous chats;
- invite company members;
- manage permissions;
- access analytics.

#### `company_admin`

Operational admin. Can:

- manage searches;
- invite recruiters;
- manage pipeline;
- view candidate matches;
- use subscription features allowed by plan.

#### `company_recruiter`

Standard recruiter. Can:

- create searches if permitted;
- view candidates;
- open anonymous chats;
- manage pipeline for assigned roles;
- send assessment tasks if plan allows.

#### `company_interviewer`

Limited access to specific candidates after contact is accepted.

#### `company_viewer`

Read-only access to assigned searches or candidates.

---

## 4. Company Verification Model

### 4.1 Verification Statuses

```text
unverified
requested
email_domain_verified
admin_invited
admin_review
verified
rejected
suspended
```

### 4.2 Admin Invitation Flow

Use for early pilots, important companies or known representatives.

Flow:

1. MIRA admin opens `/admin/companies/invitations`.
2. Admin enters company name and representative email.
3. Admin selects invitation type:
   - pilot;
   - strategic;
   - enterprise;
   - standard invitation.
4. MIRA sends invitation email.
5. Representative accepts invitation.
6. Representative verifies email.
7. Company profile is created in verified or admin_review state depending on admin setting.
8. Representative becomes `company_owner`.
9. Admin can manually approve before access to candidate pool.

### 4.3 Self-Registration Request Flow

Use for normal companies.

Flow:

1. Company representative goes to MIRA company landing page.
2. Clicks "Request company access".
3. Enters company email, company name, website, role, LinkedIn optional.
4. MIRA blocks generic consumer email domains where possible.
5. Representative verifies email.
6. MIRA creates `company_profiles` record with `requested` status.
7. Admin reviews company request.
8. Admin approves, rejects or asks for more info.
9. Approved company receives limited or full access depending on tier.

### 4.4 Verification Checks

Verification can include:

- business email domain;
- company website domain match;
- manual admin approval;
- known representative invitation;
- LinkedIn/company page review;
- legal company name;
- billing information after paid launch.

### 4.5 Access Before Verification

Unverified companies can:

- edit draft company profile;
- invite limited internal members only if allowed;
- view product demo or sample anonymized profiles;
- request verification.

Unverified companies cannot:

- search real student pool;
- view real candidate profiles;
- open chats;
- send contact requests;
- export data;
- use AI matching against real students.

---

## 5. Company Profile Structure

### 5.1 Required Fields

```text
company_name
legal_name
slug
website_url
logo_url
industry
company_size
headquarters_location
operating_locations
email_domain
verification_status
created_by_user_id
```

### 5.2 Recruiting Profile Fields

```text
roles_hired
target_universities
target_degree_programs
locations
contract_types
recruiting_periods
internship_programs
graduate_programs
visa_requirements_optional
remote_hybrid_onsite
```

### 5.3 Culture and Fit Fields

```text
work_environment
team_structure
preferred_candidate_traits
technical_requirements
soft_skill_priorities
values
what_success_looks_like
what_candidates_should_know
```

### 5.4 AI-Generated Draft

MIRA can generate a company profile draft from:

- website URL;
- public company information;
- representative input;
- admin notes.

The company representative must review and approve before publishing.

AI-generated profile content must be marked as draft until human-approved.

---

## 6. Recruiter UX

### 6.1 Company Workspace Navigation

Web navigation:

```text
Dashboard
Searches
Candidates
Chats
Pipeline
Assessments
Team
Company Profile
Billing
Settings
```

Mobile navigation:

```text
Home
Searches
Candidates
Chats
Notifications
Profile
```

### 6.2 Dashboard

The dashboard shows:

- verification status;
- active searches;
- recommended candidates;
- unread chats;
- pending student responses;
- pipeline overview;
- subscription/tier status;
- alerts or required actions.

### 6.3 Search Thread UX

Recruiter creates a search in natural language:

```text
We are looking for Bocconi bachelor or master students interested in M&A, with strong financial modeling evidence, association experience and availability for a summer internship in Milan.
```

MIRA converts this into a structured search:

```json
{
  "role_title": "M&A Summer Intern",
  "target_universities": ["Bocconi"],
  "skills": ["financial modeling", "valuation", "DCF", "M&A interest"],
  "evidence_priority": ["simulations", "association projects", "academic profile"],
  "location": "Milan",
  "contract_type": "internship",
  "availability": "summer"
}
```

Recruiter can edit structured filters after AI extraction.

### 6.4 Candidate List UX

Candidate list shows anonymous candidates:

```text
Candidate A7K3
Bocconi | MSc Finance | Year 1
Strong evidence: valuation, DCF, association project
Fit: Strong
Why suggested: ...
Status: Not contacted
```

Filters:

- university;
- program;
- year;
- skill evidence;
- simulation completion;
- association experience;
- availability;
- fit category;
- contact status;
- candidate consent status.

### 6.5 Candidate Detail UX

Before identity reveal, candidate detail includes:

- anonymous candidate ID;
- academic context;
- AI-generated summary;
- skills with evidence;
- simulations completed;
- association evidence;
- projects where visible;
- work style summary where consented;
- visible tags;
- AI match explanation;
- gaps/uncertainties;
- contact request button.

After identity reveal, company can see:

- full name;
- contact email or preferred contact method;
- any additional data the student explicitly consents to share;
- full conversation history.

---

## 7. Matching Logic

### 7.1 Matching Inputs

Company search:

- natural language role description;
- structured filters;
- company culture profile;
- role requirements;
- technical skills;
- degree/program constraints;
- location and timing;
- evidence weights.

Student profile:

- academic profile;
- skills;
- simulation evidence;
- association evidence;
- project evidence;
- AI profile summary;
- attitudinal signals where visible;
- personal tags where visible;
- availability;
- consent and visibility settings.

### 7.2 Matching Output

For each candidate:

```json
{
  "candidate_anonymous_id": "A7K3",
  "fit_category": "strong_fit",
  "match_score_internal": 0.87,
  "why_match": [
    "Completed IB M&A simulation with DCF deliverable",
    "Contributed to association valuation report",
    "Academic path aligned with finance role"
  ],
  "gaps_or_uncertainties": [
    "Availability not confirmed",
    "No explicit LevFin evidence"
  ],
  "recommended_action": "send_contact_request",
  "confidence": "medium"
}
```

### 7.3 Matching Ranking

Ranking should combine:

- hard filters;
- skill evidence;
- evidence quality;
- role fit;
- culture/attitude fit;
- availability;
- student visibility settings;
- freshness of profile.

Do not rank candidates solely by grades.

Grades are context, not primary evidence.

### 7.4 Explainability

Every match must include:

- evidence-based reasons;
- inferred reasons;
- uncertainty;
- missing data.

---

## 8. Anonymous Contact and Consent

### 8.1 Contact Request Flow

1. Company views anonymous candidate.
2. Company clicks "Request contact".
3. Company writes message and role description.
4. MIRA sends notification to student.
5. Student sees full company identity and reason for selection.
6. Student can:
   - ignore;
   - decline;
   - accept anonymous chat;
   - reveal identity immediately;
   - request more info.
7. Company remains unable to see identity until student consents.

### 8.2 What Student Sees

Student sees:

- company name;
- recruiter name and role;
- company profile;
- job/search description;
- why MIRA matched them;
- what the company can currently see;
- what will be revealed if they accept;
- controls for identity reveal.

### 8.3 Anonymous Chat

If student accepts anonymous chat:

- company can chat with anonymous candidate;
- student can ask questions;
- student can reveal identity at any time;
- student can end chat;
- company can request formal contact;
- all messages are logged.

### 8.4 Identity Reveal

Identity reveal requires explicit action by student.

Reveal options:

```text
reveal_name_only
reveal_name_and_email
reveal_full_profile
reveal_selected_data
```

Student can see a preview before confirming.

### 8.5 Consent Records

Every reveal creates a consent record:

```text
student_user_id
company_id
recruiter_user_id
match_id
revealed_fields
consent_text_version
consented_at
revoked_at optional
```

---

## 9. Recruiting Pipeline

### 9.1 Pipeline Stages

```text
matched
shortlisted
contact_requested
student_responded
anonymous_chat
identity_revealed
screening
assessment_sent
interview
offer
hired
rejected
closed
```

### 9.2 Pipeline Rules

- A company cannot move a candidate to stages requiring identity before consent.
- Student must be notified of meaningful status changes when appropriate.
- Company internal notes are private to the company.
- MIRA admin can inspect for abuse/security only.

### 9.3 Assessment Tasks Future

Companies can send tasks after student consent or under controlled anonymous flow.

Assessment tasks can include:

- written case;
- file upload;
- dataset analysis;
- video or text response;
- simulation-like task hosted on MIRA.

AI can provide preliminary feedback, but final assessment belongs to company.

---

## 10. Messaging System

### 10.1 Thread Types

```text
company_student_anonymous
company_student_revealed
company_internal
mira_admin_company_support
```

### 10.2 Message Rules

- Anonymous thread must not expose student identity in metadata.
- Attachments require explicit permission.
- System messages must show consent events.
- Recruiters cannot message students outside allowed flows.

### 10.3 Abuse Prevention

MIRA should monitor:

- excessive contact requests;
- spam-like messages;
- attempts to extract identity outside consent flow;
- suspicious company accounts;
- reports by students.

---

## 11. Pricing and Access Tiers

### 11.1 Initial Pilot

Initial companies can be invited by MIRA admin as pilot companies.

Pilot tier:

- full or limited matching access;
- feedback required;
- no payment initially;
- limited number of searches;
- limited number of contact requests.

### 11.2 Future Tiers

```text
Pilot
Base
Pro
Enterprise
```

### 11.3 Tier Features

#### Pilot

- invited only;
- limited candidate pool;
- matching;
- anonymous chat;
- feedback requirement.

#### Base

- search pool;
- AI matching;
- anonymous contact requests;
- basic pipeline.

#### Pro

- Base plus assessment tasks;
- interview coordination;
- team collaboration;
- advanced filters;
- analytics.

#### Enterprise

- Pro plus custom simulations;
- advanced analytics;
- branded company page;
- priority support;
- integrations;
- custom data agreements.

### 11.4 Payments

Stripe should be used in a future paid phase.

Do not implement paid subscriptions until pricing and legal terms are finalized.

---

## 12. Database Entities

Core tables:

```text
company_profiles
company_memberships
company_invitations
company_access_requests
company_verification_events
company_searches
company_search_filters
candidate_matches
company_candidate_pipeline
company_candidate_notes
anonymous_threads
messages
student_company_consents
company_billing_accounts future
subscription_plans future
```

These should be aligned with `03_MIRA_DATABASE_SCHEMA.md`.

---

## 13. AI Modules

Relevant AI modules:

```text
AI_MODULE_COMPANY_PROFILE_DRAFTER
AI_MODULE_COMPANY_SEARCH_STRUCTURER
AI_MODULE_COMPANY_MATCHING
AI_MODULE_MATCH_EXPLAINER
AI_MODULE_ANONYMOUS_CHAT_ASSISTANT
AI_MODULE_ASSESSMENT_FEEDBACK future
```

### 13.1 Company Search Structurer Output

```json
{
  "role_title": "Investment Banking Summer Analyst",
  "seniority": "entry_level",
  "target_universities": ["Bocconi"],
  "degree_programs": ["Finance", "CLEF"],
  "required_skills": ["valuation", "financial modeling"],
  "preferred_evidence": ["deep_simulation", "association_project"],
  "location": "Milan",
  "contract_type": "internship",
  "availability_window": "summer",
  "culture_traits": ["analytical", "resilient", "structured"]
}
```

### 13.2 Candidate Match Output

```json
{
  "fit_category": "strong_fit",
  "internal_score": 88,
  "evidence_matches": [],
  "inferred_matches": [],
  "gaps": [],
  "uncertainties": [],
  "recommended_action": "request_contact",
  "confidence": "medium"
}
```

---

## 14. Web Pages

Future routes:

```text
/companies
/companies/request-access
/company/onboarding
/company/dashboard
/company/profile
/company/searches
/company/searches/new
/company/searches/[id]
/company/candidates/[matchId]
/company/chats
/company/chats/[threadId]
/company/pipeline
/company/team
/company/billing
/admin/companies
/admin/companies/invitations
/admin/companies/access-requests
```

---

## 15. Mobile Requirements

Company mobile support should include:

- login;
- recruiter mode;
- search overview;
- candidate list;
- anonymous profile view;
- chat;
- notifications;
- pipeline quick updates.

Complex company setup and billing can remain web-first.

---

## 16. Security Rules

- Company access must be verified before real student search.
- Companies see only visibility-approved profile fields.
- Identity reveal requires explicit student consent.
- Consent events must be auditable.
- Company internal notes are not visible to students unless required by future policy.
- MIRA admin access to messages is restricted to support, security and abuse investigation.
- Exporting candidate data should be disabled or tier-restricted and audited.

---

## 17. Acceptance Criteria for First Company Pilot

A company pilot is ready when:

- MIRA admin can invite a known company representative;
- representative can verify email and create company profile;
- company can create a search;
- MIRA can return anonymous candidate matches;
- recruiter can inspect anonymous profile;
- recruiter can send contact request;
- student can accept or decline;
- anonymous chat works;
- identity reveal requires explicit consent;
- audit logs exist for contact and reveal events.

---

## 18. Out of Scope Until Later

Do not build initially:

- automated public company self-approval;
- scraping private company data;
- ATS integrations;
- bulk candidate export;
- payment billing;
- automated hiring decisions;
- company access to raw transcripts;
- company-created simulations without moderation.

