# MIRA User Flows Specification

**Version:** 1.0  
**Date:** 2026-06-15  
**Status:** Product flow blueprint  

---

## 0. Purpose

This document defines the main user flows for MIRA.

It translates the product vision into step-by-step actions across web and mobile. It covers the first Associations Build and the future MIRA modules: companies, simulations, orientation and universities.

AI coding tools must use this document before creating routes, screens, API actions or database writes.

---

## 1. Global Flow Principles

### 1.1 One Account, Multiple Contexts

A user logs into one MIRA account and can switch context depending on roles.

Possible contexts:

- Student Mode;
- Association President Mode;
- Association Board Mode;
- MIRA Admin Mode;
- Future Company Recruiter Mode;
- Future University Admin Mode.

The user never needs separate accounts for these modes.

### 1.2 Web and Mobile Continuity

A flow started on web must be resumable on mobile when appropriate, and vice versa.

Examples:

- a student starts applying on mobile, uploads transcript later on web;
- a president creates a cycle on web and reviews candidates on mobile;
- a board member receives a push notification and changes candidate status from mobile.

### 1.3 Forced Onboarding for Association Applications

For the first build, students cannot submit an association application without completing base MIRA onboarding.

This onboarding is part of profile creation, not a separate questionnaire.

### 1.4 AI Assistance Requires Human Confirmation

AI can draft, summarize, classify, evaluate and recommend. Human users must confirm publication, decisions and sensitive actions.

---

## 2. Flow: Student Enters MIRA from Association Page

### Goal

A Bocconi student discovers an association and starts an application.

### Actors

- Student;
- MIRA system;
- Association public page.

### Preconditions

- Association page is published.
- Application cycle is open or opening soon.

### Steps

1. Student opens `/associations/[slug]`.
2. MIRA displays association public page:
   - logo;
   - description;
   - category;
   - timeline;
   - available application cycle;
   - Apply button.
3. Student clicks `Apply`.
4. If not authenticated, MIRA redirects to signup/login with return URL.
5. If authenticated but onboarding incomplete, MIRA redirects to onboarding.
6. If onboarding complete, MIRA opens application form/chat flow.

### Success State

Student is inside the application flow for the selected association cycle.

### Error States

- Applications are closed: show status and optional reminder signup.
- Association page is unpublished: show not found or unavailable.
- Student is not eligible: show eligibility explanation.

---

## 3. Flow: Student Signup with Bocconi Email

### Goal

Create official student account using `@studbocconi.it` email.

### Preconditions

- Student has a Bocconi student email.

### Steps

1. Student enters email.
2. Frontend validates email format.
3. Server validates domain is `studbocconi.it`.
4. Supabase Auth creates user or sends magic link/verification email.
5. MIRA creates or updates `profiles` record after auth callback.
6. User verifies email.
7. MIRA assigns `student` role.
8. MIRA creates `student_profiles` row if missing.
9. MIRA returns user to original flow.

### Success State

Student has verified MIRA account and can continue onboarding.

### Error States

- Wrong domain: explain Bocconi-only launch.
- Verification expired: allow resend.
- Email already used: show login option.
- Auth provider error: show retry and support contact.

---

## 4. Flow: Student Base Onboarding

### Goal

Create the initial MIRA student profile.

### Steps

1. MIRA welcomes student.
2. Student confirms basic identity:
   - full name;
   - university email;
   - university default: Bocconi;
   - degree program;
   - degree level;
   - current year.
3. Student uploads transcript/libretto.
4. MIRA stores file in `student-transcripts` bucket.
5. MIRA creates `uploaded_files` and `student_transcripts` records.
6. Transcript parsing starts.
7. MIRA asks conversational onboarding questions:
   - previous experiences;
   - academic interests;
   - professional goals;
   - sectors of interest;
   - association motivation;
   - projects;
   - what energizes the student;
   - what the student dislikes;
   - working style;
   - availability;
   - languages;
   - relevant skills.
