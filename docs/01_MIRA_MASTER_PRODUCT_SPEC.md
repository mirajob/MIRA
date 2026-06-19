# MIRA Master Product Specification

**Version:** 1.0  
**Date:** 2026-06-15  
**Status:** Internal product and technical source of truth  
**Audience:** Founder, AI coding tools, future developers, product collaborators  
**Primary build approach:** Code-first, production-oriented, AI-assisted development  

---

## 0. Document Purpose

This document defines the complete product and technical specification for MIRA.

MIRA is not a prototype and must not be built as a disposable demo. The platform must be designed as a long-term product with a coherent architecture that can support students, university associations, companies, future universities, AI profiles, simulations, matching, knowledge base, web app and mobile app.

The first production build is the Associations Module. That first build must use the same long-term architecture, database, authentication model, file storage model, AI service abstraction, permission model and identity model that will later support the full MIRA platform.

AI coding tools must treat this document as the global source of truth. When there is a dedicated module specification, such as `MIRA_ASSOCIATIONS_FIRST_BUILD.md`, that module document defines the current implementation scope, while this master document defines the long-term architecture and product vision.

---

## 1. Product Vision

MIRA is an AI-first university talent platform.

MIRA helps students prove who they are through evidence, not self-description. It helps university associations manage applications and turn association work into verified profile evidence. It helps companies discover and contact entry-level talent through AI matching based on real signals instead of CV claims.

MIRA is not a job board.  
MIRA is not a CV database.  
MIRA is not a generic career platform.  
MIRA is not a course marketplace.  

MIRA is a system that observes, structures and validates how students think, work, learn, contribute and make decisions over time.

The complete product includes:

- student onboarding;
- transcript/libretto upload and academic extraction;
- conversational AI profile building;
- association application workflows;
- association project/report analysis;
- student profiles based on evidence;
- AI chat-centric interface;
- contextual widgets;
- simulations and deep work tasks;
- surgical academic and career orientation;
- company recruiting and AI matching;
- anonymous company-student chat;
- admin knowledge base;
- web app;
- mobile app for iOS and Android;
- future university B2B layer.

---

## 2. Core Product Principles

### 2.1 Evidence Over Claims

MIRA must prefer evidence over self-declaration.

Bad signal:

> "I know financial modelling."

Good signal:

> "Completed an M&A simulation, built a DCF model, contributed to an association report, received AI-reviewed feedback and was confirmed by an association admin as project contributor."

### 2.2 AI-First, Not AI-Decorated

AI is not a small chatbot placed next to a normal dashboard. AI is part of the product architecture.

AI should:

- guide onboarding;
- summarize candidates;
- extract transcript information;
- structure student profiles;
- analyze projects;
- generate candidate evaluations;
- support association page creation;
- assist company matching;
- retrieve relevant knowledge base documents;
- evoke contextual widgets;
- explain decisions and uncertainty.

### 2.3 Chat-Centric Where It Creates Value

For students, MIRA should feel like a guided conversation, not a static form or a traditional dashboard.

For operational users such as association presidents, board members, companies and admins, MIRA can use dashboards where dashboards are useful. However, AI should still be integrated into those workflows.

Principle:

> MIRA is chat-centric for discovery, onboarding, orientation and AI-guided workflows. MIRA uses structured dashboards for operational control, candidate review, admin management and high-volume workflows.

### 2.4 Native Multi-Role Platform

MIRA is organized around people, not account types.

One user account can have multiple roles.

Examples:

- a Bocconi student can apply to an association;
- the same student can be a board member of another association;
- the same student can be president of an association;
- the same student can later be matched with companies;
- a MIRA admin can also have a normal student profile, but admin powers remain isolated.

The platform must support role switching across web and mobile.

### 2.5 Associations Are Native Actors, Not External Clients

University associations are not treated as external organizations using a separate admin panel. Association presidents and board members are usually students themselves.

Therefore:

- they use the same MIRA identity;
- they use the same mobile app;
- they have student profiles;
- their association activity can enrich student evidence;
- board permissions are attached to their membership in a specific association.

### 2.6 Web and Mobile Are Both First-Class Clients

MIRA must support both:

- web app;
- mobile app for iOS and Android.

They must not become separate products.

There is one platform, one backend, one database, one identity system, one AI layer, one file storage architecture and multiple clients.

### 2.7 Build Production Slices, Not Throwaway Prototypes

