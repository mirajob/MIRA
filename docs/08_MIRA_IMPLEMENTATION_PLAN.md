# MIRA Implementation Plan

**Version:** 1.0  
**Date:** 2026-06-15  
**Status:** Practical development sequence for production build  
**Primary stack:** Next.js, Expo React Native, Supabase, Vercel, GitHub, Claude Code  

---

## 0. Purpose

This document defines how to build MIRA in a controlled, production-oriented sequence.

The first implementation target is the Associations Build. The platform must be architected for the complete MIRA product, but the development sequence must avoid building too many modules at once.

This plan is designed to guide AI coding tools. Claude Code or any other coding agent must not start implementing a feature before identifying the relevant sprint, reading the referenced documents and proposing a small implementation plan.

---

## 1. Build Principles

### 1.1 Production First

The first version can be narrow in scope, but it must not be a throwaway prototype.

Required from the start:

- real authentication;
- real database;
- real file storage;
- real role model;
- real permission model;
- real environment variables;
- migration-based database changes;
- audit logs for sensitive actions;
- AI service abstraction;
- mobile-compatible backend.

### 1.2 One Platform, Multiple Clients

MIRA should be implemented as one platform with multiple clients:

```text
MIRA Platform
  apps/web       Next.js
  apps/mobile    Expo React Native
  packages/*     shared types, UI, domain logic, AI, Supabase helpers
  supabase/*     migrations, policies, seed data
```

The web app and mobile app must share:

- authentication;
- database;
- AI service layer;
- file storage;
- role model;
- permissions;
- user profile model;
- notification model.

### 1.3 Small Iterations

Each development task should be small enough to review.

Bad task:

```text
Build the association module.
```

Good task:

```text
Create Supabase tables and RLS policies for association invitations, then build the MIRA admin screen to invite an association president.
```

### 1.4 Plan Before Code

Before writing code, the AI coding tool must:

1. inspect the repo;
2. identify relevant docs;
3. list files likely to change;
4. list database changes;
5. list security implications;
6. propose a sequence;
7. wait for approval.

---

## 2. Recommended Repository Structure

```text
mira/
  apps/
    web/
      src/
        app/
        components/
        lib/
        actions/
        middleware.ts
      public/
      package.json

    mobile/
      app/
      src/
        screens/
        components/
        navigation/
        lib/
      app.json
      package.json

  packages/
    types/
      src/
        database.ts
        domain.ts
        api.ts

    ui/
      src/
        components/
        tokens/

    supabase/
      src/
        client.ts
        server.ts
        auth.ts
        queries/

    ai/
      src/
        index.ts
        providers/
        modules/
        schemas/
        prompts/
        logging.ts

    domain/
      src/
        users/
        associations/
        applications/
        companies/
        simulations/
        profiles/
        permissions/

    config/
      src/
        env.ts
        constants.ts

  supabase/
    migrations/
    seed.sql
    policies/

  docs/
    *.md

  package.json
  turbo.json
  tsconfig.base.json
  .env.example
```

Recommended package manager: `pnpm`.

Recommended monorepo tool: Turborepo or plain workspaces. Do not over-engineer if the initial build is simpler, but do not create a structure that blocks mobile app integration later.

---

## 3. Environment Variables

Create `.env.example` with at least:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=

OPENAI_API_KEY=
ANTHROPIC_API_KEY=
AI_DEFAULT_PROVIDER=
AI_DEFAULT_MODEL=

RESEND_API_KEY=
EMAIL_FROM=

NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_MOBILE_DEEP_LINK_SCHEME=mira

POSTHOG_KEY=
POSTHOG_HOST=
SENTRY_DSN=

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

Rules:

- service role key must never be exposed to frontend or mobile;
- AI keys must only be used server-side;
- mobile must use public anon key plus RLS, never service role;
- local development and production must use separate Supabase projects.

---

## 4. Phase 0: Documentation and Project Setup

### Goal

Create the repository and baseline project structure.

### Tasks

1. Create GitHub private repository.
2. Create monorepo folder structure.
3. Add documentation files to `/docs`.
4. Create Next.js web app.
5. Create Expo mobile app shell or placeholder folder.
6. Create shared packages.
7. Configure TypeScript.
8. Configure linting and formatting.
9. Create `.env.example`.
10. Create first README with local setup steps.

### Acceptance Criteria

- Repository builds locally.
- Web app runs at `localhost:3000`.
- Mobile app can be started or the app folder is ready for later Expo setup.
- Docs are committed.
- Environment variables are documented.
- No product logic is hardcoded.

### Do Not Build Yet

- association features;
- AI features;
- company features;
- simulations;
- payments.

