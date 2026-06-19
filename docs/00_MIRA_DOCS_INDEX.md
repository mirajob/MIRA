# MIRA Documentation Index

**Version:** 1.0  
**Date:** 2026-06-15  
**Status:** Complete documentation map for production-oriented development  
**Primary stack:** Next.js, Expo React Native, Supabase, Vercel, GitHub, Claude Code, OpenAI/Anthropic abstraction  

---

## 0. Purpose

This folder is the operating manual for building MIRA as a real product, not as a disposable prototype.

MIRA is a complete AI-first university talent platform. The first production build focuses on university associations, but every implementation decision must remain compatible with the full platform: students, associations, companies, simulations, orientation, mobile app, knowledge base, AI profiles and future university dashboards.

AI coding tools must use this documentation set as the source of truth. They must not invent product logic, data models, permissions, UX flows or AI behavior when a dedicated specification exists.

---

## 1. Documentation Structure

The documentation set is organized by priority and scope.

```text
docs/
  00_MIRA_DOCS_INDEX.md
  01_MIRA_MASTER_PRODUCT_SPEC.md
  02_MIRA_ASSOCIATIONS_FIRST_BUILD.md
  03_MIRA_DATABASE_SCHEMA.md
  04_MIRA_USER_FLOWS.md
  05_MIRA_UI_UX_SPEC.md
  06_MIRA_AI_SYSTEM.md
  07_MIRA_SECURITY_PRIVACY.md
  08_MIRA_IMPLEMENTATION_PLAN.md
  09_MIRA_COMPANIES_MODULE_SPEC.md
  10_MIRA_SIMULATIONS_MODULE_SPEC.md
  11_MIRA_ORIENTATION_MODULE_SPEC.md
  12_MIRA_STUDENT_PROFILE_MODULE_SPEC.md
  13_MIRA_MOBILE_APP_SPEC.md
  14_MIRA_KNOWLEDGE_BASE_RAG_SPEC.md
```

---

## 2. Document Roles

### `00_MIRA_DOCS_INDEX.md`

Use this file first. It explains which documents to read for each development task, how conflicts should be resolved and what AI coding tools are allowed to build.

### `01_MIRA_MASTER_PRODUCT_SPEC.md`

Global product source of truth. Defines the complete MIRA vision, long-term architecture, modules, user types, web/mobile strategy, product principles and constraints.

Use it when making any architectural decision.

### `02_MIRA_ASSOCIATIONS_FIRST_BUILD.md`

First production build specification. Defines the first vertical slice: verified Bocconi students, association president invitations, public association pages, application cycles, custom questions, student onboarding, transcript upload, candidate review, AI evaluation, board permissions, web/mobile support and admin tools.

Use it for all work related to the initial September associations launch.

### `03_MIRA_DATABASE_SCHEMA.md`

Supabase Postgres schema blueprint. Defines tables, relationships, enums, storage buckets, security policies, migration order and seed data.

Use it before creating migrations, API routes, server actions or Supabase queries.

### `04_MIRA_USER_FLOWS.md`

Step-by-step product flows. Defines how students, presidents, board members, MIRA admins, future company recruiters and future university admins move through the product.

Use it before building routes, screens and actions.

### `05_MIRA_UI_UX_SPEC.md`

Web and mobile interface blueprint. Defines navigation, layouts, role switcher, pages, components, empty states, loading states, mobile behavior and operational dashboards.

Use it before building UI components.

### `06_MIRA_AI_SYSTEM.md`

AI architecture specification. Defines provider abstraction, AI modules, prompts, JSON schemas, logging, fallback behavior, safety rules and privacy constraints.

Use it before implementing any AI feature.

### `07_MIRA_SECURITY_PRIVACY.md`

Security, privacy and access-control blueprint. Defines who can see what, consent rules, transcript visibility, company anonymity, AI logs, admin access, audit logs and RLS principles.

Use it before implementing any sensitive feature.

### `08_MIRA_IMPLEMENTATION_PLAN.md`

Practical build sequence. Defines the recommended sprint order, tasks, acceptance criteria, testing checkpoints and no-go rules.

Use it to control Claude Code or any AI coding tool during development.

### `09_MIRA_COMPANIES_MODULE_SPEC.md`

Future companies and recruiting module specification. Defines company verification, recruiter UX, anonymous student profiles, matching, chat, consent, hiring pipeline, pricing and abuse prevention.

Use it when starting company-side development.

### `10_MIRA_SIMULATIONS_MODULE_SPEC.md`

Future simulations module specification. Defines micro-exercises, deep simulations, task formats, catalog, rubrics, AI tutor limitations, scoring and profile evidence.