8. MIRA summarizes answers into initial profile summary.
9. Student reviews profile summary.
10. Student confirms or edits basic facts.
11. MIRA marks onboarding completed.

### Success State

Student can submit applications and continue building profile.

### Important UX Rule

The onboarding must feel conversational and human. It must not look like a generic psychological test.

---

## 5. Flow: Transcript Upload and Parsing

### Goal

Collect academic evidence from transcript/libretto.

### Steps

1. Student selects file.
2. Client validates file type and size.
3. File uploads to private Supabase Storage bucket.
4. `uploaded_files` row is created.
5. `student_transcripts` row is created with status `pending`.
6. AI/processing service extracts:
   - course names;
   - grades;
   - credits;
   - weighted average if possible;
   - degree program;
   - academic year;
   - inconsistencies.
7. Extracted courses are saved to `student_courses`.
8. Transcript summary is saved to `student_profiles.transcript_summary`.
9. Student sees summary and can flag errors.
10. MIRA logs processing result.

### Raw Transcript Visibility

Default: only student and MIRA admin can access raw file.

Association access to raw PDF requires explicit application-cycle setting and student consent before submission.

---

## 6. Flow: Student Applies to Association

### Goal

Submit complete application to an association.

### Preconditions

- Student is verified.
- Student completed required onboarding.
- Application cycle is open.

### Steps

1. Student opens application page.
2. MIRA checks existing application.
3. If no application exists, MIRA creates draft `applications` row.
4. MIRA displays association-specific questions.
5. Student answers questions.
6. MIRA autosaves answers.
7. Student reaches review screen.
8. Review screen displays:
   - association name;
   - application cycle;
   - profile basics;
   - transcript uploaded status;
   - application answers;
   - privacy notice;
   - consent checkboxes.
9. Student submits.
10. Application status changes to `submitted`.
11. `application_status_events` row is created.
12. Candidate AI evaluation is triggered asynchronously.
13. Student receives confirmation notification.
14. Association receives new candidate notification.

### Success State

Application is submitted and visible to authorized association users.

### Error States

- Missing required answer.
- Transcript not uploaded.
- Onboarding incomplete.
- Application deadline passed.
- User already submitted application.

---

## 7. Flow: Student Tracks Application Status

### Goal

Student monitors application outcome.

### Steps

1. Student opens Student Mode.
2. Student goes to `Applications`.
3. MIRA lists applications:
   - association;
   - cycle;
   - submitted date;
   - current status;
   - next action.
4. Student opens application detail.
5. MIRA displays timeline:
   - submitted;
   - in review;
   - interview;
   - accepted/rejected/waitlisted.
6. If interview invitation exists, student can respond or see instructions.
7. If final decision exists, student sees result and message.

### Privacy Rule

Student does not see internal board notes or internal AI evaluation unless a separate candidate feedback feature is intentionally built.

---

## 8. Flow: MIRA Admin Invites Association President

### Goal

Create official association onboarding with authenticity.

### Actor

MIRA Admin.

### Steps

1. Admin opens `/admin/invitations`.
2. Admin selects `association_president` invitation type.
3. Admin enters:
   - president email;
   - association name;
   - category;
   - website;
   - optional note.
4. MIRA validates email domain if required.
5. MIRA creates or links draft association profile.
6. MIRA creates invitation token.
7. MIRA sends invitation email.
8. Admin sees invitation as `pending`.

### Success State

President receives official invitation from MIRA.

### Error States

- Email already invited.
- Association slug already exists.
- Missing required details.

---

## 9. Flow: President Accepts Official Invitation

### Goal

President gains official association workspace access.

### Steps

1. President opens invitation link.
2. MIRA validates token:
   - exists;
   - not expired;
   - not accepted;
   - not revoked.
3. If president is not logged in, MIRA shows signup/login.
4. President registers with invited email.
5. President verifies email.
6. President accepts invitation.
7. MIRA creates/updates profile and student profile.
8. MIRA creates association membership:
   - role: `association_president`;
   - permissions: full.
9. Invitation status becomes `accepted`.
10. Audit log is created.
11. President enters association setup flow.