Each feature must be built as part of the final platform.

The first build can be limited in scope, but it must not use fake architecture, hardcoded data, isolated pages or temporary-only systems that must be fully rebuilt later.

### 2.8 Human Final Decision

AI can recommend, evaluate, rank, summarize and explain.

AI must never make final admission, rejection, hiring or career decisions automatically.

Final decisions belong to humans with the proper permissions.

---

## 3. Initial Product Scope and Long-Term Scope

### 3.1 First Production Build

The first production build is:

> MIRA Associations First Build

It focuses on Bocconi students and university associations.

Core first-build outcomes:

- students can register with verified Bocconi student email;
- students can apply to associations through MIRA;
- students complete base onboarding and upload transcript/libretto;
- associations create public pages and application cycles;
- presidents invite board members;
- board members review candidates;
- AI summarizes and evaluates applications;
- MIRA admin manages official invitations, associations, users, applications and knowledge base;
- web and mobile requirements are respected from the beginning.

### 3.2 Complete Long-Term Product

The complete MIRA platform includes:

- students;
- associations;
- companies;
- universities;
- student profiles;
- onboarding;
- transcript parsing;
- project analysis;
- simulations;
- AI matching;
- anonymous company chats;
- surgical orientation;
- knowledge base;
- payments;
- analytics;
- admin moderation;
- mobile app;
- multi-university expansion.

---

## 4. Target Users

### 4.1 Student

Initial student user:

- Bocconi student;
- must register with `@studbocconi.it` email;
- applies to associations;
- uploads transcript/libretto;
- completes onboarding;
- builds MIRA profile over time;
- later uses simulations, orientation and company matching.

Future student users:

- students from other universities;
- international students;
- alumni with specific limited access.

### 4.2 Association President

A student who manages an association workspace.

The president:

- is invited officially by MIRA admin in the initial phase;
- registers with verified student email;
- creates or claims association profile;
- manages page, application cycles, questions, candidates and board members;
- grants or revokes board permissions.

### 4.3 Association Board Member

A student invited by the president to support association operations.

Board members can have different permissions:

- reviewer;
- interviewer;
- board admin;
- member;
- custom permission set.

### 4.4 MIRA Admin

The creator/operator of MIRA.

MIRA admin can:

- invite association presidents;
- manage official onboarding of associations;
- manage future company invitations;
- approve or disable organizations;
- view and correct platform data;
- upload knowledge base documents;
- monitor AI outputs;
- resolve support and authenticity issues.

### 4.5 Company Recruiter

Future user.

A company recruiter uses MIRA to find students through AI matching.

Company account creation must support two paths:

1. **Admin-invited official company representative** for early pilots and important companies.
2. **Self-service registration or request access** for normal companies in the future, with verification before full access.

Companies must not be able to impersonate real organizations.

### 4.6 University Admin

Future user.

Universities can use MIRA for career services, orientation and aggregated analytics.

---

## 5. Platform Clients

### 5.1 Web App

The web app is the main full-featured client for:

- public association pages;
- student onboarding and applications;
- association workspace;
- president dashboard;
- candidate review;
- admin console;
- company recruiting dashboard;
- knowledge base management;
- complex workflows;
- data-heavy views.

Recommended framework:

- Next.js;
- TypeScript;
- Tailwind CSS;
- shadcn/ui or equivalent component system.

### 5.2 Mobile App

The mobile app is a first-class MIRA client for students, association presidents and board members.

The mobile app must support:

- student registration/login;
- email verification continuation;
- association discovery;
- public association pages;
- student onboarding;
- transcript upload;
- association applications;
- application status tracking;
- push notifications;
- role switching;
- president dashboard essentials;
- board member candidate review;
- candidate status changes where permitted;
- interview coordination;
- basic association management actions.

Recommended framework:

- Expo;
- React Native;
- TypeScript;
- shared domain packages with the web app.

### 5.3 Shared Backend

Web and mobile must use the same:

- Supabase project;
- database schema;
- authentication system;
- storage buckets;
- AI service layer;
- server-side business logic;
- permission model.

There must never be separate user databases for web and mobile.

---

## 6. Recommended Technical Stack

### 6.1 Monorepo

Use a monorepo structure.