Use it when starting simulation development.

### `11_MIRA_ORIENTATION_MODULE_SPEC.md`

Future surgical orientation module specification. Defines career paths, micro-sectors, skill taxonomy, academic mapping, course ingestion, gap analysis, widgets and recommendation logic.

Use it when starting orientation development.

### `12_MIRA_STUDENT_PROFILE_MODULE_SPEC.md`

Student profile architecture specification. Defines the evidence graph, profile visibility, AI summaries, skills, personal tags, student control, anonymous profile and profile update rules.

Use it before changing profile logic.

### `13_MIRA_MOBILE_APP_SPEC.md`

Mobile app specification. Defines Expo/React Native structure, app modes, mobile navigation, student flows, association president/board flows, notifications and mobile-specific constraints.

Use it before building the native app.

### `14_MIRA_KNOWLEDGE_BASE_RAG_SPEC.md`

Knowledge base and RAG specification. Defines document upload, parsing, chunking, embeddings, scopes, retrieval, reprocessing, versioning and how AI modules use knowledge.

Use it before implementing document ingestion or retrieval-augmented generation.

---

## 3. Conflict Resolution Rules

If two documents appear to conflict, apply this order:

1. Security and privacy constraints always win.
2. The database schema wins for data structure and relationships.
3. The specific module document wins for module-level behavior.
4. The associations first build document wins for the initial build scope.
5. The master product spec wins for long-term architecture and product principles.
6. The implementation plan wins for development order, not for product behavior.
7. The UI/UX spec wins for interface behavior when it does not conflict with security or product logic.

When conflict remains unresolved, the AI coding tool must stop and ask the founder before writing code.

---

## 4. Approved Technology Stack

MIRA should be built with the following stack unless the founder explicitly changes this decision.

```text
Web app: Next.js with TypeScript
Mobile app: Expo / React Native with TypeScript
Database: Supabase Postgres
Auth: Supabase Auth
File storage: Supabase Storage
Vector/RAG: Supabase pgvector / Supabase Vector
Hosting web: Vercel
Repository and version control: GitHub
AI coding assistant: Claude Code
Product AI: OpenAI and/or Anthropic behind provider abstraction
Email: Resend or equivalent transactional email service
Analytics: PostHog or equivalent product analytics
Error monitoring: Sentry or equivalent
Payments: Stripe, future phase
```

SQL in these documents refers to Supabase Postgres migrations. It is not a separate service.

---

## 5. Build Philosophy

MIRA must be built as a production-oriented product from day one.

Do:

- use real authentication;
- use real Supabase tables;
- use migrations;
- use role-based access;
- use storage policies;
- use environment variables;
- use typed TypeScript models;
- use server-side authorization;
- implement audit logs for sensitive actions;
- create AI service modules instead of prompt logic in UI components;
- commit after stable milestones.

Do not:

- build throwaway prototype logic;
- hardcode users, associations, companies or permissions;
- create fake AI responses as production behavior;
- create one-off pages disconnected from the database;
- create separate backends for web and mobile;
- bypass Supabase Auth;
- expose raw transcript files without explicit permission;
- allow companies to view student identity without consent;
- let AI make final admissions or hiring decisions.

---

## 6. What to Read Before Each Task

### Initial project setup

Read:

- `01_MIRA_MASTER_PRODUCT_SPEC.md`
- `03_MIRA_DATABASE_SCHEMA.md`
- `08_MIRA_IMPLEMENTATION_PLAN.md`
- `13_MIRA_MOBILE_APP_SPEC.md`

### Associations first build

Read:

- `01_MIRA_MASTER_PRODUCT_SPEC.md`
- `02_MIRA_ASSOCIATIONS_FIRST_BUILD.md`
- `03_MIRA_DATABASE_SCHEMA.md`
- `04_MIRA_USER_FLOWS.md`
- `05_MIRA_UI_UX_SPEC.md`
- `06_MIRA_AI_SYSTEM.md`
- `07_MIRA_SECURITY_PRIVACY.md`
- `08_MIRA_IMPLEMENTATION_PLAN.md`

### Authentication and roles

Read:

- `01_MIRA_MASTER_PRODUCT_SPEC.md`
- `02_MIRA_ASSOCIATIONS_FIRST_BUILD.md`
- `03_MIRA_DATABASE_SCHEMA.md`
- `04_MIRA_USER_FLOWS.md`
- `07_MIRA_SECURITY_PRIVACY.md`

### Student onboarding and profile

Read:

- `01_MIRA_MASTER_PRODUCT_SPEC.md`
- `04_MIRA_USER_FLOWS.md`
- `05_MIRA_UI_UX_SPEC.md`
- `06_MIRA_AI_SYSTEM.md`
- `07_MIRA_SECURITY_PRIVACY.md`
- `12_MIRA_STUDENT_PROFILE_MODULE_SPEC.md`

### AI candidate evaluation

Read:

- `02_MIRA_ASSOCIATIONS_FIRST_BUILD.md`
- `03_MIRA_DATABASE_SCHEMA.md`
- `06_MIRA_AI_SYSTEM.md`
- `07_MIRA_SECURITY_PRIVACY.md`
- `14_MIRA_KNOWLEDGE_BASE_RAG_SPEC.md`

### Mobile app

Read:

- `01_MIRA_MASTER_PRODUCT_SPEC.md`
- `02_MIRA_ASSOCIATIONS_FIRST_BUILD.md`
- `04_MIRA_USER_FLOWS.md`
- `05_MIRA_UI_UX_SPEC.md`
- `07_MIRA_SECURITY_PRIVACY.md`
- `13_MIRA_MOBILE_APP_SPEC.md`

### Companies module

Read:

- `01_MIRA_MASTER_PRODUCT_SPEC.md`
- `03_MIRA_DATABASE_SCHEMA.md`
- `06_MIRA_AI_SYSTEM.md`
- `07_MIRA_SECURITY_PRIVACY.md`
- `09_MIRA_COMPANIES_MODULE_SPEC.md`
- `12_MIRA_STUDENT_PROFILE_MODULE_SPEC.md`

### Simulations module

Read:

- `01_MIRA_MASTER_PRODUCT_SPEC.md`
- `03_MIRA_DATABASE_SCHEMA.md`
- `06_MIRA_AI_SYSTEM.md`
- `07_MIRA_SECURITY_PRIVACY.md`
- `10_MIRA_SIMULATIONS_MODULE_SPEC.md`
- `12_MIRA_STUDENT_PROFILE_MODULE_SPEC.md`

### Orientation module

Read:

- `01_MIRA_MASTER_PRODUCT_SPEC.md`
- `03_MIRA_DATABASE_SCHEMA.md`
- `06_MIRA_AI_SYSTEM.md`
- `11_MIRA_ORIENTATION_MODULE_SPEC.md`
- `14_MIRA_KNOWLEDGE_BASE_RAG_SPEC.md`

---

## 7. Claude Code Operating Prompt

Use this prompt when starting a new development session:

```text
You are working on MIRA, a production-oriented AI-first university talent platform.

First read the following docs:
- docs/00_MIRA_DOCS_INDEX.md
- docs/01_MIRA_MASTER_PRODUCT_SPEC.md
- docs/02_MIRA_ASSOCIATIONS_FIRST_BUILD.md
- docs/03_MIRA_DATABASE_SCHEMA.md
- docs/04_MIRA_USER_FLOWS.md
- docs/05_MIRA_UI_UX_SPEC.md
- docs/06_MIRA_AI_SYSTEM.md
- docs/07_MIRA_SECURITY_PRIVACY.md
- docs/08_MIRA_IMPLEMENTATION_PLAN.md

Do not build the entire MIRA vision now.
Build only the approved current scope from the implementation plan.

Before writing code:
1. inspect the repository structure;
2. identify relevant existing files;
3. propose a step-by-step implementation plan;
4. list database changes required;
5. list security implications;
6. wait for approval.

Do not create prototype-only logic.
Do not hardcode production data.
Do not bypass Supabase Auth or RLS.
Do not put AI prompts inside UI components.
Do not expose private student data.
```

---

## 8. Documentation Versioning

When a product decision changes, update the relevant module document first, then update cross-cutting documents if required.

Examples:

- A new association permission requires updates to database, security, user flows and UI.
- A new AI output field requires updates to AI system, database and UI.
- A new company visibility rule requires updates to companies module, security and student profile spec.

Never rely on undocumented decisions.

---

## 9. Current Build Priority

The first build priority is:

```text
Production Associations Build
```

This includes:

- Bocconi student registration with `@studbocconi.it` validation;
- email verification;
- MIRA admin invitation of association presidents;
- official association creation;
- association public pages;
- president and board member roles;
- board invitations and permissions;
- student forced onboarding;
- transcript upload;
- application cycles;
- custom questions;
- candidate dashboard;
- AI candidate evaluation;
- candidate status workflow;
- interview invitation;
- admin knowledge base upload;
- web support;
- mobile support for students, presidents and board members.

The first build must be limited in scope but not prototype-grade.