---

## 5. Phase 1: Supabase Foundation

### Goal

Set up database, authentication, storage and first migrations.

### Tasks

1. Create Supabase project.
2. Configure Supabase Auth with email verification.
3. Create database enums.
4. Create core tables:
   - `profiles`;
   - `student_profiles`;
   - `global_roles` or equivalent;
   - `audit_logs`;
   - `uploaded_files`;
   - `notifications`.
5. Create association tables:
   - `association_profiles`;
   - `association_memberships`;
   - `association_invitations`.
6. Create storage buckets:
   - `transcripts`;
   - `association-assets`;
   - `application-files`;
   - `knowledge-base`.
7. Add RLS policies.
8. Create seed data for one MIRA admin account placeholder.

### Acceptance Criteria

- User can sign up and verify email.
- A profile row is created after sign-up.
- `@studbocconi.it` validation is enforced for student access.
- MIRA admin role can be assigned manually for the founder.
- RLS prevents normal users from reading other users' private data.
- Storage buckets exist with policies.

### Tests

- unauthenticated user cannot read private tables;
- student cannot access admin tables;
- non-Bocconi email cannot access student onboarding;
- service role operations are server-only.

---

## 6. Phase 2: Authentication, Profiles and Role Switcher

### Goal

Create the first usable identity experience.

### Web Tasks

1. Build login page.
2. Build sign-up page.
3. Enforce `@studbocconi.it` for student registration.
4. Build email verification status page.
5. Build account/profile page.
6. Build role switcher.
7. Build protected route middleware.
8. Build basic student home.
9. Build basic admin home.

### Mobile Tasks

1. Create mobile authentication screens or mobile auth shell.
2. Create role switcher mobile pattern.
3. Ensure mobile can consume the same Supabase session model.

### Acceptance Criteria

- A Bocconi student can register, verify email and access Student Mode.
- A MIRA admin can access Admin Mode.
- User context is consistent across web and mobile.
- Role switcher only shows roles the user actually has.

---

## 7. Phase 3: MIRA Admin Invitations for Association Presidents

### Goal

Allow MIRA admin to invite official association presidents.

### Tasks

1. Build `/admin` protected shell.
2. Build `/admin/associations` list.
3. Build `/admin/invitations`.
4. Create association president invitation action.
5. Send invitation email.
6. Accept invitation page.
7. Create association draft after invitation acceptance.
8. Assign invited user association president role.
9. Add audit logs.

### Acceptance Criteria

- Only MIRA admin can invite association presidents.
- Invitation is linked to a specific email.
- Invited president must verify email before activating role.
- President receives full permissions for that association.
- Invitation has expiration and status.
- Duplicate active invitations are prevented.

### Security Tests

- non-admin cannot create president invitation;
- invite token cannot be reused;
- user cannot accept invitation for a different email;
- expired invitation cannot be accepted.

---

## 8. Phase 4: Association Public Page and Workspace

### Goal

Allow invited presidents to create and manage association pages.

### Tasks

1. Build association workspace shell.
2. Build association page editor.
3. Support logo upload.
4. Support website/social links.
5. Support category, sectors, description, recruiting timeline.
6. Add public/draft/disabled states.
7. Build public association page route.
8. Add MIRA admin approval or review flow.
9. Add optional AI-generated page draft from website link.

### Acceptance Criteria

- President can edit own association only.
- Public page is visible only after publish/approval rules are satisfied.
- Logo is stored in Supabase Storage.
- Association page has stable slug.
- MIRA admin can correct or disable page.

---

## 9. Phase 5: Board Invitations and Permissions

### Goal

Allow presidents to invite board members and manage permissions.

### Tasks

1. Build board management page.
2. Create board invitation flow.
3. Send invitation email.
4. Accept invitation flow.
5. Add role templates:
   - president;
   - vice_president;
   - board_admin;
   - reviewer;
   - interviewer;
   - member.
6. Add granular permissions.
7. Build permission editor.
8. Add audit logs.
9. Expose board mode in role switcher.

### Acceptance Criteria

- President can invite members with `@studbocconi.it` email.
- Invited user becomes both MIRA student and association member.
- Permissions determine what the board member sees.
- President always has all permissions.
- MIRA admin can override only for support/security.

---

## 10. Phase 6: Student Onboarding and Transcript Upload

### Goal

Create the required onboarding before application submission.

### Tasks

1. Build onboarding shell.
2. Collect degree program, degree level, current year.
3. Build transcript/libretto upload.
4. Store transcript file in Supabase Storage.
5. Create `student_transcripts` or uploaded file record.
6. Implement basic transcript parser AI service or manual summary fallback.
7. Build conversational onboarding questions.
8. Save onboarding answers.
9. Generate basic student profile summary.
10. Mark onboarding completed.