```text
mira/
  apps/
    web/
    mobile/

  packages/
    ui/
    types/
    supabase/
    ai/
    domain/
    config/

  docs/
    MIRA_MASTER_PRODUCT_SPEC.md
    MIRA_ASSOCIATIONS_FIRST_BUILD.md
    MIRA_DATABASE_SCHEMA.md
    MIRA_AI_SYSTEM.md
    MIRA_DESIGN_SYSTEM.md
    MIRA_SECURITY_PRIVACY.md
    MIRA_ROADMAP.md
```

### 6.2 Web

- Next.js;
- TypeScript;
- Tailwind CSS;
- shadcn/ui or equivalent;
- Server Actions/API routes where appropriate;
- Supabase client/server helpers.

### 6.3 Mobile

- Expo;
- React Native;
- TypeScript;
- shared types and business logic;
- Supabase Auth integration;
- push notifications later.

### 6.4 Backend and Database

- Supabase Postgres;
- Supabase Auth;
- Supabase Storage;
- Supabase Row-Level Security;
- Supabase Edge Functions where useful;
- Supabase Vector/pgvector for knowledge retrieval, or abstraction that allows replacement later.

### 6.5 Hosting and Deployment

- GitHub as source of truth;
- Vercel for web deployment;
- Expo EAS for mobile builds;
- Supabase for backend;
- environment variables for all secrets.

### 6.6 AI Providers

MIRA must use an AI provider abstraction.

Do not hardcode the product to a single provider.

Possible providers:

- OpenAI;
- Anthropic;
- other providers later.

The internal AI layer should expose product-specific functions such as:

- `evaluateApplication()`;
- `parseTranscript()`;
- `summarizeStudentProfile()`;
- `generateAssociationPageDraft()`;
- `analyzeProject()`;
- `matchCandidatesForCompany()`.

### 6.7 Email and Notifications

Recommended:

- Supabase email verification for auth;
- Resend or similar for transactional emails;
- push notifications through Expo for mobile;
- in-app notifications stored in database.

### 6.8 Payments

Future:

- Stripe for company subscriptions;
- future student premium if needed;
- university B2B invoicing outside initial scope.

### 6.9 Analytics and Monitoring

Recommended:

- PostHog or equivalent for product analytics;
- Sentry or equivalent for error monitoring;
- internal audit logs for sensitive actions;
- AI logs for prompt input/output tracking with privacy controls.

---

## 7. Universal Identity and Multi-Role System

### 7.1 Principle

MIRA uses a single-account, multi-role identity system.

A user is always a person first.

The same user can be:

- student;
- association president;
- association admin;
- association reviewer;
- association interviewer;
- association member;
- MIRA admin;
- future company recruiter;
- future university admin.

Roles are additive and context-specific.

### 7.2 Global Roles

Global roles apply across the platform.

Initial global roles:

- `mira_admin`;
- `student`.

Future global roles:

- `company_user`;
- `university_user`.

### 7.3 Association Roles

Association roles apply only inside a specific association workspace.

Initial association roles:

- `association_president`;
- `association_admin`;
- `association_reviewer`;
- `association_interviewer`;
- `association_member`.

The same user can be president of one association and applicant to another.

### 7.4 Role Switcher

Both web and mobile must support role/context switching.

Example:

```text
Current mode: Student
Switch to:
- Student
- President of BSIC
- Reviewer for Finance Club
- MIRA Admin
```

The UI must change based on active context and permissions.

### 7.5 Permissions Over Titles

Roles are templates.

Actual access is controlled by granular permissions.

Example:

- two board members can both have `association_reviewer` role;
- one can view AI evaluations;
- the other can only view answers and add notes.

---

## 8. Authenticity and Invitation System

### 8.1 Why Invitations Matter

MIRA must prevent fake organizations and impersonation.

This is especially important at the beginning, before paid company verification and before the platform has mature trust systems.

### 8.2 MIRA Admin Invites Association Presidents

For the initial association launch, association presidents should not freely create official association accounts without MIRA approval.

MIRA admin can send an official invitation to a verified president.

Flow:

1. MIRA admin opens admin console.
2. MIRA admin creates association invitation.
3. MIRA admin enters president email, association name and optional prefilled data.
4. Invitation is sent by email.
5. President registers or logs in with `@studbocconi.it` email.
6. President verifies email.
7. President accepts invitation.
8. President receives association workspace access.
9. Association profile is official but may remain draft until public page approval.

### 8.3 President Invites Board Members

After the president is onboarded, the president can invite board members.

