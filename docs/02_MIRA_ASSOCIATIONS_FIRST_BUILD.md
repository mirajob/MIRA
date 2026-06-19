# MIRA Associations First Build Specification

**Version:** 1.0  
**Date:** 2026-06-15  
**Status:** First production build specification  
**Audience:** Founder, AI coding tools, future developers  
**Related master document:** `MIRA_MASTER_PRODUCT_SPEC.md`  

---

## 0. Document Purpose

This document defines the first production build of MIRA: the Associations Module.

This is not a prototype. The scope is limited to associations, students and MIRA admin, but the implementation must be compatible with the full MIRA platform described in `MIRA_MASTER_PRODUCT_SPEC.md`.

The first build must be usable by real Bocconi students and real Bocconi associations for actual application management.

The objective is to create the first working vertical slice of MIRA:

- verified Bocconi student accounts;
- official association president onboarding through MIRA admin invitation;
- association public pages;
- student forced onboarding;
- transcript/libretto upload;
- association application cycles;
- custom questions;
- AI-assisted candidate review;
- president and board workspace;
- web and mobile support;
- MIRA admin console;
- admin knowledge base upload.

---

## 1. Product Context

MIRA is an AI-first university talent platform.

The Associations Module is the first build because associations are the initial growth engine. Students are forced to create a MIRA profile in order to apply to associations, and associations receive immediate operational value by replacing forms, spreadsheets and email with a structured AI-assisted workflow.

Associations also create high-quality profile evidence over time through:

- applications;
- membership;
- board roles;
- projects;
- reports;
- confirmed contributions.

This first build must therefore be implemented as the beginning of the final MIRA profile system, not as an isolated admissions tool.

---

## 2. First Build Objective

By the end of the first build, MIRA must allow:

### Students

A Bocconi student can:

1. enter MIRA;
2. view a public association page;
3. click `Apply` / `Candidati`;
4. create an account using a university email ending in `@studbocconi.it`;
5. confirm registration through email verification;
6. upload transcript/libretto;
7. complete base MIRA onboarding;
8. answer association-specific questions;
9. submit the application;
10. track application status.

Application statuses:

- `submitted`;
- `in_review`;
- `interview`;
- `accepted`;
- `rejected`;
- `waitlisted`;
- `withdrawn`.

### Associations

An association president can:

1. accept an official MIRA invitation;
2. create or claim the association page;
3. insert description, logo, category and recruiting timeline;
4. optionally insert website link so MIRA can draft page content using AI/web extraction;
5. create an open application cycle;
6. insert custom questions;
7. invite board members;
8. manage board permissions;
9. view candidate list;
10. read candidate profile, answers, course and year;
11. use AI evaluation to see candidate summary, strengths, gaps and fit;
12. change candidate status;
13. send interview invitation.

### MIRA Admin

MIRA admin can:

1. access hidden protected admin console;
2. invite association presidents officially;
3. manage association onboarding;
4. view associations, users and applications;
5. correct data;
6. manage support issues;
7. upload documents into the knowledge base;
8. prepare the future company invitation and verification model.

---

## 3. Relationship to Full MIRA

The Associations Module must connect to the future full platform.

It must already use:

- the final identity model;
- multi-role accounts;
- student profiles;
- association memberships;
- generic invitation system;
- permission system;
- AI service abstraction;
- file upload architecture;
- admin knowledge base architecture;
- audit logging for sensitive actions.

Do not build an isolated association-only system.

Future modules that this build must support later:

- association project analysis;
- richer student profile;
- simulations;
- company matching;
- anonymous company-student chat;
- company invitation and verification;
- orientation knowledge base;
- multi-university expansion.

---

## 4. Core Principles

### 4.1 One Platform, Multiple Roles

A user is always a person first.

A Bocconi student can also be:

- association president;
- board member;
- reviewer;
- interviewer;
- normal association member;
- future company candidate;
- MIRA admin if explicitly granted.

### 4.2 Associations Are Native to MIRA

Association presidents and board members use the same MIRA account and mobile app as students.

There is no separate external association portal with separate identity.

### 4.3 Official Onboarding Through MIRA Admin

At launch, association presidents should be invited by MIRA admin to guarantee authenticity.

This prevents fake association accounts.

### 4.4 AI Supports, Humans Decide

AI can summarize, evaluate and recommend.

AI must never automatically accept or reject candidates.

### 4.5 Web and Mobile Must Both Be Supported

Association users are not web-only.

Presidents and board members must be able to review candidates and manage key workflows from mobile.

Web remains optimized for complex workflows.

Mobile remains optimized for fast review, notifications and actions on the go.

---

## 5. Platform Clients

### 5.1 Web App Requirements

The web app must support:

- landing/public pages;
- student application flow;
- student onboarding;
- transcript upload;
- association workspace;
- president dashboard;
- board dashboard;
- application cycle builder;
- question builder;
- candidate review table;
- candidate detail view;
- AI evaluation panel;
- board member management;
- permission management;
- interview workflow;
- MIRA admin console;
- knowledge base upload.

### 5.2 Mobile App Requirements

The mobile app must support:

- student signup/login;
- association discovery;
- public association page view;
- student application flow;
- onboarding;
- transcript upload;
- application status tracking;
- push/in-app notifications;
- role switcher;
- president mode;
- board member mode;
- candidate list;
- candidate detail;
- AI evaluation summary if permitted;
- status changes if permitted;
- interview coordination;
- board invitations basic flow.

### 5.3 Shared Backend

Web and mobile must share:

- Supabase Auth;
- Supabase Postgres;
- Supabase Storage;
- AI service layer;
- permission model;
- notification model.

---

## 6. Universal Identity and Multi-Role Model

### 6.1 Principle

MIRA uses a single-account, multi-role model.

The same user account can be both a student and an association operator.

### 6.2 Initial User Types

Initial users:

- student;
- association president;
- association board member;
- MIRA admin.

### 6.3 Global Roles

Global roles:

- `student`;
- `mira_admin`.

### 6.4 Association Roles

Association-specific roles:

- `association_president`;
- `association_admin`;
- `association_reviewer`;
- `association_interviewer`;
- `association_member`.

### 6.5 Role Switching

The UI must support role switching.

Example:

```text
Current mode: Student
Switch to:
- Student
- President of BSIC
- Reviewer for Consulting Club
- MIRA Admin
```

The active mode controls navigation and visible actions.

---

## 7. Permission System

### 7.1 Roles Are Templates

Roles provide default permission sets, but the president can grant or revoke individual permissions for board members.

### 7.2 President Permissions

The president always has full permissions for the association.

President can:

- manage association profile;
- manage public page;
- create/edit application cycles;
- create/edit questions;
- publish/open/close cycles;
- view all candidates;
- view application answers;
- view candidate academic profile;
- view AI evaluations;
- add internal notes;
- change candidate statuses;
- send interview invitations;
- manage interview slots;
- invite board members;
- remove board members;
- manage permissions;
- upload association projects later;
- view analytics;
- manage settings.

### 7.3 Board Permissions

Available permissions:

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
view_candidate_transcript_file
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

### 7.4 Default Role Templates

#### `association_president`

All permissions.

#### `association_admin`

Operational management, candidate workflow, applications, but not ownership-level actions unless granted.

#### `association_reviewer`

Can view candidates, answers and add notes. AI evaluation visibility depends on permission.

#### `association_interviewer`

Can view assigned candidates, interview schedule and interview-related notes.

#### `association_member`

No recruiting permissions by default.

### 7.5 Server-Side Enforcement

Permissions must be enforced server-side.

Frontend hiding is not enough.

---

## 8. Official Invitation System

### 8.1 MIRA Admin Invites Association Presidents

MIRA admin must be able to invite official association presidents.

This guarantees authenticity and prevents random users from creating fake association pages.

Flow:

1. MIRA admin opens `/admin/invitations`.
2. Admin selects invitation type: `association_president`.
3. Admin enters:
   - president email;
   - association name;
   - optional association category;
   - optional website;
   - optional note.
4. System creates one-time invitation token.
5. System sends invitation email.
6. President clicks invitation link.
7. President signs up or logs in with `@studbocconi.it` email.
8. President verifies email.
9. President accepts invitation.
10. System creates association workspace or links president to existing association.
11. President receives `association_president` role.
12. Association appears as official/pending setup.

### 8.2 Invitation Statuses

Invitation statuses:

- `pending`;
- `accepted`;
- `expired`;
- `revoked`;
- `invalid`.

### 8.3 Invitation Security

Invitations must:

- be single-use;
- expire after configurable time;
- be tied to invited email;
- require email verification;
- be revocable by MIRA admin;
- log acceptance event.

### 8.4 Future Company Invitations

The invitation architecture must support future company invitations.

Future invitation types:

- `company_admin`;
- `company_recruiter`;
- `university_admin`;
- `mira_admin`.

For early company pilots and important companies, MIRA admin can invite a known official representative directly.

Normal companies may later self-register or request access, but must remain limited until verified.

---

## 9. Bocconi Email Verification

### 9.1 Student Domain Rule

For the first build, users entering the student ecosystem must use:

```text
@studbocconi.it
```

This applies to:

- students applying to associations;
- association presidents;
- board members;
- association members.

### 9.2 Registration Flow

1. User enters email.
2. System validates domain.
3. System creates Supabase Auth user.
4. System sends verification email.
5. User verifies email.
6. User can continue onboarding or invitation acceptance.

### 9.3 Domain Errors

If email is not valid:

- show clear error message;
- explain that the first MIRA launch is restricted to Bocconi student emails;
- allow contact/support link for edge cases.

---

## 10. Student Application Flow

### 10.1 Entry Point

Student enters MIRA through:

- direct MIRA link;
- association public page;
- association invitation/call-to-action;
- shared application link.

### 10.2 Public Page to Apply

Flow:

1. Student opens association public page.
2. Student reads description, timeline and available application cycle.
3. Student clicks `Apply` / `Candidati`.
4. If not logged in, student is redirected to signup/login.
5. After auth, student returns to application flow.

### 10.3 Forced Base Onboarding

Student cannot submit association application without completing base MIRA onboarding.

Required onboarding steps:

1. verified Bocconi email;
2. profile basics;
3. degree program;
4. degree level;
5. current year;
6. transcript/libretto upload;
7. conversational profile questions.

### 10.4 Onboarding Questions

MIRA asks questions to understand the student.

Topics:

- previous experiences;
- internships/work experience;
- association experience;
- academic interests;
- professional goals;
- sectors of interest;
- personal projects;
- what the student enjoys doing;
- what the student finds boring or frustrating;
- preferred working style;
- motivation to join associations;
- time availability;
- level of commitment;
- languages;
- relevant technical or soft skills.

### 10.5 Association-Specific Questions

After base onboarding, student answers questions defined by the association for that application cycle.

Question types:

- short text;
- long text;
- multiple choice;
- checkbox;
- dropdown;
- rating scale;
- role/team preference;
- availability;
- file upload;
- optional case prompt.