### Acceptance Criteria

- Student cannot submit application before required onboarding.
- Transcript is uploaded securely.
- Student can see uploaded transcript status.
- Transcript visibility is controlled by permission/consent.
- Onboarding data updates `student_profiles`.

### Do Not Overbuild

- no full orientation engine yet;
- no full profile evidence graph yet;
- no simulations yet.

---

## 11. Phase 7: Application Cycles and Custom Questions

### Goal

Allow associations to open application cycles with custom questions.

### Tasks

1. Build application cycle manager.
2. Create draft/open/closed/archived status.
3. Build question builder.
4. Support question types:
   - short text;
   - long text;
   - multiple choice;
   - checkbox;
   - file upload;
   - role/team preference;
   - availability;
   - rating scale.
5. Add required/optional flags.
6. Add question ordering.
7. Add preview page.
8. Add publish flow.

### Acceptance Criteria

- Only authorized association users can create cycles.
- Open cycles appear on public association page.
- Closed cycles reject new submissions.
- Question changes after publishing are controlled and audited.

---

## 12. Phase 8: Student Application Submission

### Goal

Allow students to apply to an association cycle.

### Tasks

1. Build `/associations/[slug]/apply`.
2. Check authentication.
3. Check email verification.
4. Check onboarding completion.
5. Load application questions.
6. Save draft answers.
7. Support file upload answers.
8. Submit application.
9. Lock submitted answers or version edits.
10. Show application status page.
11. Send confirmation email/notification.

### Acceptance Criteria

- Student can apply only once per application cycle unless explicitly allowed.
- Student can save draft.
- Submitted application appears in association dashboard.
- Student sees status updates.
- Application creates audit event.

---

## 13. Phase 9: Candidate Review Dashboard

### Goal

Allow president and permitted board members to review candidates.

### Web Tasks

1. Build candidate list table.
2. Add filters:
   - status;
   - degree program;
   - year;
   - role preference;
   - AI fit category;
   - reviewer assignment.
3. Build candidate detail view.
4. Show application answers.
5. Show course/year and basic academic profile.
6. Show candidate status timeline.
7. Add internal notes.
8. Add status change actions.
9. Add permission-aware UI.

### Mobile Tasks

1. Build candidate list mobile.
2. Build candidate detail mobile.
3. Add quick status update if permitted.
4. Add notes and interview actions.

### Acceptance Criteria

- Board members see only what their permissions allow.
- Candidate data is isolated by association.
- Status changes create audit logs.
- Student receives notification when relevant status changes.

---

## 14. Phase 10: AI Candidate Evaluation

### Goal

Generate structured AI evaluations for applications.

### Tasks

1. Implement `evaluateApplication()` in AI package.
2. Define JSON schema.
3. Create server action/API endpoint.
4. Create evaluation job trigger after submission.
5. Store input snapshot and structured output.
6. Show evaluation panel in candidate detail view.
7. Add regenerate evaluation action for authorized users/admin.
8. Add AI logs.
9. Add error/fallback state.

### Acceptance Criteria

- AI evaluation returns structured JSON.
- AI never makes final decision.
- Board sees evidence, strengths, gaps, recommendation and confidence.
- Evaluation is traceable to input snapshot.
- Sensitive data usage follows security spec.

---

## 15. Phase 11: Interview Workflow and Notifications

### Goal

Allow associations to invite candidates to interviews.

### Tasks

1. Create interview invite table/actions.
2. Build interview invite modal.
3. Support proposed times.
4. Support location or video link.
5. Send email notification.
6. Send in-app notification.
7. Let candidate accept/select time.
8. Add interview status to application timeline.
9. Build mobile notification flow.

### Acceptance Criteria

- Only permitted users can send interview invites.
- Candidate receives clear instructions.
- Interview action updates application status if configured.
- Audit log records invite and response.

---

## 16. Phase 12: Admin Knowledge Base Upload

### Goal

Allow founder/admin to upload documents into MIRA knowledge base from the app.

### Tasks

1. Build `/admin/knowledge-base`.
2. Support file upload.
3. Support pasted text.
4. Support website URL record.
5. Store file in Supabase Storage.
6. Create `knowledge_documents` record.
7. Implement text extraction pipeline placeholder.
8. Implement chunk table.
9. Add embeddings when API is configured.
10. Add processing status.
11. Add reprocess action.

### Acceptance Criteria

- Admin can upload without opening Supabase manually.
- Document has metadata and scope.
- Processing status is visible.
- Failed processing can be retried.
- Knowledge documents are not visible to unauthorized users.

