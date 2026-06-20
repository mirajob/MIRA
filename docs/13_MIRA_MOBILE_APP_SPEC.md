# MIRA Mobile App Specification

**Version:** 1.0  
**Date:** 2026-06-15  
**Status:** Native mobile app blueprint  
**Framework:** Expo / React Native with TypeScript  

---

## 0. Purpose

This document defines the MIRA mobile app.

MIRA is not only a web application. Students, association presidents and board members must be able to use MIRA from mobile.

The mobile app must share the same backend, authentication, user identity, roles, permissions, AI service layer and database as the web app.

---

## 1. Core Principles

### 1.1 One Platform, Not Separate Products

The mobile app is a client of the same MIRA platform.

Do not create a separate mobile backend.

Mobile app uses:

- Supabase Auth;
- Supabase Postgres;
- Supabase Storage;
- shared API/server actions where appropriate;
- shared TypeScript types;
- same permissions;
- same role model.

### 1.2 Multi-Role Mobile Experience

A user can be:

- student;
- association president;
- association board member;
- MIRA admin future limited mobile;
- company recruiter future.

Mobile must support role switching.

### 1.3 Mobile Is Not Passive

The app is not only for reading notifications.

Association presidents and board members must be able to review candidates and perform core recruiting actions from mobile.

### 1.4 Desktop-Only Where Necessary

Some tasks remain desktop-only:

- deep simulations;
- complex candidate bulk review;
- large table exports;
- heavy admin operations;
- advanced question builder editing if not practical on mobile.

Mobile must explain desktop-only constraints clearly.

---

## 2. Technical Architecture

### 2.1 Framework

Use Expo / React Native with TypeScript.

Recommended structure:

```text
apps/mobile/
  app/
    _layout.tsx
    index.tsx
    auth/
    student/
    association/
    admin/
    company/ future
  src/
    components/
    navigation/
    screens/
    hooks/
    lib/
    theme/
```

### 2.2 Shared Packages

Mobile should import shared logic from:

```text
packages/types
packages/supabase
packages/domain
packages/ui where compatible
packages/config
```

### 2.3 API Access Pattern

Mobile should not use service role keys.

Allowed:

- Supabase client with anon key and RLS;
- authenticated API endpoints for server-side actions;
- signed upload URLs where appropriate;
- edge functions future.

Disallowed:

- direct use of AI provider keys in mobile;
- direct use of Supabase service role key;
- bypassing RLS.

---

## 3. Mobile Navigation

### 3.1 Global Navigation

Mobile app starts with a context-aware home.

Basic tabs for Student Mode:

```text
Home
Associations
Applications
Profile
```

Association Mode tabs:

```text
Dashboard
Candidates
Applications
Board
Settings
```

Future Company Mode tabs:

```text
Dashboard
Searches
Candidates
Chats
Profile
```

### 3.2 Role Switcher

Role switcher must be available from:

- home header;
- profile/settings screen;
- contextual switch prompt after accepting invitation.

Role switcher shows only roles the user has.

Example:

```text
Current mode: Student
Switch to:
- President of BSIC
- Reviewer for M&A Circle
- MIRA Admin future
```

### 3.3 Deep Links

Mobile must support deep links for:

- email verification;
- association president invitation;
- board invitation;
- application page;
- interview invite;
- company contact request future;
- password reset.

Example scheme:

```text
mira://invite/association/:token
mira://applications/:id
mira://chats/:threadId
```

---

## 4. Authentication Mobile Flow

### 4.1 Sign Up

Student signs up with `@studbocconi.it` email in first build.

Steps:

1. Enter email.
2. Validate domain client-side and server-side.
3. Send verification email.
4. Open verification link.
5. Create profile.
6. Enter Student Mode.

### 4.2 Login

Support:

- email/password if used;
- magic link if chosen;
- session persistence;
- password reset.

### 4.3 Invitation Acceptance

If user opens invitation link on mobile:

- if authenticated as matching email, show accept screen;
- if authenticated as different email, show mismatch warning;
- if not authenticated, require signup/login with invited email;
- after acceptance, show role switch prompt.

---

## 5. Student Mobile Features

### 5.1 Student Home

Shows:

- active applications;
- next required actions;
- recommended associations;
- profile progress;
- notifications;
- future simulations/orientation cards.

### 5.2 Association Discovery

Students can:

- browse associations;
- search;
- filter by category;
- view public association pages;
- see application status open/closed;
- start application.

### 5.3 Public Association Page

Mobile page includes:

- logo;
- name;
- category;
- description;
- sectors;
- recruiting timeline;
- team preview;
- open application cycles;
- Apply button.

### 5.4 Application Flow

Student can:

- start application;
- complete onboarding;
- upload transcript;
- answer questions;
- save draft;
- submit;
- track status.