### 10.6 Submission Review

Before submission, student sees a review screen:

- profile basics;
- transcript uploaded status;
- onboarding completed status;
- answers to association questions;
- privacy notice;
- consent confirmation.

### 10.7 Submission

After submission:

- application status becomes `submitted`;
- student receives confirmation;
- association receives new candidate notification;
- AI evaluation can be triggered immediately or asynchronously;
- student can track status.

### 10.8 Student Status Tracking

Student can view:

- association;
- application cycle;
- submitted date;
- current status;
- next step if any;
- interview invitation if any;
- final decision when available.

---

## 11. Association Creation Flow

### 11.1 Official Creation Through Admin Invite

For the first build, official association workspaces are created through MIRA admin invitation to the president.

### 11.2 President Setup

After accepting invitation, the president configures:

- association name;
- slug;
- logo;
- category;
- short description;
- long description;
- sectors of interest;
- website;
- social links;
- recruiting timeline;
- team structure;
- contact email;
- public page status.

### 11.3 AI-Assisted Page Draft

President can insert association website URL.

MIRA can draft the public page by extracting information from:

- provided website;
- public text pasted by president;
- uploaded association documents;
- manual data.

Human confirmation is required before publishing.

### 11.4 Page Statuses

Association page statuses:

- `draft`;
- `pending_review`;
- `published`;
- `unpublished`;
- `disabled`.

For the first build, MIRA admin should be able to review pages before public listing.

---

## 12. President Experience

### 12.1 President Dashboard

President has full access to association workspace.

Dashboard sections:

- overview;
- public page editor;
- application cycles;
- questions;
- candidates;
- interview workflow;
- board members;
- permissions;
- notifications;
- settings;
- analytics later.

### 12.2 President Web Actions

On web, president can:

- edit association page;
- create application cycle;
- configure questions;
- publish/open/close applications;
- review candidates;
- filter/sort candidates;
- view AI evaluations;
- manage board;
- manage permissions;
- send interview invites;
- edit settings.

### 12.3 President Mobile Actions

On mobile, president can:

- switch to President Mode;
- view dashboard summary;
- view active cycles;
- view candidate list;
- open candidate detail;
- read answers;
- read AI summary;
- change status;
- send interview invite;
- invite board member;
- adjust basic permissions;
- receive urgent notifications.

---

## 13. Board Member Invitation Flow

### 13.1 Invite Board Member

Flow:

1. President opens board members section.
2. President clicks `Invite Member`.
3. President enters Bocconi email.
4. President selects role template.
5. President customizes permissions.
6. System sends invitation email.
7. Invitee opens link.
8. If user has MIRA account, user accepts invitation.
9. If user does not have MIRA account, user registers with `@studbocconi.it` email.
10. User verifies email.
11. User becomes student and association board/member according to invitation.

### 13.2 Board Invitation Statuses

- `pending`;
- `accepted`;
- `expired`;
- `revoked`.

### 13.3 Board Member Removal

President can remove or suspend board members.

Removal must:

- revoke association permissions;
- preserve audit logs;
- not delete the user's student account;
- preserve historical actions/notes as authored by that user.

---

## 14. Board Member Experience

Board member experience depends on permissions.

Board member can potentially:

- switch to Association Mode;
- view assigned dashboard;
- review candidates;
- view answers;
- view AI evaluation if permitted;
- add internal notes;
- change candidate status if permitted;
- manage interviews if permitted;
- receive notifications;
- collaborate with other board members.

Board members are also students and keep access to Student Mode.

---

## 15. Public Association Page

Each association has a public page on MIRA.

### 15.1 Content

Public page includes:

- logo;
- name;
- category;
- short description;
- long description;
- sectors of interest;
- team structure;
- website link;
- social links;
- recruiting timeline;
- application status;
- open application cycles;
- public projects/reports later;
- call-to-action to apply.

### 15.2 Application Status Display

Public page should display:

- applications open;
- applications closed;
- opening soon;
- deadline;
- available roles/teams if provided.

### 15.3 Public URL

Public page route:

```text
/associations/[slug]
```

Application route:

```text
/associations/[slug]/apply
```

---

## 16. Application Cycle Management

### 16.1 Cycle Fields

Each application cycle includes:

- association ID;
- title;
- description;
- opening date;
- closing date;
- status;
- eligible students;
- available roles/teams;
- evaluation criteria;
- interview process description;
- created by;
- timestamps.

### 16.2 Cycle Statuses

- `draft`;
- `open`;
- `closed`;
- `archived`.

### 16.3 Actions

Authorized users can:

- create cycle;
- edit draft cycle;
- publish/open cycle;
- close cycle;
- archive cycle;
- duplicate cycle for future recruiting.

---

## 17. Custom Questions

### 17.1 Question Types

Supported question types:

- `short_text`;
- `long_text`;
- `multiple_choice`;
- `checkboxes`;
- `dropdown`;
- `rating_scale`;
- `file_upload`;
- `role_preference`;
- `availability`.

### 17.2 Question Settings

Each question supports:

- required/optional;
- order index;
- options where applicable;
- helper text;
- character limit;
- internal label;
- AI evaluation flag;
- visibility settings.

### 17.3 Question Builder

Question builder must be usable by president/admin from web.

Mobile may support basic viewing/editing later, but first build mobile must at least allow reviewing answers.

---

## 18. Transcript Upload and Academic Profile

### 18.1 Upload Requirement

Student must upload transcript/libretto during base onboarding before submitting an application.

