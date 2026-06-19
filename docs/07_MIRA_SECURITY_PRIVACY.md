# MIRA Security and Privacy Specification

**Version:** 1.0  
**Date:** 2026-06-15  
**Status:** Security, privacy and access-control blueprint  

---

## 0. Purpose

MIRA handles sensitive student, academic, association and future recruiting data.

This document defines who can access what, how permissions work, how raw files are protected, how AI logs are handled and which actions must be audited.

This is not legal advice. Before full production launch, MIRA should receive proper legal/privacy review. This document is the product and engineering privacy specification.

---

## 1. Core Security Principles

### 1.1 Default Private

Sensitive data is private by default.

Public data must be explicitly public.

### 1.2 Least Privilege

Users should access only the minimum data required for their role and task.

### 1.3 Server-Side Authorization

Frontend checks are not sufficient.

Every sensitive read/write must be protected server-side and by Supabase Row-Level Security where applicable.

### 1.4 Audit Sensitive Actions

Sensitive actions must create audit logs.

Examples:

- role changes;
- permission changes;
- candidate status changes;
- raw transcript access;
- admin overrides;
- AI evaluation regeneration;
- company verification;
- identity reveal.

### 1.5 AI Is Not a Privacy Escape Hatch

If a human user is not allowed to access data, an AI module invoked by that user must not access that data either.

---

## 2. Identity and Authentication

### 2.1 Supabase Auth

Use Supabase Auth as the authentication system.

Every authenticated user maps to one row in `profiles`.

### 2.2 Bocconi Student Domain Rule

For first build, student ecosystem access requires verified email ending in:

```text
@studbocconi.it
```

This applies to:

- student applicants;
- association presidents;
- board members;
- association members.

### 2.3 Email Verification Required

Users cannot apply, accept official roles or access sensitive workspaces until email is verified.

### 2.4 Multi-Role Identity

A user can hold multiple roles. Access is determined by:

- global role assignment;
- association membership;
- company membership future;
- permission keys;
- entity context;
- explicit consent.

---

## 3. Role and Permission Model

### 3.1 Global Roles

Initial:

- `student`;
- `mira_admin`.

Future:

- `company_user`;
- `university_user`.

### 3.2 Association Roles

- `association_president`;
- `association_admin`;
- `association_reviewer`;
- `association_interviewer`;
- `association_member`.

Roles are templates. Permissions decide actual access.

### 3.3 Association Permission Keys

Initial permission keys:

```text
manage_association_profile
manage_public_page
manage_application_cycles
manage_application_questions
publish_application_cycle
close_application_cycle
view_candidates
view_candidate_answers
view_candidate_academic_profile
view_raw_transcript
view_candidate_ai_evaluation
add_internal_candidate_notes
change_candidate_status
send_interview_invites
manage_interview_slots
view_board_members
invite_board_members
manage_board_permissions
upload_association_projects
view_association_analytics
export_candidate_data
contact_candidates
```

President always has all association permissions for that association.

### 3.4 MIRA Admin

MIRA Admin has elevated operational power but not unlimited silent power.

Admin access must be:

- restricted;
- hidden from normal navigation;
- protected by role checks;
- audited for sensitive actions.

---

## 4. Data Visibility Matrix

### 4.1 Public Visitor

Can see:

- landing page;
- published association pages;
- public association application status;
- future public company pages if created.

Cannot see:

- student profiles;
- applications;
- board members unless public;
- raw files;
- admin data;
- AI evaluations.

### 4.2 Student

Can see:

- own profile;
- own transcript summary;
- own raw transcript file;
- own applications;
- own application statuses;
- public association pages;
- future company chats involving them;
- future simulation results;
- own profile evidence.

Cannot see:

- other student applications;
- association internal notes;
- internal AI candidate evaluation unless explicitly exposed by product;
- board dashboards;
- admin logs;
- company matching data before contact.

### 4.3 Association President

Can see for own association:

- association profile;
- board members;
- application cycles;
- candidates;
- application answers;
- academic summary;
- AI evaluation;
- internal notes;
- status history;
- interviews;
- permissions;
- analytics.

Cannot see:

- other associations' candidates;
- unrelated private student data;
- raw transcripts unless setting and consent allow;
- MIRA admin logs unrelated to association;
- future company data.

### 4.4 Association Board Member

Can see only what permissions allow.

Examples:

- reviewer basic: candidate answers and summary;
- reviewer AI: candidate answers plus AI evaluation;
- interviewer: interview details and candidate basics;
- member: no candidate access by default.

### 4.5 MIRA Admin

Can see broad data for operations, support, moderation and correction.

Admin access to sensitive data must be logged.

### 4.6 Future Company Recruiter

Can see only after company verification and permissions:

- own company profile;
- own company searches;
- anonymous candidate profiles produced by matching;
- anonymous chats;
- identified student information only after explicit student reveal.

Cannot see:

- student identity before reveal;
- raw transcript;
- private student notes;
- association internal reviews;
- other companies' data.

### 4.7 Future University Admin

Can see:

- aggregated anonymous analytics;
- program-level insights;
- cohort-level patterns;
- career service metrics.

Cannot see identifiable student data unless future legal/product agreement explicitly allows it.

---

## 5. Transcript Privacy

### 5.1 Raw Transcript File

Raw transcript/libretto is sensitive.

Default access:

- student owner;
- MIRA admin for support/moderation;
- processing service;
- no direct association access by default.

### 5.2 Transcript Summary

Associations can see extracted academic profile if the student submits an application.

Visible fields by default:

- degree program;
- degree level;
- current year;
- extracted course summary;
- weighted average if product chooses to display it;
- transcript parsing confidence/warnings if relevant.

### 5.3 Raw Transcript Access by Association

Raw PDF access should be disabled by default.

It can be enabled only if:

1. application cycle explicitly requires raw transcript visibility;
2. student is informed before submission;
3. student consents;
4. board user has `view_raw_transcript` permission;
5. access event is logged.

### 5.4 Transcript Processing Logs

Do not store raw transcript text in normal AI logs.

If needed for debugging, store in protected storage with restricted admin access and retention policy.

---

## 6. Application Privacy

### 6.1 Candidate Data Scope

When a student applies to an association, that association can access only application-relevant data.

Default visible to authorized reviewers:

- name;
- verified Bocconi email;
- degree program;
- year;
- onboarding summary;
- application answers;
- transcript summary;
- AI evaluation if permission allows.

### 6.2 Internal Notes

Internal notes are private to the association workspace.

Students do not see internal board notes.

Internal notes should not be used for discriminatory or irrelevant comments. Future moderation can be added.

### 6.3 Candidate AI Evaluation

Visible only to users with `view_candidate_ai_evaluation` permission.

AI evaluation must be labeled as decision support, not final decision.

### 6.4 Status Changes

Changing candidate status must be permission-checked and logged.

Final statuses should require confirmation:

- accepted;
- rejected;
- waitlisted.

---

## 7. Association Privacy

### 7.1 Public Page

Published association pages are public.

Draft pages are accessible only to:

- MIRA admin;
- association users with page permissions.

### 7.2 Board Permissions

Only president and users with `manage_board_permissions` can modify board permissions.

Every permission change must be audited.

### 7.3 Board Member Removal

Removing a board member must revoke access but preserve historical audit trail and authored notes.

Do not delete the user's student account.

---

## 8. Invitation Security

### 8.1 Official Admin Invitations

Association presidents are invited by MIRA admin during initial launch.

Invitation must:

- be single-use;
- expire;
- be tied to invited email;
- require verified email;
- be revocable;
- log acceptance.

### 8.2 Board Invitations

Board invitations are sent by president or authorized user.

Invitation acceptance creates association membership, not a separate account.

### 8.3 Future Company Invitations

Important companies and early pilots can be invited by MIRA admin.

Normal companies may request access later, but must remain limited until verified.

---

## 9. Company Privacy and Anonymity Future

### 9.1 Verification Before Access

Companies cannot access candidate matching unless:

- company is verified;
- recruiter is authorized;
- subscription/access rules allow it.

### 9.2 Anonymous Candidate Profiles

Before student consent, company can see only anonymous profile data.

Allowed examples:

- university;
- degree area;
- year range;
- skills/evidence summaries;
- simulation/project evidence;
- AI fit explanation;
- anonymous candidate code.

Not allowed:

- name;
- email;
- phone;
- photo;
- exact transcript file;
- exact identity clues when avoidable;
- association internal notes.

### 9.3 Student Identity Reveal

Student identity reveal must be explicit.

Flow:

1. Student sees company identity and opportunity details.
2. Student can chat anonymously.
3. Student clicks explicit reveal action.
4. MIRA shows confirmation.
5. System logs reveal event.
6. Company can now see allowed identity/contact fields.

### 9.4 Student Can Self-Disclose in Chat

Student may voluntarily type their name in chat. MIRA should not rely on this as official reveal. Official product state changes only after explicit reveal action.

---

## 10. Knowledge Base Privacy

### 10.1 Document Scopes

Knowledge documents can be scoped as:

- global_mira;
- association_specific;
- university_specific;
- company_specific;
- application_cycle_specific;
- admin_only;
- ai_internal_only.

### 10.2 Retrieval Rules

AI modules can retrieve only documents allowed by context.

Examples:

- Application Evaluator can retrieve global MIRA and relevant association/cycle docs.
- Orientation Advisor can retrieve academic knowledge docs.
- Company Matcher can retrieve company-specific docs only for that company.
- Admin QA can retrieve admin-only docs.

### 10.3 Upload Permissions

First build:

- MIRA admin can upload all knowledge documents.
- Association upload for projects comes later.

Future:

- association admins can upload association-specific documents;
- company admins can upload company-specific recruiting documents;
- universities can provide academic documents if feature exists.

---

## 11. AI Log Privacy

### 11.1 What to Log

Log:

- module;
- provider;
- model;
- prompt version;
- entity reference;
- metadata;
- status;
- token/cost info;
- output summary.

### 11.2 What Not to Log Casually