Board members register as normal MIRA students and receive association membership/permissions.

### 8.4 Future Company Invitations

Company authenticity requires a stronger verification flow.

MIRA must support:

#### Admin-Invited Companies

For pilots, early partners and important companies, MIRA admin can invite a known official representative.

Flow:

1. MIRA admin creates company invitation.
2. MIRA admin selects company and representative email.
3. Representative receives official invitation.
4. Representative signs up with company email.
5. Company account is marked as verified or pending admin confirmation.

#### Company Request Access

Companies can request access by submitting:

- company name;
- website;
- company email domain;
- representative name;
- role/title;
- email;
- recruiting intent.

MIRA admin reviews and approves.

#### Future Self-Service Registration

Normal companies may later register themselves.

However:

- they must verify their email domain;
- they may remain `pending_verification`;
- they cannot contact candidates until verified;
- they may need active subscription/payment to access full features.

### 8.5 Generic Invitation Model

The invitation system should be generic enough to support:

- association president invites;
- association board invites;
- company admin invites;
- company recruiter invites;
- future university admin invites;
- internal MIRA admin invites.

---

## 9. Authentication Requirements

### 9.1 Initial Student Email Domain

For the first build, student registration is restricted to:

```text
@studbocconi.it
```

No student can complete onboarding or apply to associations without verified email.

### 9.2 Email Verification

Registration flow:

1. user enters email;
2. system validates domain when required;
3. system sends email verification link or OTP;
4. user confirms email;
5. user can continue onboarding.

### 9.3 Future Domains

Future universities should be supported through a `university_domains` table.

Example:

```text
studbocconi.it -> Bocconi University
studenti.luiss.it -> Luiss
polimi.it -> Politecnico di Milano
```

### 9.4 Company Email Verification

Future company users should be verified using:

- company email domain;
- admin invite;
- official website domain match;
- manual approval;
- paid subscription status.

---

## 10. Student Product

### 10.1 Student Onboarding

Student onboarding starts during the first association application.

Required initial data:

- verified Bocconi email;
- full name;
- university;
- degree program;
- degree level;
- current year;
- transcript/libretto upload;
- base profile questions;
- interests;
- goals;
- experiences.

### 10.2 Conversational Onboarding

MIRA should ask questions in a human way.

Topics:

- previous experiences;
- academic interests;
- career goals;
- sectors of interest;
- association motivation;
- personal projects;
- what the student enjoys;
- what the student finds boring/frustrating;
- preferred working style;
- availability and commitment;
- languages;
- relevant skills;
- long-term ambitions.

The experience should feel guided, conversational and intelligent, not like a generic form.

### 10.3 Transcript/Libretto Upload

Students upload transcript/libretto.

MIRA extracts:

- university;
- degree program;
- year;
- courses;
- grades;
- credits;
- weighted average when possible;
- academic strengths;
- possible inconsistencies or missing data.

The raw transcript file must be protected.

Associations should see extracted academic information by default. Direct PDF visibility should require explicit permission/settings and student awareness.

### 10.4 Student Profile

The student profile is built over time from:

- onboarding;
- transcript;
- association applications;
- association memberships;
- association projects;
- simulations;
- conversations with MIRA;
- company interactions;
- personal tags;
- AI-generated summaries.

### 10.5 Profile Visibility Levels

Initial visibility levels:

- private to student;
- visible to association for a specific application;
- visible to company in anonymous profile form;
- visible to MIRA admin for support/moderation;
- aggregate anonymized data for future universities.

---

## 11. Association Product

The association product is the first production build.

It includes:

- official president invitations;
- association profile creation;
- public association pages;
- application cycles;
- custom questions;
- student forced onboarding;
- AI candidate evaluation;
- candidate review dashboard;
- mobile candidate review;
- board member invitations;
- permission management;
- status workflow;
- interview coordination;
- project/report upload later;
- analytics later.

Detailed implementation is defined in `MIRA_ASSOCIATIONS_FIRST_BUILD.md`.

---

## 12. Company Product

Future product module.

### 12.1 Company Onboarding

Companies can join through:

- MIRA admin invitation;
- request access;
- future self-service registration with verification;
- future subscription/payment flow.

Company profile includes:

- legal/company name;
- website;
- domain;
- sector;
- size;
- location;
- recruiting needs;
- culture/working style;
- representative users;
- verification status;
- subscription status.

### 12.2 Company Search and Matching