### Success State

President can manage association page and application cycles.

---

## 10. Flow: President Sets Up Association Page

### Goal

Publish official association page.

### Steps

1. President opens Association President Mode.
2. President enters page editor.
3. President adds or edits:
   - logo;
   - name;
   - category;
   - short description;
   - long description;
   - sectors;
   - team structure;
   - website;
   - social links;
   - recruiting timeline.
4. President optionally enters website URL for AI-assisted page draft.
5. MIRA fetches/extracts public information if enabled.
6. AI creates draft page content.
7. President reviews and edits.
8. President submits for review or publishes if allowed.
9. MIRA Admin can approve/publish during first launch.

### Success State

Association page is public and discoverable.

### Human Confirmation Rule

AI-generated page content must never be published without president or admin confirmation.

---

## 11. Flow: President Creates Application Cycle

### Goal

Open applications for an association.

### Steps

1. President opens `Application Cycles`.
2. Clicks `Create Cycle`.
3. Enters:
   - title;
   - description;
   - opening date;
   - closing date;
   - eligibility;
   - roles/teams;
   - evaluation criteria;
   - interview process.
4. Adds custom questions.
5. Saves as draft.
6. Previews student application experience.
7. Opens/publishes cycle.
8. Public association page updates status.

### Success State

Students can apply.

### Error States

- Closing date before opening date.
- Required information missing.
- No questions created if questions required.
- User lacks permission.

---

## 12. Flow: President Invites Board Members

### Goal

Give board members access to help review candidates.

### Steps

1. President opens `Board Members`.
2. Clicks `Invite Member`.
3. Enters Bocconi email.
4. Selects role template:
   - board admin;
   - reviewer;
   - interviewer;
   - member.
5. Adjusts granular permissions.
6. Sends invite.
7. Invitee receives email.
8. Invitee signs up/logs in with invited email.
9. Invitee accepts invitation.
10. MIRA creates association membership.
11. Invitee can switch to Association Board Mode.

### Success State

Board member can perform actions allowed by permissions.

---

## 13. Flow: Board Member Reviews Candidate

### Goal

Board member evaluates application.

### Preconditions

- Board member has `view_candidates` permission.
- Application belongs to board member's association.

### Steps

1. Board member switches to Association Mode.
2. Opens candidate dashboard.
3. Filters/sorts candidates.
4. Opens candidate detail.
5. Views allowed information:
   - name;
   - course;
   - year;
   - onboarding summary;
   - application answers;
   - transcript summary;
   - AI evaluation if permitted.
6. Adds internal note if permitted.
7. Changes candidate status if permitted.
8. Status event is logged.
9. Candidate may receive notification depending on status.

### Success State

Candidate review advances and all sensitive actions are logged.

### Permission Variants

- Basic reviewer: answers and summary only.
- AI reviewer: includes AI evaluation.
- Interviewer: candidate details and interview scheduling.
- Admin: can change statuses and manage workflow.

---

## 14. Flow: AI Candidate Evaluation

### Goal

Provide structured review support to association board.

### Trigger

- After application submission;
- Manually regenerated by authorized user;
- Automatically regenerated after relevant profile update if allowed.

### Steps

1. System collects input snapshot:
   - association profile;
   - cycle criteria;
   - custom questions;
   - student profile;
   - transcript summary;
   - application answers.
2. System calls AI module `evaluateApplication()`.
3. AI returns structured JSON.
4. System validates JSON schema.
5. System saves row in `candidate_ai_evaluations`.
6. System logs AI call metadata in `ai_logs`.
7. Authorized board users can view result.

### Success State

Candidate detail includes AI evaluation panel.

### Failure Behavior

- If AI call fails, application remains submitted.
- Candidate review can continue manually.
- Show `AI evaluation pending` or `AI evaluation failed` to authorized users.
- Allow retry by authorized user.

---

## 15. Flow: Candidate Status Change

### Goal

Association updates candidate pipeline status.

### Steps