### 5.5 Transcript Upload Mobile

Mobile should support:

- file picker;
- PDF upload;
- image upload optional future;
- upload progress;
- processing status;
- retry failed upload.

### 5.6 Application Status

Statuses:

```text
submitted
in_review
interview
accepted
rejected
waitlisted
withdrawn
```

Student sees:

- current status;
- last update;
- message if provided;
- interview invitation;
- next step.

---

## 6. Association President Mobile Features

President can:

- switch to President Mode;
- view association dashboard;
- see active application cycles;
- open/close application cycle if permitted;
- view candidate list;
- filter candidates;
- open candidate detail;
- read answers;
- read AI evaluation;
- change candidate status;
- send interview invite;
- add internal note;
- invite board member;
- manage basic permissions;
- receive notifications.

### 6.1 President Dashboard

Shows:

- active cycle;
- candidates count;
- pending reviews;
- interviews scheduled;
- board activity;
- urgent actions.

### 6.2 Candidate Review Mobile

Candidate detail should be optimized as stacked sections:

```text
Candidate summary
Application answers
AI evaluation
Academic context
Internal notes
Status actions
Interview actions
Audit timeline
```

### 6.3 Permission Management Mobile

Mobile can support basic permission templates.

Advanced granular permission editing can be web-first, but president must be able to:

- invite member;
- set role template;
- disable member;
- promote/demote common roles.

---

## 7. Association Board Mobile Features

Board members can:

- switch to Board Mode;
- view assigned candidates or all candidates if permitted;
- review candidate data allowed by permissions;
- add internal notes;
- change status if permitted;
- view interview schedule;
- receive notifications.

Board members must not see restricted fields.

Permissions must be enforced server-side, not only hidden in UI.

---

## 8. Notifications

### 8.1 Notification Types

Student:

```text
application_submitted
application_status_changed
interview_invite_received
association_invitation_accepted
company_contact_request future
message_received future
```

Association:

```text
new_candidate_submitted
candidate_ai_evaluation_ready
candidate_status_changed
interview_response_received
board_member_joined
application_cycle_closing_soon
```

Admin:

```text
association_president_invitation_accepted
company_access_request future
knowledge_document_processing_failed
```

### 8.2 Push Notifications

Use Expo Notifications or equivalent.

Push notification content must avoid sensitive data.

Bad:

```text
Marco Rossi scored weak fit for BSIC.
```

Good:

```text
A candidate evaluation is ready.
```

---

## 9. Mobile UI Components

Required reusable components:

```text
RoleSwitcher
ModeHeader
StatusBadge
ApplicationCard
AssociationCard
CandidateCard
CandidateFitBadge
PermissionGate
NotificationItem
FileUploadBox
AIInsightCard
EmptyState
LoadingState
ErrorState
ActionSheet
ConfirmModal
```

---

## 10. Offline and Error Behavior

Mobile should handle:

- network offline;
- upload failure;
- session expired;
- permission revoked;
- invitation expired;
- application closed;
- AI evaluation not ready;
- file too large;
- unsupported file type.

Offline support can be limited in first version.

Minimum requirement:

- clear error messages;
- retry actions;
- no silent data loss;
- draft saving for application answers where possible.

---

## 11. Mobile-Specific Security

- Never store service role keys.
- Use secure storage for session tokens if needed.
- Respect Supabase Auth session handling.
- Enforce permissions server-side.
- Avoid sensitive push notification content.
- Do not cache raw transcript files unnecessarily.
- Clear sensitive screens on logout.

---

## 12. App Store Readiness Future

Before publishing native apps:

- Apple Developer account;
- Google Play Console account;
- privacy policy;
- terms of service;
- app screenshots;
- support email;
- data safety forms;
- push notification permissions;
- production backend;
- crash monitoring;
- analytics consent if required.

The first mobile build can be distributed internally via Expo/EAS/TestFlight future.

---

## 13. Mobile Build Sequence

Recommended sequence:

1. Expo app shell.
2. Auth.
3. Role switcher.
4. Student home.
5. Association discovery.
6. Application status.
7. President/board dashboard.
8. Candidate list/detail.
9. Notifications.
10. Invitation deep links.
11. Polish and internal testing.

---

## 14. Acceptance Criteria for First Mobile Release

Mobile is ready for first release when:

- student can log in;
- student can view associations;
- student can track applications;
- student can complete or resume application flow;
- president can switch to association mode;
- board can review candidates;
- permissions are respected;
- status updates work;
- notifications are supported or prepared;
- no separate backend exists.

---

## 15. Future Mobile Features

Future:

- full AI chat-centric interface;
- micro-exercises;
- orientation widgets;
- anonymous company chat;
- identity reveal controls;
- mobile profile visibility center;
- project upload;
- voice input optional;
- native document scanning optional.