---

## 17. Phase 13: Mobile App First Functional Release

### Goal

Create a usable mobile app for students, presidents and board members.

### Tasks

1. Complete Expo setup.
2. Implement auth.
3. Implement Student Mode home.
4. Implement association discovery/public pages.
5. Implement application status tracking.
6. Implement Association Mode home.
7. Implement candidate list/detail for board users.
8. Implement push notification setup placeholder.
9. Implement role switcher.
10. Test deep links for invitation and application flows.

### Acceptance Criteria

- Student can log in from mobile.
- President/board member can switch to association mode.
- Board can review candidates from mobile.
- Critical actions are protected by same backend permissions.
- Mobile app uses same Supabase backend.

---

## 18. Phase 14: Stabilization and Internal Pilot

### Goal

Prepare for real association usage.

### Tasks

1. End-to-end testing.
2. Security testing.
3. RLS verification.
4. Permission matrix testing.
5. AI evaluation quality review.
6. UX copy pass.
7. Mobile responsive testing.
8. Bug fixing.
9. Create founder/admin operating guide.
10. Create association onboarding guide.
11. Create data backup procedure.

### Acceptance Criteria

- One real association can be onboarded.
- One real application cycle can be run.
- Students can apply without admin intervention.
- Board can review candidates.
- Admin can solve common issues.
- No known critical privacy/security bug remains.

---

## 19. Future Product Phases

After associations are stable, continue in this order:

### Phase A: Student Profile Deepening

- evidence graph;
- AI profile summaries;
- visibility controls;
- association membership evidence;
- project evidence.

Reference: `12_MIRA_STUDENT_PROFILE_MODULE_SPEC.md`.

### Phase B: Association Project Analysis

- project/report upload;
- contributor attribution;
- AI skill extraction;
- profile evidence creation.

Reference: `14_MIRA_KNOWLEDGE_BASE_RAG_SPEC.md` and `12_MIRA_STUDENT_PROFILE_MODULE_SPEC.md`.

### Phase C: Companies Module Pilot

- company verification;
- recruiter dashboard;
- AI matching;
- anonymous profiles;
- student consent;
- chat.

Reference: `09_MIRA_COMPANIES_MODULE_SPEC.md`.

### Phase D: Simulations

- micro-exercises;
- deep simulations;
- scoring rubrics;
- profile evidence.

Reference: `10_MIRA_SIMULATIONS_MODULE_SPEC.md`.

### Phase E: Surgical Orientation

- career path taxonomy;
- academic mapping;
- gap analysis;
- widgets.

Reference: `11_MIRA_ORIENTATION_MODULE_SPEC.md`.

### Phase F: University Dashboard

- aggregated analytics;
- orientation support;
- B2B licensing.

Reference: master product spec and future dedicated university spec.

---

## 20. Definition of Done

A feature is done only when:

- product behavior matches specs;
- database migrations are committed;
- RLS/security rules are considered;
- UI includes loading, empty and error states;
- mobile impact is considered;
- AI behavior is structured and logged if relevant;
- sensitive actions are audited;
- tests or manual test steps are documented;
- environment variables are documented if changed;
- no unrelated features were added.

---

## 21. Commit Strategy

Recommended commits:

```text
chore: initialize monorepo
feat(auth): add Supabase auth and profile creation
feat(admin): add president invitation flow
feat(associations): add association public page editor
feat(associations): add board invitations and permissions
feat(students): add onboarding and transcript upload
feat(applications): add application cycles and questions
feat(applications): add candidate dashboard
feat(ai): add structured candidate evaluation
feat(mobile): add association review mobile screens
```

Commit after each stable, testable milestone.

---

## 22. AI Coding Tool No-Go Rules

Claude Code or any AI coding tool must stop and ask before:

- changing the database schema in a way not described in docs;
- adding a new service;
- weakening a security rule;
- exposing private data;
- making AI decisions automatic;
- building company, simulation or orientation features during associations sprint;
- replacing Supabase with another backend;
- creating a separate mobile backend;
- adding payment logic before pricing is specified;
- generating large unrelated refactors.

---

## 23. First Session Prompt for Claude Code

```text
Read docs/00_MIRA_DOCS_INDEX.md and docs/08_MIRA_IMPLEMENTATION_PLAN.md.
Then read the documents required for Phase 0 and Phase 1.

Do not build the entire product.
We are starting with the production Associations Build.

First inspect the repository and tell me:
1. current project structure;
2. missing setup pieces;
3. recommended first implementation step;
4. files you expect to create or modify;
5. database changes required;
6. risks or clarifying questions.

Wait for my approval before writing code.
```
