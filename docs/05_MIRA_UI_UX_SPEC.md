# MIRA UI and UX Specification

**Version:** 1.0  
**Date:** 2026-06-15  
**Status:** Web and mobile interface blueprint  

---

## 0. Purpose

This document defines the user interface requirements for MIRA across web and mobile.

It is not a visual brand book. It is a functional UX specification for building product screens, navigation, components, states and responsive behavior.

MIRA must feel like a serious AI-first university talent platform, not a generic form builder or dashboard template.

---

## 1. UI Principles

### 1.1 AI-First, But Not AI-Only

Students should experience MIRA as guided, conversational and personalized.

Operational users need dashboards where dashboards are useful:

- association presidents;
- board members;
- MIRA admin;
- future company recruiters;
- future university admins.

The product should combine:

- conversational guidance;
- structured workflows;
- contextual widgets;
- clear operational dashboards.

### 1.2 One Product Across Web and Mobile

Web and mobile must share:

- visual language;
- information architecture;
- role model;
- user identity;
- core components;
- status labels;
- permissions.

Mobile is not a read-only companion. Association presidents and board members must be able to perform meaningful actions from mobile.

### 1.3 Clarity Over Decoration

The UI must prioritize:

- trust;
- clarity;
- fast review;
- privacy transparency;
- evidence-based profile signals.

Avoid excessive animations, generic startup gradients or decorative UI that reduces seriousness.

### 1.4 Every State Must Be Designed

For every screen, define:

- loading state;
- empty state;
- error state;
- permission denied state;
- success state;
- destructive action confirmation;
- mobile layout.

---

## 2. Recommended UI Stack

### Web

- Next.js;
- TypeScript;
- Tailwind CSS;
- shadcn/ui or equivalent component primitives;
- React Hook Form or equivalent for forms;
- Zod for validation schemas.

### Mobile

- Expo;
- React Native;
- TypeScript;
- shared types and domain logic;
- native navigation;
- push notification readiness.

### Shared Design Tokens

Create shared tokens for:

- spacing;
- radius;
- typography scale;
- status labels;
- button sizes;
- semantic colors;
- component variants.

Do not hardcode component styling inconsistently across web and mobile.

---

## 3. Information Architecture

### 3.1 Public Web Routes

```text
/
/login
/signup
/auth/callback
/associations
/associations/[slug]
/associations/[slug]/apply
/company/request-access     future
```

### 3.2 Student Routes

```text
/student
/student/onboarding
/student/profile
/student/applications
/student/applications/[id]
/student/associations
/student/simulations        future
/student/orientation        future
/student/company-chats      future
/settings
```

### 3.3 Association Routes

```text
/association/[associationSlug]
/association/[associationSlug]/dashboard
/association/[associationSlug]/public-page
/association/[associationSlug]/cycles
/association/[associationSlug]/cycles/[cycleId]
/association/[associationSlug]/questions
/association/[associationSlug]/candidates
/association/[associationSlug]/candidates/[applicationId]
/association/[associationSlug]/interviews
/association/[associationSlug]/board
/association/[associationSlug]/permissions
/association/[associationSlug]/settings
```

### 3.4 Admin Routes

```text
/admin
/admin/users
/admin/associations
/admin/applications
/admin/invitations
/admin/knowledge-base
/admin/ai-logs
/admin/audit-logs
/admin/support
/admin/companies          future
```

### 3.5 Future Company Routes

```text
/company
/company/profile
/company/searches
/company/searches/[id]
/company/candidates/[matchId]
/company/chats
/company/pipeline
/company/settings
/company/billing
```

---

## 4. Global Navigation

### 4.1 Web Layout

Authenticated web layout:

- top bar with logo, role switcher, notifications, account menu;
- optional left sidebar depending on active context;
- main content area;
- right contextual panel where useful.

Student Mode can use simpler navigation.

Association/Admin/Company modes should use sidebar navigation because workflows are operational.

### 4.2 Mobile Layout

Authenticated mobile layout:

- top header with current context;
- role switcher accessible from header/profile;
- bottom tab navigation for main areas;
- full-screen overlays for detailed widgets/actions;
- push notification entry points.

Student mobile tabs initial:

```text
Home
Associations
Applications
Profile
```

Association mobile tabs initial:

```text
Dashboard
Candidates
Cycles
Board
Profile
```

Admin mobile can be limited initially, but admin web must be complete.

---

## 5. Role Switcher

### Purpose

Allows one user to switch between available contexts without logging out.

### Web Behavior

Location:

- top-left or sidebar header.

Display:

```text
Current mode: Student
Switch to:
- Student
- President of BSIC
- Reviewer for Finance Club
- MIRA Admin
```

When user switches context:

- navigation changes;
- permissions change;
- default landing page changes;
- data queries must use active context.

### Mobile Behavior

Location:

- profile menu;
- top header context selector;
- optional home context card.

Use a bottom sheet or full-screen selection modal.

### Empty State

If user has only Student Mode, do not show a complex switcher. Show simple profile menu.

---

## 6. Public Association Page UI

### Desktop Layout

Sections:

1. Hero:
   - logo;
   - association name;
   - category;
   - short description;
   - Apply button.
2. Recruiting status card:
   - open/closed/opening soon;
   - deadline;
   - available roles;
   - CTA.
3. About section.
4. Sectors/interests tags.
5. Team structure.
6. Website/social links.
7. Future projects/reports section.

### Mobile Layout

- Hero compressed;
- sticky Apply button at bottom when applications open;
- recruiting deadline visible above fold;
- sections as stacked cards.

### States

- applications open;
- applications closed;
- page draft/unavailable;
- loading;
- not found.

---

## 7. Student Signup UI

### Requirements

Signup must make the Bocconi email rule clear.

Main fields:

- email;
- optional full name depending on auth flow.

Copy example:

```text
MIRA is currently open to Bocconi students.
Use your @studbocconi.it email to continue.
```

### Error Examples

Wrong email domain:

```text
This launch is currently restricted to Bocconi student emails ending in @studbocconi.it.
```

Expired verification:

```text
This verification link has expired. Send a new link.
```

---

## 8. Student Onboarding UI

### Format

Use a guided conversational flow, not a long static form.

The UI can combine:

- chat-like prompts;
- structured input cards;
- file upload card;
- progress indicator;
- profile summary preview.

### Steps

1. Welcome.
2. Academic basics.
3. Transcript upload.
4. Conversational questions.
5. MIRA profile summary.
6. Confirmation.

### Progress UI

Show simple progress:

```text
Step 2 of 5: Academic profile
```

Do not make onboarding feel like a test.

### Transcript Upload Component

States:

- empty;
- dragging file;
- uploading;
- uploaded;
- parsing;
- parsed;
- parse failed;
- replace file.

Display after parsing:

- degree program;
- courses extracted count;
- weighted average if available;
- confidence;
- warning if extraction uncertain.

---

## 9. Student Application UI

### Application Flow Layout

Use a stepper:

1. Requirements;
2. MIRA onboarding status;
3. Association questions;
4. Review and consent;
5. Submit confirmation.

### Association Questions

Each question should be shown clearly with:

- question text;
- helper text;
- required marker;
- character count where applicable;
- autosave state.

Support mobile-friendly input components.

### Review Screen

Must include:

- association/cycle details;
- answers preview;
- transcript status;
- privacy notice;
- consent checkboxes;
- submit button.

### Confirmation Screen

Show:

- application submitted;
- current status;
- what happens next;
- link to status tracker.

---

## 10. Student Application Status UI

### List View

Each application card:

- association logo/name;
- cycle title;
- current status;
- submitted date;
- next action.

### Detail View

Sections:

- status timeline;
- application summary;
- interview invitation if any;
- decision message;
- privacy/visibility info.

Do not show internal AI evaluation or board notes.

---

## 11. Association President Dashboard UI

### Desktop Overview

Cards:

- active application cycles;
- total candidates;
- candidates by status;
- pending AI evaluations;
- upcoming interviews;
- board members;
- urgent actions.

Main actions:

- edit public page;
- create application cycle;
- invite board member;
- review candidates.

### Mobile Overview

Simplified action dashboard:

- active cycle status;
- new candidates count;
- interviews today;
- urgent actions;
- quick links.

Mobile must allow meaningful actions, not only viewing.

---

## 12. Association Public Page Editor UI

### Desktop

Use split layout:

- left: editable fields;
- right: live preview.

Sections:

- identity;
- description;
- sectors;
- team;
- recruiting timeline;
- links;
- AI draft tools;
- publish/review actions.

### AI Draft Tool

Input:

- website URL;
- pasted text;
- uploaded document.

Output:

- draft description;
- extracted sectors;
- suggested category;
- suggested timeline if detected.

Human must approve before applying.

### Mobile

Support basic edits:

- logo;
- short description;
- recruiting status;
- deadline;
- links.

Complex live preview can be web-only in first build.

---

## 13. Application Cycle Builder UI

### Desktop

Sections:

1. Basics;
2. Timeline;
3. Eligibility;
4. Roles/teams;
5. Questions;
6. Evaluation criteria;
7. Preview;
8. Publish.

### Question Builder

Question item includes:

- text;
- type;
- required toggle;
- helper text;
- options;
- order drag handle;
- AI evaluated toggle;
- visibility.

### Mobile

Initial mobile requirements:

- view cycles;
- open/close cycle if permitted;
- see candidate counts;
- edit basic dates/status if permitted.

Full question builder can be web-first, but the architecture must not block future mobile editing.

---

## 14. Candidate Review UI

### Desktop List View

Use a table or dense card list.

Columns:

- candidate name;
- degree program;
- year;
- submitted date;
- status;
- fit category;
- assigned reviewer;
- flags;
- last activity.

Filters:

- status;
- fit category;
- degree program;
- year;
- role preference;
- reviewer;
- has notes;
- AI pending.

Actions:

- open detail;
- change status if permitted;
- assign reviewer later;
- export only if permitted.

### Desktop Detail View

Recommended split layout:

- left: candidate profile and answers;
- right: AI evaluation, notes and status actions.

Sections:

1. Header:
   - name;
   - degree;
   - year;
   - status;
   - role preferences.
2. Application answers.
3. Onboarding summary.
4. Transcript summary.
5. AI evaluation panel.
6. Internal notes.
7. Status history.
8. Interview actions.

### Mobile Candidate Review

Use stacked cards:

1. Candidate header;
2. AI summary card;
3. Answers;
4. Academic profile;
5. Notes;
6. Status actions.

Sticky bottom action bar for permitted actions:

- note;
- status;
- interview.

---

## 15. AI Evaluation Panel UI

### Visible Fields

- overall fit category;
- short summary;
- strengths;
- gaps;
- concerns;
- evidence used;
- recommended next step;
- suggested interview questions;
- confidence.

### Important UX Rule

The panel must visually communicate that AI is support, not final decision.

Add label:

```text
AI-assisted review. Final decisions are made by the board.
```

### Failure State

If failed:

- show failure message;
- allow retry if permitted;
- do not block human review.

---

## 16. Board Management UI

### President View

Table/list of members:

- name;
- email;
- role;
- permissions summary;
- status;
- last active.

Actions:

- invite member;
- edit role;
- edit permissions;
- suspend/remove;
- resend invite.

### Permission Editor

Use grouped toggles:

- Profile/page management;
- Application cycles;
- Candidate access;
- AI evaluation access;
- Status changes;
- Interviews;
- Board management;
- Analytics/export.

Warn when granting sensitive permissions.

---

## 17. Admin Console UI

### Admin Navigation

Sections:

- overview;
- users;
- associations;
- applications;
- invitations;
- knowledge base;
- AI logs;
- audit logs;
- support;
- companies future.

### Admin Overview

Cards:

- total users;
- verified students;
- associations active;
- open application cycles;
- submitted applications;
- pending invitations;
- AI failures;
- support issues.

### Invitations UI

Admin can create invitations for:

- association president;
- future company admin;
- future university admin.

Invitation detail shows:

- invited email;
- type;
- status;
- expiration;
- accepted by;
- linked organization;
- revoke/resend actions.

### Knowledge Base UI

List view:

- title;
- category;
- scope;
- processing status;
- uploaded by;
- created date;
- linked entity;
- actions.

Upload flow:

- file/URL/text input;
- metadata;
- scope;
- processing status screen;
- chunks preview later.

---

## 18. Future Company UI

### Recruiter Dashboard

Sections:

- active searches;
- saved candidates;
- chats;
- pipeline;
- team members;
- billing;
- verification status.

### Natural Language Search UI

Input:

```text
Describe the student you are looking for...
```