### 18.2 Supported Formats

Initial supported formats:

- PDF;
- image formats if easy to support later;
- manual fallback if parsing fails.

### 18.3 Storage

Transcript files are stored in Supabase Storage bucket:

```text
student-transcripts
```

### 18.4 Extraction

MIRA attempts to extract:

- degree program;
- courses;
- grades;
- credits;
- academic year;
- weighted average if possible;
- summary.

### 18.5 Association Visibility

Default association visibility:

- degree program;
- degree level;
- current year;
- transcript summary;
- academic highlights.

Raw PDF visibility should require explicit permission and transparent consent.

### 18.6 Parsing Failure

If transcript parsing fails:

- store file;
- mark extraction status as `failed`;
- allow student to continue if policy allows;
- allow MIRA admin to inspect/reprocess;
- show candidate as transcript uploaded but extraction incomplete.

---

## 19. AI Candidate Evaluation

### 19.1 Purpose

AI candidate evaluation helps association boards review applications faster and more consistently.

It does not make final decisions.

### 19.2 Trigger

AI evaluation can be triggered:

- automatically after application submission;
- manually by authorized board member;
- manually by MIRA admin;
- regenerated if candidate data or criteria change.

### 19.3 Inputs

AI receives:

- association profile;
- application cycle description;
- evaluation criteria;
- custom questions;
- student profile basics;
- onboarding answers;
- transcript summary;
- application answers;
- optional relevant knowledge base documents.

### 19.4 Output JSON Schema

AI must return structured JSON.

```json
{
  "overall_fit_category": "strong_fit | good_fit | uncertain_fit | weak_fit",
  "internal_score": 0,
  "summary": "string",
  "strengths": ["string"],
  "gaps": ["string"],
  "evidence": [
    {
      "claim": "string",
      "source": "onboarding | transcript | application_answer | association_criteria | inference",
      "confidence": "low | medium | high"
    }
  ],
  "concerns": ["string"],
  "recommended_next_step": "review | interview | waitlist | reject",
  "suggested_interview_questions": ["string"],
  "confidence": "low | medium | high"
}
```

### 19.5 AI Rules

AI must:

- not invent facts;
- separate evidence from inference;
- show uncertainty;
- not over-penalize lack of experience;
- consider motivation, potential and fit;
- never make final decision;
- avoid discriminatory reasoning;
- focus on association criteria and candidate evidence.

### 19.6 Display

Board sees:

- fit category;
- summary;
- strengths;
- gaps;
- evidence;
- suggested interview questions;
- confidence.

Recommendation should be framed as suggestion, not decision.

### 19.7 Ranking Policy

Recommended display:

- visible categories: Strong Fit, Good Fit, Needs Review, Weak Fit;
- internal numeric score for sorting/calibration;
- avoid presenting ranking as objective truth.

---

## 20. Candidate Review Dashboard

### 20.1 Candidate List

Association users with permission can view candidate list.

List columns:

- candidate name;
- degree program;
- year;
- submitted date;
- application status;
- fit category;
- AI evaluation status;
- assigned reviewer;
- last update.

### 20.2 Filters

Filters:

- status;
- role/team preference;
- year;
- degree program;
- fit category;
- reviewer;
- submitted date.

### 20.3 Candidate Detail

Candidate detail includes:

- profile basics;
- onboarding summary;
- academic profile;
- transcript summary;
- application answers;
- AI evaluation;
- internal notes;
- status history;
- interview invitations;
- actions allowed by permission.

### 20.4 Internal Notes

Board members with permission can add notes.

Notes must be private to association workspace and not visible to candidate.

---

## 21. Candidate Status Workflow

Application statuses:

```text
submitted
in_review
interview
accepted
rejected
waitlisted
withdrawn
```

### 21.1 Status Changes

Authorized users can change status.

Every status change creates audit event:

- previous status;
- new status;
- changed by;
- timestamp;
- optional note.

### 21.2 Student Notifications

Student should be notified when status changes if the change is candidate-visible.

Some internal status changes may remain hidden if needed later.

### 21.3 Final Decisions

Final decision statuses:

- `accepted`;
- `rejected`;
- `waitlisted`.

Final decisions must be made by authorized human users.

---

## 22. Interview Workflow

### 22.1 Interview Invitation

Authorized users can send interview invitation.

Interview invite includes:

- candidate;
- association;
- proposed time(s);
- selected time;
- location or video link;
- message;
- sender;
- status.

### 22.2 Interview Statuses

- `pending`;
- `accepted`;
- `declined`;
- `rescheduled`;
- `completed`;
- `cancelled`.

### 22.3 Mobile Support

Mobile app must support:

- receiving interview notification;
- viewing interview details;
- accepting/confirming if implemented;
- board viewing upcoming interviews.

### 22.4 First Build Simplicity

For the first build, full calendar scheduling can be simplified.

Minimum acceptable workflow:

- association sends interview invitation with text/time/location;
- candidate receives notification/email;
- status moves to `interview`;
- board can track invite status.

---

## 23. Notifications

### 23.1 Channels

Initial channels:

- email;
- in-app notification.

Mobile push notifications should be planned and added as soon as mobile app supports push.

### 23.2 Notification Events

Events:

- email verification;
- president invitation;
- board invitation;
- application submitted;
- AI evaluation completed;
- status changed;
- interview invitation sent;
- application cycle opened;
- application cycle deadline approaching;
- board member accepted invitation.

### 23.3 Notification Table

Store in-app notifications in database.

Fields:

- recipient_user_id;
- type;
- title;
- body;
- linked_entity_type;
- linked_entity_id;
- read_at;
- created_at.

---

## 24. Web App Pages

### 24.1 Public

```text
/
/associations
/associations/[slug]
/associations/[slug]/apply
/login
/signup
/verify-email
```

### 24.2 Student

```text
/student
/student/onboarding
/student/transcript
/student/applications
/student/applications/[applicationId]
/student/profile
```

### 24.3 Association

```text
/association/[associationSlug]
/association/[associationSlug]/dashboard
/association/[associationSlug]/public-page
/association/[associationSlug]/applications
/association/[associationSlug]/applications/new
/association/[associationSlug]/applications/[cycleId]
/association/[associationSlug]/applications/[cycleId]/questions
/association/[associationSlug]/candidates
/association/[associationSlug]/candidates/[applicationId]
/association/[associationSlug]/interviews
/association/[associationSlug]/board
/association/[associationSlug]/permissions
/association/[associationSlug]/settings
```

### 24.4 Admin

```text
/admin
/admin/invitations
/admin/associations
/admin/users
/admin/applications
/admin/knowledge-base
/admin/ai-logs
/admin/audit-logs
```

---

## 25. Mobile App Screens

### 25.1 Shared

```text
AuthWelcome
Login
Signup
VerifyEmail
RoleSwitcher
Notifications
Profile
```

### 25.2 Student

```text
StudentHome
AssociationDiscovery
AssociationPublicPage
ApplyStart
Onboarding
TranscriptUpload
ApplicationQuestions
SubmissionReview
ApplicationStatus
StudentApplications
```

### 25.3 Association President / Board

```text
AssociationHome
AssociationCycleList
CandidateList
CandidateDetail
AIEvaluationDetail
CandidateNotes
ChangeStatus
InterviewInvite
BoardMembers
InviteBoardMember
BasicPermissions
```

### 25.4 Admin Mobile

Admin console is web-first for security and complexity.

A minimal mobile admin view can be added later for urgent notifications and invitation status, but is not required in the first build unless explicitly approved.

---

## 26. MIRA Admin Console

### 26.1 Access

Route:

```text
/admin
```

Only users with `mira_admin` role can access.

Admin routes must not appear in navigation for normal users.

### 26.2 Admin Capabilities

MIRA admin can:

- view dashboard overview;
- invite association presidents;
- view all invitations;
- revoke invitations;
- view all associations;
- approve/edit/disable association pages;
- view all users;
- view all student profiles;
- view all application cycles;
- view all applications;
- correct data;
- manage support issues;
- upload knowledge base documents;
- reprocess knowledge documents;
- view AI evaluation logs;
- view audit logs;
- override association permissions only when necessary;
- prepare future company invitation flows.

### 26.3 Admin Invitation Types

Initial:

- `association_president`.

Future-ready:

- `company_admin`;
- `company_recruiter`;
- `university_admin`;
- `mira_admin`.

---

## 27. Admin Knowledge Base

### 27.1 Purpose

MIRA admin must upload knowledge base documents directly from MIRA, not manually through Supabase.

### 27.2 Route

```text
/admin/knowledge-base
```

### 27.3 Supported Sources

- PDF;
- DOCX;
- TXT;
- CSV;
- Markdown;
- website URL;
- pasted text.

### 27.4 Flow

1. Admin uploads or enters source.
2. File is saved in Supabase Storage.
3. Metadata record is created.
4. Processing status becomes `pending`.
5. Text extraction runs.
6. Text is chunked.
7. Embeddings are generated.
8. Chunks are stored.
9. Status becomes `processed`.
10. AI modules can retrieve relevant chunks.

### 27.5 Processing Statuses

- `pending`;
- `processing`;
- `processed`;
- `failed`;
- `archived`.

### 27.6 Metadata

Knowledge document metadata:

- title;
- source type;
- category;
- visibility scope;
- uploaded by;
- linked association;
- linked university;
- linked application cycle;
- original file;
- processing status;
- error message if failed;
- created_at;
- updated_at.

### 27.7 Visibility Scopes

- `global_mira`;
- `association_specific`;
- `university_specific`;
- `application_cycle_specific`;
- `admin_only`;
- `ai_internal_only`.

---

## 28. Database Tables

The following tables are required or strongly recommended for the first build.

### 28.1 `profiles`

General user profile linked to Supabase Auth.

Fields:

```text
id uuid primary key
auth_user_id uuid references auth.users
full_name text
email text
email_domain text
avatar_url text
global_roles text[]
created_at timestamp
updated_at timestamp
last_login_at timestamp
```

### 28.2 `student_profiles`

Student-specific profile.

```text
id uuid primary key
user_id uuid references profiles(id)
university text default 'Bocconi University'
university_email text
degree_program text
degree_level text
current_year text
onboarding_completed boolean default false
transcript_uploaded boolean default false
transcript_summary jsonb
interests jsonb
goals jsonb
experiences jsonb
created_at timestamp
updated_at timestamp
```

### 28.3 `association_profiles`

```text
id uuid primary key
name text
slug text unique
logo_url text
category text
short_description text
long_description text
website_url text
social_links jsonb
sectors text[]
recruiting_timeline jsonb
team_structure jsonb
public_page_status text
verification_status text
created_by_user_id uuid references profiles(id)
created_at timestamp
updated_at timestamp
```

### 28.4 `association_memberships`

```text
id uuid primary key
association_id uuid references association_profiles(id)
user_id uuid references profiles(id)
role text
title text
permissions jsonb
status text
invited_by_user_id uuid references profiles(id)
joined_at timestamp
created_at timestamp
updated_at timestamp
```