1. Authorized user selects candidate.
2. User chooses new status:
   - submitted;
   - in_review;
   - interview;
   - accepted;
   - rejected;
   - waitlisted;
   - withdrawn.
3. System checks permission.
4. System may request confirmation for final statuses.
5. System updates `applications.status`.
6. System inserts `application_status_events` row.
7. System inserts `audit_logs` row.
8. System sends candidate notification if status is externally visible.

### Important Rule

AI recommendation must never change status automatically.

---

## 16. Flow: Interview Invitation

### Goal

Invite candidate to interview.

### Steps

1. Authorized user opens candidate detail.
2. Clicks `Invite to Interview`.
3. Enters:
   - message;
   - proposed times;
   - location or video link;
   - instructions.
4. System creates `interview_invites` row.
5. Candidate status can change to `interview`.
6. Candidate receives notification.
7. Candidate opens interview details.
8. Candidate confirms or selects time if supported.

### Success State

Interview is scheduled or pending candidate response.

---

## 17. Flow: MIRA Admin Knowledge Base Upload

### Goal

Allow admin to upload knowledge documents from MIRA, without using Supabase manually.

### Steps

1. Admin opens `/admin/knowledge-base`.
2. Admin uploads file, URL or pasted text.
3. Admin sets metadata:
   - title;
   - category;
   - source type;
   - visibility scope;
   - linked association/university/module if any.
4. File is stored in `knowledge-base` bucket.
5. `uploaded_files` row is created.
6. `knowledge_documents` row is created.
7. Processing begins:
   - extract;
   - chunk;
   - embed.
8. `knowledge_chunks` rows are created.
9. Document status becomes `ready` or `failed`.
10. Admin can reprocess or delete document.

### Success State

AI modules can retrieve document chunks when allowed by scope.

---

## 18. Flow: MIRA Admin Corrects Data

### Goal

Allow founder/admin to fix operational issues.

### Examples

- wrong association page data;
- duplicate association;
- invitation sent to wrong email;
- broken transcript processing;
- inappropriate content;
- permission issue;
- candidate support request.

### Steps

1. Admin opens admin console.
2. Searches relevant entity.
3. Opens detail view.
4. Performs allowed correction.
5. System logs before/after snapshots.
6. If needed, affected user receives notification.

### Safety Rule

Admin overrides must be logged. Admin console must never be accessible to normal users.

---

# Future Full-Product Flows

The following flows are not first-build requirements, but must guide architecture.

---

## 19. Future Flow: Association Project Upload and Profile Evidence

### Goal

Transform association work into student profile evidence.

### Steps

1. President or authorized member uploads project/report.
2. MIRA stores file in `association-projects` bucket.
3. AI analyzes document:
   - topic;
   - methods;
   - technical skills;
   - sophistication;
   - possible contributors.
4. Association admin confirms contributors.
5. Each contributor receives evidence item.
6. Student can control visibility.
7. Profile summary updates.

### Important Rule

AI can suggest contributors but association admin must confirm.

---

## 20. Future Flow: Company Request Access

### Goal

Allow normal companies to request MIRA access while preventing impersonation.

### Steps

1. Company user opens company signup.
2. Enters:
   - company name;
   - website;
   - company email;
   - role/title;
   - recruiting intent.
3. MIRA validates email domain and website domain alignment if possible.
4. Company profile is created with `pending_verification` status.
5. MIRA Admin reviews request.
6. Admin approves or rejects.
7. If approved, company user becomes company admin.
8. Full candidate access remains gated by verification and future subscription.

### Early Pilot Variant

For important companies, MIRA Admin sends direct official invitation to known representative.

---

## 21. Future Flow: Company Creates Candidate Search

### Goal

Recruiter finds relevant students through AI matching.

### Steps

1. Verified recruiter enters Company Mode.
2. Opens `New Search`.
3. Describes candidate need in natural language.
4. Optional filters:
   - university;
   - degree;
   - year;
   - location;
   - availability;
   - skills;
   - interests.