Optional structured filters below.

AI returns:

- interpreted criteria;
- candidates;
- explanation;
- uncertainty.

### Anonymous Candidate Card

Display:

- anonymous candidate code;
- university/degree/year;
- AI summary;
- evidence highlights;
- skills;
- fit explanation;
- uncertainties;
- open chat button.

Do not display name, email, face, exact identifying details or raw transcript.

### Anonymous Chat UI

Student sees full company identity.

Company sees anonymous candidate until student reveals identity.

Identity reveal should be an explicit UI action with confirmation.

---

## 19. Future Simulations UI

### Simulation Home

Sections:

- recommended paths;
- active branch;
- micro-exercises;
- unlocked deep simulations;
- progress;
- evidence generated.

### Micro-Exercise UI

Mobile and desktop.

- short prompt;
- interactive answer;
- immediate feedback;
- next exercise;
- progress update.

### Deep Simulation UI

Desktop-only.

- device requirement notice;
- brief;
- materials download;
- AI support panel;
- deliverable upload;
- submission confirmation;
- feedback report.

If opened on mobile:

```text
This simulation requires a computer. You will download files, build deliverables and submit work. Reopen it from desktop when ready.
```

---

## 20. Future Orientation UI

### Chat-Centric Orientation

Student asks questions in chat.

MIRA responds with widgets:

- career path card;
- micro-sector card;
- gap analysis;
- course recommendation;
- simulation path;
- next action plan.

### Gap Analysis Widget

Sections:

- target micro-sector;
- required skills;
- current evidence;
- missing skills;
- specific courses;
- simulations;
- association/project opportunities;
- confidence and source references.

---

## 21. Status Labels

Use consistent labels.

### Application Statuses

- Draft;
- Submitted;
- In Review;
- Interview;
- Accepted;
- Rejected;
- Waitlisted;
- Withdrawn.

### Fit Categories

- Strong Fit;
- Good Fit;
- Uncertain Fit;
- Weak Fit.

### Invitation Statuses

- Pending;
- Accepted;
- Expired;
- Revoked;
- Invalid.

### Processing Statuses

- Uploaded;
- Processing;
- Ready;
- Failed.

---

## 22. Empty States

Examples:

### No Applications Yet - Student

```text
You have not applied to any association yet.
Explore associations and start your first MIRA application.
```

### No Candidates Yet - Association

```text
No candidates yet.
Share your public application page to start receiving applications.
```

### No Board Members Yet

```text
You are the only member of this workspace.
Invite board members to help review candidates.
```

### No Knowledge Documents

```text
No knowledge documents uploaded yet.
Upload documents to make MIRA smarter for evaluations, orientation and analysis.
```

---

## 23. Loading States

Use skeletons for data-heavy pages.

Use progress indicators for:

- file upload;
- transcript parsing;
- AI evaluation;
- knowledge document processing.

AI loading copy must be specific:

```text
Analyzing application evidence...
```

Not generic:

```text
Thinking...
```

---

## 24. Error States

Every error state should include:

- what happened;
- whether user can retry;
- what data is safe;
- support link if needed.

Examples:

Transcript parsing failed:

```text
We uploaded your file, but could not extract the transcript reliably. You can continue, replace the file, or ask MIRA support to review it.
```

AI evaluation failed:

```text
AI evaluation is unavailable right now. Candidate review can continue manually.
```

Permission denied:

```text
You do not have permission to view this section. Ask your association president to update your board permissions.
```

---

## 25. Accessibility and Quality Requirements

- Keyboard navigation for web dashboards.
- Clear focus states.
- Proper labels for form inputs.
- Sufficient contrast.
- Mobile touch targets large enough.
- Avoid information conveyed only by color.
- Tables must have responsive alternatives on mobile.
- Error messages must be human-readable.

---

## 26. Build Rules for Claude Code

1. Build shared components before duplicating UI.
2. Do not hardcode mock data in production pages.
3. Use real loading, empty and error states.
4. Implement role switcher early.
5. Keep mobile requirements visible even when building web first.
6. Do not expose routes only protected by hidden navigation; protect server-side.
7. Make candidate review fast and readable.
8. Do not make association workflows web-only.
9. Do not make student onboarding look like a Google Form.
10. Commit UI milestones with screenshots or notes where possible.