Companies describe what they are looking for in natural language.

MIRA returns candidate matches with:

- anonymous profile;
- fit explanation;
- evidence;
- strengths;
- uncertainties;
- suggested outreach angle.

### 12.3 Anonymous Chat

Companies can open anonymous chats with candidates.

Student sees:

- company identity;
- role;
- why they were selected;
- message;
- recruiter context.

Company does not see student identity until the student chooses to reveal it.

### 12.4 Company Verification and Trust

Company accounts must have statuses:

- `invited`;
- `pending_verification`;
- `verified`;
- `rejected`;
- `suspended`.

Unverified companies cannot access sensitive candidate features.

---

## 13. University Product

Future product module.

Universities may use MIRA for:

- student career orientation;
- career service support;
- aggregated anonymous analytics;
- skill gap analysis;
- employer engagement;
- program-level insights.

University users must not access identifiable student data unless explicit agreements and privacy rules allow it.

---

## 14. AI-First Chat Interface

### 14.1 Desktop

Desktop uses a split-view model where appropriate:

- left side: MIRA conversation;
- right side: active contextual widget;
- widget history/stack available.

### 14.2 Mobile

Mobile uses context swapping:

- chat screen full screen;
- widget opens as full-screen overlay;
- widget can be minimized;
- context remains persistent.

### 14.3 Where Chat Is Required

Chat-centric experience is required for:

- student onboarding;
- orientation;
- profile reflection;
- simulation support;
- company natural-language search;
- AI-assisted exploration.

### 14.4 Where Dashboards Are Allowed

Dashboards are appropriate for:

- association candidate review;
- admin console;
- company recruiting pipeline;
- permission management;
- analytics;
- knowledge base management.

---

## 15. Widget System

MIRA widgets are contextual components shown by AI or selected by users.

Long-term widget types:

- association public page widget;
- active application widget;
- candidate evaluation widget;
- student profile widget;
- transcript summary widget;
- simulation path widget;
- gap analysis widget;
- micro-profession widget;
- master program widget;
- company match widget;
- anonymous chat widget;
- project analysis widget.

Widgets must be persistent, interactive and connected to real database entities.

---

## 16. Simulations

Future module.

### 16.1 Micro-Exercises

Short exercises available on mobile and desktop.

They build habits, calibrate skill level and unlock deeper simulations.

They do not directly update the externally visible company profile as hard evidence.

### 16.2 Deep Simulations

Desktop-only realistic work simulations.

They include:

- brief;
- materials;
- AI support;
- deliverable upload;
- AI feedback;
- profile evidence update.

Deep simulations produce evidence visible in the student profile.

### 16.3 Future Company Simulations

Companies may upload or define simulations specific to their recruiting process.

---

## 17. Surgical Orientation

Future module.

MIRA should connect:

- student academic profile;
- micro-sectors;
- required skills;
- university courses;
- simulations;
- career targets.

The goal is not generic career advice.

The goal is precise guidance such as:

> To pursue Growth Equity, you are missing advanced LBO modelling and scaling-tech valuation exposure. These can be developed through specific courses, simulations and association projects.

This module requires a deep knowledge base of:

- micro-sectors;
- universities;
- courses;
- syllabi;
- career paths;
- skills;
- job market expectations.

---

## 18. Knowledge Base and RAG

### 18.1 Purpose

The knowledge base supports AI modules with reliable internal and external knowledge.

It should power:

- association page creation;
- application evaluation;
- project analysis;
- orientation;
- simulation generation;
- company matching;
- admin support.

### 18.2 Admin Upload

MIRA admin can upload documents directly from MIRA.

Supported sources:

- PDF;
- DOCX;
- TXT;
- CSV;
- Markdown;
- website URL;
- pasted text.

### 18.3 Processing Flow

1. file uploaded through MIRA admin;
2. stored in Supabase Storage;
3. metadata saved in database;
4. text extracted;
5. chunks created;
6. embeddings generated;
7. chunks stored in vector store;
8. document becomes available to AI modules.

### 18.4 Visibility Scopes

Documents can be scoped as:

- `global_mira`;
- `association_specific`;
- `university_specific`;
- `company_specific`;
- `application_cycle_specific`;
- `admin_only`;
- `ai_internal_only`.

---

## 19. AI System Architecture

### 19.1 AI Provider Abstraction

All AI calls must go through an internal AI service layer.