### 28.5 `invitations`

Generic invitation table.

```text
id uuid primary key
invitation_type text
invited_email text
invited_role text
invited_permissions jsonb
token_hash text
status text
expires_at timestamp
accepted_by_user_id uuid references profiles(id)
created_by_user_id uuid references profiles(id)
linked_entity_type text
linked_entity_id uuid
metadata jsonb
created_at timestamp
accepted_at timestamp
revoked_at timestamp
```

Initial invitation types:

- `association_president`;
- `association_board_member`.

Future invitation types:

- `company_admin`;
- `company_recruiter`;
- `university_admin`;
- `mira_admin`.

### 28.6 `application_cycles`

```text
id uuid primary key
association_id uuid references association_profiles(id)
title text
description text
status text
opens_at timestamp
closes_at timestamp
target_students jsonb
available_roles jsonb
evaluation_criteria jsonb
created_by_user_id uuid references profiles(id)
created_at timestamp
updated_at timestamp
```

### 28.7 `application_questions`

```text
id uuid primary key
application_cycle_id uuid references application_cycles(id)
question_text text
question_type text
required boolean
order_index integer
options jsonb
helper_text text
ai_evaluated boolean
visibility text
created_at timestamp
updated_at timestamp
```

### 28.8 `applications`

```text
id uuid primary key
application_cycle_id uuid references application_cycles(id)
association_id uuid references association_profiles(id)
student_user_id uuid references profiles(id)
student_profile_id uuid references student_profiles(id)
status text
submitted_at timestamp
last_status_change_at timestamp
created_at timestamp
updated_at timestamp
```

### 28.9 `application_answers`

```text
id uuid primary key
application_id uuid references applications(id)
question_id uuid references application_questions(id)
answer_text text
answer_json jsonb
file_url text
created_at timestamp
updated_at timestamp
```

### 28.10 `student_transcripts`

```text
id uuid primary key
student_profile_id uuid references student_profiles(id)
uploaded_file_id uuid
extraction_status text
extracted_data jsonb
summary text
created_at timestamp
updated_at timestamp
```

### 28.11 `candidate_ai_evaluations`

```text
id uuid primary key
application_id uuid references applications(id)
model_provider text
model_name text
input_snapshot jsonb
evaluation_json jsonb
fit_category text
internal_score integer
summary text
strengths jsonb
gaps jsonb
recommendation text
confidence text
created_at timestamp
updated_at timestamp
```

### 28.12 `application_status_events`

```text
id uuid primary key
application_id uuid references applications(id)
previous_status text
new_status text
changed_by_user_id uuid references profiles(id)
note text
visible_to_candidate boolean default true
created_at timestamp
```

### 28.13 `candidate_internal_notes`

```text
id uuid primary key
application_id uuid references applications(id)
author_user_id uuid references profiles(id)
note_text text
visibility text
created_at timestamp
updated_at timestamp
```

### 28.14 `interview_invites`

```text
id uuid primary key
application_id uuid references applications(id)
association_id uuid references association_profiles(id)
sent_by_user_id uuid references profiles(id)
candidate_user_id uuid references profiles(id)
proposed_times jsonb
selected_time timestamp
location_or_link text
message text
status text
created_at timestamp
updated_at timestamp
```

### 28.15 `uploaded_files`

```text
id uuid primary key
owner_user_id uuid references profiles(id)
bucket text
file_path text
file_type text
file_name text
file_size integer
visibility_scope text
linked_entity_type text
linked_entity_id uuid
created_at timestamp
```

### 28.16 `knowledge_documents`

```text
id uuid primary key
title text
source_type text
category text
visibility_scope text
uploaded_file_id uuid references uploaded_files(id)
uploaded_by_user_id uuid references profiles(id)
processing_status text
linked_association_id uuid references association_profiles(id)
linked_university text
linked_application_cycle_id uuid references application_cycles(id)
error_message text
created_at timestamp
updated_at timestamp
```

### 28.17 `knowledge_chunks`

```text
id uuid primary key
knowledge_document_id uuid references knowledge_documents(id)
chunk_index integer
content text
embedding vector
metadata jsonb
created_at timestamp
```

### 28.18 `notifications`

```text
id uuid primary key
recipient_user_id uuid references profiles(id)
type text
title text
body text
linked_entity_type text
linked_entity_id uuid
read_at timestamp
created_at timestamp
```

### 28.19 `audit_logs`

```text
id uuid primary key
actor_user_id uuid references profiles(id)
action text
entity_type text
entity_id uuid
metadata jsonb
created_at timestamp
```

### 28.20 `ai_logs`

```text
id uuid primary key
module text
provider text
model text
input_metadata jsonb
output_metadata jsonb
linked_entity_type text
linked_entity_id uuid
status text
error_message text
created_at timestamp
```

---

## 29. Supabase Storage Buckets

Required buckets:

```text
avatars
association-logos
association-assets
student-transcripts
application-files
knowledge-base
```

Future buckets:

```text
association-projects
company-assets
simulation-materials
simulation-submissions
```

### 29.1 Storage Rules

- student transcripts are private;
- association logos can be public;
- knowledge base files are admin/private unless explicitly scoped;
- application files are visible only to authorized association users and applicant;
- signed URLs should be used for private file access.

---

## 30. Row-Level Security and Permissions

### 30.1 RLS Requirement

Enable RLS on all sensitive tables.

Sensitive tables include:

- profiles;
- student_profiles;
- association_profiles when unpublished/private;
- association_memberships;
- invitations;
- application_cycles;
- applications;
- application_answers;
- student_transcripts;
- candidate_ai_evaluations;
- internal notes;
- knowledge documents;
- AI logs;
- audit logs.

### 30.2 Access Rules

#### Student

Can access:

- own profile;
- own student profile;
- own applications;
- own answers;
- own transcript metadata;
- public association pages;
- open application cycles.

Cannot access:

- other students' applications;
- association review notes;
- AI logs;
- internal board notes;
- admin console.

#### Association User

Can access:

- own association workspace;
- candidates for own association if permission allows;
- candidate fields permitted by role;
- AI evaluation if permission allows.

Cannot access:

- other associations' candidates;
- unrelated student private data;
- admin-only knowledge documents.

#### MIRA Admin

Can access all operational data necessary for support and moderation.

Admin access must be logged.

### 30.3 Raw Transcript Access

Raw transcript PDF access must be separately permissioned.

Recommended first-build rule:

- associations see transcript summary by default;
- raw PDF visible only if application cycle setting allows and student consent is captured.

---

## 31. AI Modules for First Build

### 31.1 `AI_MODULE_ASSOCIATION_PAGE_GENERATOR`

Purpose:

- generate draft public association page from website URL or pasted text.

Inputs:

- association name;
- website URL;
- pasted description;
- uploaded document text;
- category if known.

Output:

```json
{
  "short_description": "string",
  "long_description": "string",
  "sectors": ["string"],
  "team_structure": ["string"],
  "suggested_category": "string",
  "missing_information": ["string"],
  "confidence": "low | medium | high"
}
```

Rules:

- draft only;
- president must confirm;
- do not invent achievements;
- mark uncertain information.

### 31.2 `AI_MODULE_TRANSCRIPT_PARSER_BASIC`

Purpose:

- extract academic information from transcript/libretto.

Inputs:

- uploaded PDF text or extracted document text;
- student-declared degree info.

Output:

```json
{
  "degree_program": "string | null",
  "degree_level": "string | null",
  "courses": [
    {
      "name": "string",
      "grade": "string | null",
      "credits": "number | null",
      "year": "string | null"
    }
  ],
  "weighted_average": "number | null",
  "summary": "string",
  "extraction_confidence": "low | medium | high",
  "warnings": ["string"]
}
```

Rules:

- do not guess grades;
- mark uncertain extractions;
- allow manual correction later.

### 31.3 `AI_MODULE_STUDENT_ONBOARDING_SUMMARIZER`

Purpose:

- summarize onboarding answers into initial student profile.

Inputs:

- onboarding answers;
- academic profile;
- transcript summary.

Output:

```json
{
  "student_summary": "string",
  "interests": ["string"],
  "goals": ["string"],
  "experiences": ["string"],
  "working_style_signals": ["string"],
  "potential_profile_tags": ["string"],
  "uncertainties": ["string"]
}
```

Rules:

- human tone;
- no psychological diagnosis;
- no exaggerated claims;
- separate evidence and inference.

### 31.4 `AI_MODULE_APPLICATION_EVALUATOR`

Defined in section 19.

### 31.5 `AI_MODULE_KNOWLEDGE_BASE_QA_ADMIN`

Purpose:

- allow MIRA admin to query internal knowledge base later.

Initial build can implement upload first and QA later if necessary.

---

## 32. API / Server Actions

Recommended server-side operations:

### Auth and Profiles

```text
createProfileAfterSignup
validateBocconiEmailDomain
completeStudentOnboarding
uploadTranscript
parseTranscript
```

### Invitations

```text
createInvitation
acceptInvitation
revokeInvitation
listInvitations
```

### Associations

```text
createAssociationFromInvitation
updateAssociationProfile
publishAssociationPage
listAssociations
getAssociationBySlug
```

### Board

```text
inviteBoardMember
acceptBoardInvitation
updateBoardMemberPermissions
removeBoardMember
listBoardMembers
```

### Application Cycles

```text
createApplicationCycle
updateApplicationCycle
openApplicationCycle
closeApplicationCycle
archiveApplicationCycle
createApplicationQuestion
updateApplicationQuestion
reorderApplicationQuestions
```

### Student Applications

```text
startApplication
saveApplicationAnswer
submitApplication
getStudentApplications
withdrawApplication
```

### Candidate Review

```text
listCandidates
getCandidateDetail
generateCandidateAIEvaluation
changeCandidateStatus
addCandidateInternalNote
sendInterviewInvite
```

### Admin

```text
adminListUsers
adminListAssociations
adminInviteAssociationPresident
adminUpdateAssociationStatus
adminUploadKnowledgeDocument
adminReprocessKnowledgeDocument
adminViewAILogs
adminViewAuditLogs
```

---

## 33. Analytics and Audit Logs

### 33.1 Product Events

Track:

- signup started;
- email verified;
- onboarding started;
- onboarding completed;
- transcript uploaded;
- transcript parsed;
- association page viewed;
- application started;
- application submitted;
- AI evaluation generated;
- candidate status changed;
- interview invite sent;
- president invited;
- board member invited;
- board member accepted.

### 33.2 Audit Events

Audit:

- invitation created/revoked/accepted;
- role assigned;
- permissions changed;
- application status changed;
- raw transcript accessed;
- AI evaluation regenerated;
- admin data correction;
- association page published/disabled.

---

## 34. Out of Scope for First Build

Do not build yet unless explicitly approved:

- company recruiting product;
- company matching;
- anonymous company chat;
- full simulations;
- micro-exercise system;
- surgical orientation;
- multi-university support beyond schema readiness;
- Stripe payments;
- university admin dashboard;
- advanced analytics;
- full calendar scheduling integration;
- association project analysis, unless added as next slice;
- public leaderboards;
- student premium.

However, the architecture must not block these future modules.

---

## 35. Acceptance Criteria

### 35.1 Student Acceptance Criteria

A Bocconi student can:

- register only with `@studbocconi.it` email;
- verify email;
- complete onboarding;
- upload transcript;
- apply to an open association cycle;
- answer custom questions;
- submit application;
- view application status;
- receive status notification.

### 35.2 Association Acceptance Criteria

A president can:

- accept official MIRA invitation;
- access association workspace;
- edit public page;
- create/open/close application cycle;
- create custom questions;
- invite board members;
- manage board permissions;
- view candidate list;
- view candidate detail;
- generate/read AI evaluation;
- change candidate status;
- send interview invitation.

A board member can:

- accept invitation;
- keep student account;
- switch to association role;
- access only permitted features;
- review candidates if permitted.

### 35.3 Admin Acceptance Criteria

MIRA admin can:

- access hidden admin console;
- invite association presidents;
- view invitations;
- revoke invitations;
- view users;
- view associations;
- view applications;
- correct data;
- upload knowledge base documents;
- view AI logs/audit logs at least minimally.

### 35.4 Security Acceptance Criteria

- unauthorized users cannot access admin routes;
- students cannot access other students' applications;
- associations cannot access other associations' candidates;
- board permissions are enforced server-side;
- raw transcript access is controlled;
- sensitive actions are audited.

### 35.5 Mobile Acceptance Criteria

Mobile supports:

- auth;
- role switcher;
- student application flow;
- application status tracking;
- president/board candidate review basics;
- status changes if permitted;
- notifications or notification-ready structure.

---

## 36. Development Sequence

### Sprint 0 — Project Foundation

- create monorepo;
- setup web app;
- setup mobile app shell;
- setup shared packages;
- setup Supabase project;
- setup environment variables;
- setup GitHub;
- setup deployment pipeline.

### Sprint 1 — Auth, Profiles, Roles

- Supabase Auth;
- Bocconi domain validation;
- profile creation;
- student profile table;
- global roles;
- role switcher foundation;
- admin seed user mechanism.

### Sprint 2 — Admin Invitations and Association Workspace

- admin console basic;
- invitation table;
- invite association president;
- accept invitation;
- create association workspace;
- president role;
- association page draft/edit.

### Sprint 3 — Application Cycles and Questions

- create cycle;
- question builder;
- open/close cycle;
- public association page;
- apply CTA.

### Sprint 4 — Student Onboarding and Transcript Upload

- forced onboarding;
- transcript upload;
- transcript table;
- basic parser abstraction;
- onboarding summary.

### Sprint 5 — Application Submission

- answer questions;
- save drafts;
- submit application;
- candidate list;
- student status page.

### Sprint 6 — AI Evaluation and Candidate Review

- AI module abstraction;
- application evaluator;
- candidate detail;
- AI evaluation display;
- internal notes;
- status workflow.

### Sprint 7 — Board Invitations and Permissions

- president invites board;
- board accepts;
- permission management;
- server-side permission checks;
- role switcher complete.

### Sprint 8 — Interview Workflow and Notifications

- interview invites;
- email/in-app notifications;
- status notifications;
- deadline notifications.

### Sprint 9 — Mobile Association Experience

- mobile student flow;
- mobile role switcher;
- mobile candidate review;
- mobile status change;
- mobile interview view.

### Sprint 10 — Admin Knowledge Base

- upload knowledge documents;
- metadata;
- storage;
- processing status;
- chunking/embedding foundation if feasible;
- admin document list.

### Sprint 11 — QA, Security, Launch Prep

- RLS review;
- manual test flows;
- edge cases;
- error states;
- admin controls;
- production deployment;
- first association onboarding.

---

## 37. Instructions for AI Coding Tools

Use these instructions when working with Claude Code, Replit Agent, Cursor or any AI coding assistant.

### 37.1 Initial Prompt

```text
Read docs/MIRA_MASTER_PRODUCT_SPEC.md.
Read docs/MIRA_ASSOCIATIONS_FIRST_BUILD.md.
This is a production-oriented build, not a prototype.
Do not build the full MIRA product yet.
Build only the Associations First Build scope.
Before writing code, inspect the repository and propose an implementation plan.
Wait for approval before implementing.
```

### 37.2 Implementation Rules

- build in small steps;
- use real database tables;
- use migrations;
- use real auth;
- enforce permissions server-side;
- do not hardcode associations/candidates;
- do not create fake AI outputs in production paths;
- keep AI provider abstracted;
- use environment variables;
- commit stable milestones;
- test each user flow;
- do not expand scope without approval.

### 37.3 Current Scope Reminder

Build now:

- Bocconi auth;
- student onboarding;
- transcript upload;
- association public pages;
- president invitations;
- board invitations;
- application cycles;
- custom questions;
- candidate review;
- AI evaluation;
- status workflow;
- admin console;
- knowledge base upload foundation;
- mobile support for students and association users.

Do not build now:

- companies;
- simulations;
- orientation;
- payments;
- multi-university expansion.

### 37.4 Quality Bar

The system should be good enough for real associations to use for real candidate selection.

If a shortcut would make the feature impossible to trust in a real recruiting cycle, do not take that shortcut.