5. AI structures the query.
6. MIRA matches against anonymous eligible student profiles.
7. Recruiter sees ranked anonymous candidates:
   - anonymous code;
   - fit explanation;
   - evidence;
   - skills;
   - uncertainty;
   - suggested outreach angle.
8. Recruiter saves search or opens anonymous chat.

### Privacy Rule

Company does not see identity until student consents.

---

## 22. Future Flow: Anonymous Company-Student Chat

### Goal

Let company contact candidate without immediate identity reveal.

### Steps

1. Company opens chat with anonymous candidate.
2. Student receives notification with:
   - company name;
   - role/opportunity;
   - why they were selected;
   - recruiter message.
3. Student can reply anonymously.
4. Student can ask questions.
5. Student may choose to reveal identity.
6. If student reveals identity, company can see name/contact details allowed by consent.
7. Chat continues as identified or closes.

### Important Rule

The student can reveal themselves voluntarily in conversation, but official identity reveal must require explicit action and be logged.

---

## 23. Future Flow: Company Recruiting Pipeline

### Goal

Manage candidates after contact.

### Steps

1. Company saves candidate to pipeline.
2. Candidate status changes internally:
   - sourced;
   - contacted;
   - student_responded;
   - identity_revealed;
   - assessment;
   - interview;
   - offer;
   - rejected;
   - hired.
3. Recruiters add notes.
4. Company can send assessment task if feature enabled.
5. Candidate receives updates when appropriate.
6. Final outcome can update profile evidence only with student consent and policy.

---

## 24. Future Flow: Student Starts Micro-Exercise

### Goal

Build skills through short exercises.

### Steps

1. Student opens simulations area.
2. Selects path/branch.
3. MIRA recommends micro-exercise.
4. Student completes 2-5 minute exercise.
5. AI/system gives immediate feedback.
6. Student gains internal progress points.
7. Student level is updated internally.
8. External company-visible profile is not updated as hard evidence.

---

## 25. Future Flow: Student Completes Deep Simulation

### Goal

Create verified profile evidence through realistic work task.

### Steps

1. Student opens simulation path on desktop.
2. Student selects unlocked deep simulation.
3. MIRA checks device requirement.
4. If mobile, MIRA blocks and explains desktop-only requirement.
5. On desktop, MIRA shows brief and materials.
6. Student works on deliverable.
7. AI support is available but cannot solve task.
8. Student uploads deliverable.
9. AI evaluates deliverable using rubric.
10. Student receives feedback.
11. Evidence item is created.
12. Student controls visibility.
13. Profile summary updates.

---

## 26. Future Flow: Orientation Gap Analysis

### Goal

Give precise career/academic guidance.

### Steps

1. Student asks MIRA about career target.
2. MIRA identifies micro-sector.
3. MIRA retrieves required skills and career path data.
4. MIRA compares against student profile:
   - transcript;
   - courses;
   - simulations;
   - association projects;
   - skills.
5. MIRA retrieves relevant university courses/syllabi.
6. MIRA creates gap analysis:
   - current strengths;
   - missing skills;
   - specific courses;
   - simulations;
   - association projects;
   - next actions.
7. MIRA displays Gap Analysis widget.

---

## 27. Future Flow: University Admin Views Aggregated Analytics

### Goal

Universities use MIRA for aggregated insights without violating student privacy.

### Steps

1. University admin logs in.
2. MIRA verifies university role and permissions.
3. Admin views aggregate dashboard:
   - skill trends;
   - orientation demand;
   - simulation engagement;
   - application trends;
   - anonymized company interest.
4. No identifiable student data is shown unless explicit legal/product agreement exists.

---

## 28. Build Rules for Claude Code

When implementing flows:

1. Implement one flow at a time.
2. Use real auth and database state.
3. Do not fake flow completion with local state only.
4. Every state transition must map to database fields.
5. Every sensitive action must be permission-checked server-side.
6. Every user-facing error state must have a clear UI.
7. Mobile and web should share domain logic.
8. Do not implement future flows until the implementation plan says so.