Do not call provider APIs directly from UI components.

Recommended structure:

```text
packages/ai/
  providers/
    openai.ts
    anthropic.ts
  modules/
    applicationEvaluator.ts
    transcriptParser.ts
    profileSummarizer.ts
    associationPageGenerator.ts
    projectAnalyzer.ts
    companyMatcher.ts
  schemas/
    applicationEvaluation.schema.ts
```

### 19.2 AI Modules

Long-term modules:

- `AI_MODULE_STUDENT_ONBOARDING`;
- `AI_MODULE_TRANSCRIPT_PARSER`;
- `AI_MODULE_APPLICATION_EVALUATOR`;
- `AI_MODULE_PROFILE_SUMMARIZER`;
- `AI_MODULE_ASSOCIATION_PAGE_GENERATOR`;
- `AI_MODULE_PROJECT_ANALYZER`;
- `AI_MODULE_COMPANY_MATCHING`;
- `AI_MODULE_ANONYMOUS_CHAT_ASSISTANT`;
- `AI_MODULE_ORIENTATION_ADVISOR`;
- `AI_MODULE_SIMULATION_FEEDBACK`;
- `AI_MODULE_KNOWLEDGE_BASE_QA_ADMIN`.

### 19.3 Structured Outputs

AI outputs must use structured JSON schemas wherever possible.

Every production AI module must define:

- purpose;
- inputs;
- output schema;
- rules;
- failure behavior;
- logging requirements;
- privacy constraints.

### 19.4 AI Logging

AI calls should be logged for debugging, quality and compliance.

Logs must include:

- module;
- provider;
- model;
- input metadata;
- output;
- user/entity context;
- timestamp;
- error status;
- token/cost metadata when available.

Sensitive raw data must be minimized or protected.

### 19.5 No Fabrication Rule

AI must not invent facts.

AI must separate:

- evidence;
- inference;
- uncertainty;
- recommendation.

---

## 20. Database Architecture

### 20.1 Core Tables

Long-term database entities:

```text
profiles
student_profiles
association_profiles
association_memberships
association_invitations
company_profiles
company_memberships
company_invitations
university_profiles

application_cycles
application_questions
applications
application_answers
application_reviews
candidate_ai_evaluations
application_status_events
candidate_internal_notes
interview_invites

uploaded_files
knowledge_documents
knowledge_chunks
ai_logs
audit_logs
notifications

student_transcripts
student_courses
student_skills
student_profile_evidence
student_projects
student_simulations

company_searches
candidate_matches
anonymous_chats
messages
subscriptions
payments
```

### 20.2 Naming Principles

- use snake_case table names;
- use UUID primary keys;
- use `created_at` and `updated_at` on major tables;
- use status enums or constrained text values;
- keep audit tables append-only;
- never store critical permissions only in frontend state.

### 20.3 Future-Proofing

Tables for future modules can be designed early but implemented only when required.

Do not overbuild unused screens, but avoid database decisions that block future modules.

---

## 21. Storage Architecture

Use Supabase Storage.

Recommended buckets:

```text
avatars
association-logos
association-assets
student-transcripts
application-files
association-projects
knowledge-base
company-assets
simulation-materials
simulation-submissions
```

Storage access must be controlled by RLS and signed URLs where appropriate.

Raw student transcripts must be protected.

---

## 22. Security, Privacy and Permissions

### 22.1 Row-Level Security

Supabase RLS must be enabled for tables containing user, association, application, candidate or company data.

### 22.2 Association Isolation

Association users can access only data related to their association and permissions.

They cannot access:

- other associations' candidates;
- private student data outside relevant applications;
- admin data;
- unrelated knowledge base documents;
- company data.

### 22.3 Candidate Privacy

Associations should see data relevant to the specific application.

Default visible candidate data:

- name;
- verified Bocconi email;
- course/degree;
- year;
- onboarding summary;
- application answers;
- transcript summary;
- AI evaluation if permitted.

Raw transcript PDF visibility should be explicitly controlled.

### 22.4 Company Privacy

Future companies must not see student identity until student consent.

### 22.5 Admin Access

MIRA admin has elevated access for operations, but every sensitive action must be logged.

---

## 23. Notifications

Notification channels:

- email;
- in-app notifications;
- mobile push notifications;
- future calendar integration.

Initial notification events:

- email verification;
- president invitation;
- board invitation;
- application submitted;
- application status changed;
- interview invitation;
- application cycle opened;
- application cycle closing soon.

---

## 24. Analytics and Audit Logs

### 24.1 Product Analytics

Track:

- signups;
- onboarding completion;
- transcript upload;
- application starts;
- application submissions;
- candidate review actions;
- AI evaluation usage;
- board invites;
- mobile vs web usage;
- application cycle completion.

### 24.2 Audit Logs

Audit sensitive events:

- role changes;
- permission changes;
- candidate status changes;
- application deletions/edits;
- admin overrides;
- AI evaluation regeneration;
- raw transcript access;
- company verification.

---

## 25. Monetization

### 25.1 Students

Initial:

- free.

Future:

- optional premium features only if they do not damage trust or access.

### 25.2 Associations

Initial:

- free, because associations are growth engine and profile data source.

Future:

- potentially free or institution-funded;
- do not monetize in a way that blocks adoption.

### 25.3 Companies

Future:

- subscription tiers;
- pilot free for first companies;
- paid matching access;
- premium recruiting workflow;
- enterprise custom simulations and analytics.

### 25.4 Universities

Future:

- annual B2B license;
- aggregated analytics;
- career service support;
- orientation tooling.

---

## 26. Roadmap

### Phase 0 — Associations First Build

- Bocconi student auth;
- president invitations;
- public association pages;
- application cycles;
- student onboarding;
- transcript upload;
- custom questions;
- AI candidate evaluation;
- president/board workspace;
- board permissions;
- MIRA admin console;
- mobile requirements respected.

### Phase 1 — Student Profile and Association Evidence

- richer profile;
- association membership evidence;
- project/report upload;
- AI project analysis;
- profile visibility settings.

### Phase 2 — Simulations

- micro-exercises;
- initial simulation paths;
- deep desktop simulations;
- evidence profile updates.

### Phase 3 — Companies

- company invite/verification;
- company profiles;
- AI candidate search;
- anonymous chats;
- pilot recruiting.

### Phase 4 — Surgical Orientation

- academic knowledge base;
- micro-sector mapping;
- course/syllabus extraction;
- gap analysis;
- orientation widgets.

### Phase 5 — Multi-University and Enterprise

- new universities;
- company subscriptions;
- university B2B;
- international expansion.

---

## 27. Build Rules for AI Coding Tools

AI coding tools must follow these rules.

### 27.1 Do Not Build Everything at Once

Read the master spec, then read the current module spec.

Only implement the approved current scope.

### 27.2 Use Production Architecture

Do not create throwaway mock architecture.

Required:

- real Supabase tables;
- real authentication;
- real role/permission checks;
- real storage buckets;
- real AI service abstraction;
- environment variables;
- typed schemas;
- migrations;
- Git commits after stable milestones.

### 27.3 Avoid Hardcoding

Do not hardcode:

- associations;
- users;
- candidates;
- questions;
- AI responses;
- permissions;
- admin status;
- file URLs.

### 27.4 No Fake AI in Production Paths

Mock AI can be used only behind explicit development flags.

Production flow must call the AI abstraction layer or show a clear pending/error state.

### 27.5 Ask for Plan Before Code

Before major implementation, AI coding tools should:

1. inspect the repo;
2. read relevant docs;
3. propose implementation plan;
4. wait for approval;
5. implement in small steps;
6. test each step.

### 27.6 Preserve Future Product Direction

Do not make decisions that block:

- mobile app;
- multi-role identities;
- company module;
- student profiles;
- AI matching;
- knowledge base;
- privacy controls;
- multi-university expansion.

---

## 28. Non-Negotiable Product Constraints

- MIRA is not a prototype.
- The first build is limited, but production-oriented.
- Web and mobile must share backend and identity.
- One person can have multiple roles.
- Association presidents and board members are students too.
- MIRA admin can send official invitations to association presidents.
- Future company authenticity must be protected through invitation, verification and approval flows.
- AI never makes final decisions.
- Raw student files must be protected.
- Permissions must be enforced server-side.
- Admin actions must be logged.
- AI outputs must be structured and auditable.
- The product must be built so a future developer can understand and extend it.

---

## 29. Relationship to Current Implementation Document

For the first production build, use:

```text
MIRA_ASSOCIATIONS_FIRST_BUILD.md
```

That document defines what to build now.

This master specification defines why it must be built in a way that supports the entire future MIRA platform.