Avoid normal-table storage of:

- raw transcript text;
- full application answers if not needed;
- sensitive personal details;
- full anonymous chat content unless necessary and disclosed;
- raw company strategy documents.

### 11.3 Protected Raw Logs

If raw input/output must be stored:

- store in protected bucket;
- restrict to MIRA admin/debug roles;
- audit access;
- define retention later.

---

## 12. Row-Level Security Requirements

### 12.1 RLS Enabled

RLS must be enabled on all sensitive tables:

- profiles;
- student_profiles;
- student_transcripts;
- student_courses;
- association_memberships;
- application_cycles;
- application_questions;
- applications;
- application_answers;
- candidate_ai_evaluations;
- candidate_internal_notes;
- uploaded_files;
- knowledge_documents;
- knowledge_chunks;
- company tables future;
- messages future.

### 12.2 Server Helpers

Implement server-side helpers:

- `requireAuth()`;
- `requireMiraAdmin()`;
- `requireAssociationPermission()`;
- `canViewApplication()`;
- `canAccessFile()`;
- `canViewAIEvaluation()`;
- `canViewRawTranscript()`;
- `requireCompanyVerification()` future.

### 12.3 Never Trust Client Context

Active role/context from frontend is only UI state. Server must verify it against database.

---

## 13. Storage Security

### 13.1 Private Buckets by Default

Private buckets:

- student-transcripts;
- application-files;
- association-projects before public release;
- knowledge-base;
- simulation-submissions;
- ai-logs-protected.

Public or semi-public buckets:

- avatars if user chooses;
- association-logos;
- association-assets approved for public pages;
- company-assets future.

### 13.2 Signed URLs

Use signed URLs for private file access.

Signed URL generation must be permission-checked server-side.

### 13.3 File Upload Validation

Validate:

- file type;
- file size;
- owner;
- linked entity;
- bucket path;
- malware scanning later if needed.

---

## 14. Audit Events

Audit these events:

### Auth and Roles

- admin grants role;
- role removed;
- permission changed;
- board member invited;
- board member removed;
- company verified future.

### Applications

- application submitted;
- status changed;
- final decision set;
- internal note created/edited/deleted if edit allowed;
- AI evaluation regenerated;
- raw transcript accessed.

### Admin

- data corrected;
- association disabled;
- user disabled;
- invitation revoked;
- knowledge document deleted;
- AI log accessed.

### Company Future

- anonymous chat opened;
- identity reveal requested;
- identity revealed;
- candidate saved to pipeline;
- company subscription changed.

---

## 15. Consent Requirements

### 15.1 Association Application Consent

Before submission, student must see:

- what association will receive;
- whether transcript summary is visible;
- whether raw transcript is visible;
- how AI is used;
- that final decision is human.

### 15.2 Company Matching Consent Future

Before company matching launches, student must control:

- whether profile can be included in anonymous matching;
- what evidence is visible;
- whether personal tags are visible;
- when identity is revealed.

### 15.3 Profile Evidence Visibility

Student should have visibility controls for profile evidence:

- private;
- visible to associations in applications;
- visible to companies anonymously;
- visible after identity reveal.

---

## 16. Data Correction and Deletion

### 16.1 Student Corrections

Students should be able to correct obvious profile facts:

- name;
- degree program;
- year;
- interests/goals;
- transcript parsing errors through request or manual correction.

### 16.2 Admin Corrections

Admin can correct data for support. Sensitive corrections must be audited.

### 16.3 Deletion

Deletion policy should be defined before full production. Until then, implement safe soft-delete for sensitive entities where appropriate.

Do not cascade delete critical audit history accidentally.

---

## 17. Abuse and Impersonation Controls

### 17.1 Associations

- Official president invitations during launch.
- Admin approval for public pages.
- Prevent duplicate association slugs.
- Allow disabling suspicious association pages.

### 17.2 Companies Future

- Company email domain verification.
- Admin invite for important/early companies.
- Request access flow for normal companies.
- Verified status before candidate access.
- Subscription/payment checks before full use.

### 17.3 Users

- Email domain restriction for first student launch.
- Rate limits for sensitive actions later.
- Admin suspension ability.

---

## 18. Implementation Checklist

Before first real association launch:

- Supabase Auth configured.
- `@studbocconi.it` restriction enforced server-side.
- RLS enabled on sensitive tables.
- Storage buckets private where needed.
- Invitation tokens single-use and expiring.
- Association permissions enforced server-side.
- Candidate status changes audited.
- Raw transcript access controlled.
- AI evaluation visibility permissioned.
- Admin routes hidden and protected.
- Error states do not leak data.

---

## 19. Build Rules for Claude Code

1. Do not expose private data through client-side filters only.
2. Do not rely on hidden navigation as security.
3. Add RLS and server checks before production use.
4. Every file download must be permission-checked.
5. Every admin override must be audited.
6. Do not reveal student identity to companies before consent.
7. Keep AI logs privacy-aware.
8. Do not make raw transcripts visible by default.
9. Use generic invitation architecture from the beginning.
10. When uncertain, choose more privacy, not less.
