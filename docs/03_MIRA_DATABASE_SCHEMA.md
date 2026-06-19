# MIRA Database Schema Specification

**Version:** 1.0  
**Date:** 2026-06-15  
**Status:** Supabase Postgres schema blueprint  
**Primary service:** Supabase Postgres  

---

## 0. Purpose

This document defines the database blueprint for MIRA.

The database must support the first production build, focused on associations, while remaining compatible with the full MIRA platform: students, associations, companies, universities, AI profiles, simulations, orientation, knowledge base, analytics and payments.

This document uses SQL-like definitions because Supabase is built on Postgres. SQL is not an additional service. The database service remains Supabase Postgres.

---

## 1. Core Principles

### 1.1 One Identity, Multiple Roles

MIRA uses Supabase Auth for authentication. Each authenticated user maps to one `profiles` record. A profile can have multiple roles through memberships and global role assignments.

A user can be:

- student;
- association president;
- association board member;
- MIRA admin;
- future company recruiter;
- future university admin.

Never create separate login tables for different user types.

### 1.2 Production Schema, Incremental Implementation

The schema can be implemented in phases. Tables required for the first associations build should be created first. Future tables can be added later using migrations.

Do not create prototype-only tables that will need to be thrown away.

### 1.3 Server-Side Authorization

Frontend role checks are not enough.

Every sensitive table must be protected by:

- Supabase Row-Level Security;
- server-side permission checks;
- audit logs for sensitive actions.

### 1.4 Append-Only Sensitive Logs

Sensitive history tables should be append-only:

- `audit_logs`;
- `application_status_events`;
- `ai_logs`;
- future payment events;
- raw transcript access events.

---

## 2. Naming Conventions

- Table names: snake_case plural.
- Primary keys: `id uuid primary key default gen_random_uuid()`.
- Foreign keys: `<entity>_id`.
- Timestamps: `created_at timestamptz default now()`, `updated_at timestamptz default now()`.
- Status fields: enums or constrained text.
- JSON fields: use `jsonb` for flexible structured data.
- Arrays: use `text[]` for simple lists or join tables for query-heavy relationships.
- Do not store secrets in the database unless encrypted and necessary.

---

## 3. Recommended Extensions

```sql
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";
create extension if not exists "vector";
```

`vector` is used only if Supabase Vector/pgvector is used for embeddings.

---

## 4. Enums

Use Postgres enums or constrained text. Enums are useful when values are stable. Constrained text is easier to evolve.

Recommended initial enums:

```sql
create type global_role as enum (
  'student',
  'mira_admin',
  'company_user',
  'university_user'
);

create type invitation_type as enum (
  'association_president',
  'association_board_member',
  'company_admin',
  'company_recruiter',
  'university_admin',
  'mira_admin'
);

create type invitation_status as enum (
  'pending',
  'accepted',
  'expired',
  'revoked',
  'invalid'
);

create type association_role as enum (
  'association_president',
  'association_admin',
  'association_reviewer',
  'association_interviewer',
  'association_member'
);

create type association_page_status as enum (
  'draft',
  'pending_review',
  'published',
  'unpublished',
  'disabled'
);

create type application_cycle_status as enum (
  'draft',
  'open',
  'closed',
  'archived'
);

create type application_status as enum (
  'draft',
  'submitted',
  'in_review',
  'interview',
  'accepted',
  'rejected',
  'waitlisted',
  'withdrawn'
);

create type question_type as enum (
  'short_text',
  'long_text',
  'multiple_choice',
  'checkboxes',
  'dropdown',
  'rating_scale',
  'file_upload',
  'role_preference',
  'availability',
  'case_prompt'
);

create type company_status as enum (
  'invited',
  'pending_verification',
  'verified',
  'rejected',
  'suspended'
);

create type knowledge_processing_status as enum (
  'uploaded',
  'extracting',
  'chunking',
  'embedding',
  'ready',
  'failed'
);

create type visibility_scope as enum (
  'private_to_student',
  'association_application',
  'association_internal',
  'company_anonymous',
  'company_identified',
  'admin_only',
  'global_mira',
  'university_aggregate',
  'ai_internal_only'
);
```

---

## 5. Phase 0 Tables: Associations First Build

These tables are required for the first production build.

### 5.1 `profiles`

General user profile mapped to Supabase Auth.

```sql
create table profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text,
  email text not null unique,
  email_domain text,
  avatar_url text,
  phone text,
  locale text default 'en',
  timezone text,
  onboarding_started_at timestamptz,
  last_login_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

Indexes:

```sql
create index profiles_email_domain_idx on profiles(email_domain);
```

### 5.2 `global_role_assignments`

Stores global roles separate from association or company memberships.

```sql
create table global_role_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  role global_role not null,
  granted_by_user_id uuid references profiles(id),
  created_at timestamptz default now(),
  unique(user_id, role)
);
```

Initial use:

- `student` for verified Bocconi students;
- `mira_admin` for the founder/admin.

### 5.3 `student_profiles`

Student-specific data.

```sql
create table student_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references profiles(id) on delete cascade,
  university text not null default 'Bocconi University',
  university_email text not null,
  degree_program text,
  degree_level text,
  current_year integer,
  graduation_year integer,
  onboarding_completed boolean default false,
  onboarding_completed_at timestamptz,
  transcript_uploaded boolean default false,
  transcript_summary jsonb,
  interests jsonb default '[]'::jsonb,
  goals jsonb default '[]'::jsonb,
  experiences jsonb default '[]'::jsonb,
  working_style jsonb,
  availability jsonb,
  profile_summary text,
  visibility_settings jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

Indexes:

```sql
create index student_profiles_university_idx on student_profiles(university);
create index student_profiles_degree_program_idx on student_profiles(degree_program);
```

### 5.4 `student_transcripts`

Stores extracted transcript metadata. Raw file lives in Supabase Storage and is referenced through `uploaded_files`.

```sql
create table student_transcripts (
  id uuid primary key default gen_random_uuid(),
  student_profile_id uuid not null references student_profiles(id) on delete cascade,
  uploaded_file_id uuid references uploaded_files(id),
  extraction_status text default 'pending',
  extracted_data jsonb,
  weighted_average numeric(5,2),
  total_credits numeric(6,2),
  extraction_confidence text,
  extraction_notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### 5.5 `student_courses`

Normalized course rows extracted from transcript.

```sql
create table student_courses (
  id uuid primary key default gen_random_uuid(),
  student_profile_id uuid not null references student_profiles(id) on delete cascade,
  transcript_id uuid references student_transcripts(id) on delete set null,
  course_name text not null,
  course_code text,
  credits numeric(5,2),
  grade text,
  grade_numeric numeric(5,2),
  academic_year text,
  semester text,
  source text default 'transcript',
  created_at timestamptz default now()
);
```

Indexes:

```sql
create index student_courses_student_idx on student_courses(student_profile_id);
create index student_courses_name_idx on student_courses(course_name);
```

### 5.6 `association_profiles`

Association public and internal profile.

```sql
create table association_profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  category text,
  short_description text,
  long_description text,
  website_url text,
  social_links jsonb default '{}'::jsonb,
  sectors text[],
  recruiting_timeline text,
  team_structure jsonb default '[]'::jsonb,
  contact_email text,
  public_page_status association_page_status default 'draft',
  official boolean default false,
  created_by_user_id uuid references profiles(id),
  approved_by_user_id uuid references profiles(id),
  approved_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### 5.7 `association_memberships`

Connects users to associations with role and permissions.

```sql
create table association_memberships (
  id uuid primary key default gen_random_uuid(),
  association_id uuid not null references association_profiles(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role association_role not null,
  title text,
  permissions jsonb not null default '{}'::jsonb,
  status text default 'active',
  invited_by_user_id uuid references profiles(id),
  joined_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(association_id, user_id)
);
```

Permission keys are defined in `07_MIRA_SECURITY_PRIVACY.md` and `02_MIRA_ASSOCIATIONS_FIRST_BUILD.md`.

### 5.8 `invitations`

Generic invitation table for association presidents, board members, companies and future universities.

```sql
create table invitations (
  id uuid primary key default gen_random_uuid(),
  invitation_type invitation_type not null,
  status invitation_status default 'pending',
  invited_email text not null,
  invited_email_domain text,
  invitation_token text not null unique,
  invited_by_user_id uuid references profiles(id),
  accepted_by_user_id uuid references profiles(id),
  association_id uuid references association_profiles(id),
  company_id uuid references company_profiles(id),
  university_id uuid references university_profiles(id),
  invited_role text,
  invited_permissions jsonb default '{}'::jsonb,
  metadata jsonb default '{}'::jsonb,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

Indexes:

```sql
create index invitations_email_idx on invitations(invited_email);
create index invitations_type_status_idx on invitations(invitation_type, status);
```

### 5.9 `application_cycles`

Association recruiting cycle.

```sql
create table application_cycles (
  id uuid primary key default gen_random_uuid(),
  association_id uuid not null references association_profiles(id) on delete cascade,
  title text not null,
  description text,
  status application_cycle_status default 'draft',
  opens_at timestamptz,
  closes_at timestamptz,
  eligible_students jsonb default '{}'::jsonb,
  available_roles jsonb default '[]'::jsonb,
  evaluation_criteria jsonb default '{}'::jsonb,
  interview_process_description text,
  created_by_user_id uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### 5.10 `application_questions`

Custom questions per application cycle.

```sql
create table application_questions (
  id uuid primary key default gen_random_uuid(),
  application_cycle_id uuid not null references application_cycles(id) on delete cascade,
  question_text text not null,
  question_type question_type not null,
  required boolean default true,
  order_index integer not null default 0,
  options jsonb default '[]'::jsonb,
  helper_text text,
  character_limit integer,
  internal_label text,
  ai_evaluated boolean default true,
  visibility text default 'candidate_and_board',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### 5.11 `applications`

Student application to a specific cycle.

```sql
create table applications (
  id uuid primary key default gen_random_uuid(),
  application_cycle_id uuid not null references application_cycles(id) on delete cascade,
  association_id uuid not null references association_profiles(id) on delete cascade,
  student_user_id uuid not null references profiles(id) on delete cascade,
  student_profile_id uuid not null references student_profiles(id) on delete cascade,
  status application_status default 'draft',
  selected_role_preferences jsonb default '[]'::jsonb,
  privacy_consent jsonb default '{}'::jsonb,
  submitted_at timestamptz,
  last_status_change_at timestamptz,
  withdrawn_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(application_cycle_id, student_user_id)
);
```

### 5.12 `application_answers`

Answers submitted by a student.

```sql
create table application_answers (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications(id) on delete cascade,
  question_id uuid not null references application_questions(id) on delete cascade,
  answer_text text,
  answer_json jsonb,
  uploaded_file_id uuid references uploaded_files(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(application_id, question_id)
);
```

### 5.13 `candidate_ai_evaluations`

AI evaluation for an application.

```sql
create table candidate_ai_evaluations (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications(id) on delete cascade,
  model_provider text not null,
  model_name text not null,
  prompt_version text,
  input_snapshot jsonb not null,
  evaluation_json jsonb not null,
  overall_fit_category text,
  internal_score numeric(5,2),
  strengths jsonb default '[]'::jsonb,
  gaps jsonb default '[]'::jsonb,
  concerns jsonb default '[]'::jsonb,
  fit_summary text,
  recommendation text,
  confidence text,
  created_by_system boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### 5.14 `application_status_events`

Append-only status history.

```sql
create table application_status_events (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications(id) on delete cascade,
  previous_status application_status,
  new_status application_status not null,
  changed_by_user_id uuid references profiles(id),
  note text,
  created_at timestamptz default now()
);
```

### 5.15 `candidate_internal_notes`

Board notes.

```sql
create table candidate_internal_notes (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications(id) on delete cascade,
  author_user_id uuid not null references profiles(id) on delete cascade,
  note_text text not null,
  visibility text default 'association_internal',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### 5.16 `interview_invites`

Interview coordination.

```sql
create table interview_invites (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications(id) on delete cascade,
  association_id uuid not null references association_profiles(id) on delete cascade,
  sent_by_user_id uuid references profiles(id),
  candidate_user_id uuid references profiles(id),
  proposed_times jsonb default '[]'::jsonb,
  selected_time timestamptz,
  location_or_link text,
  message text,
  status text default 'sent',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### 5.17 `uploaded_files`

Generic file registry. Actual files are stored in Supabase Storage.

```sql
create table uploaded_files (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references profiles(id),
  bucket text not null,
  file_path text not null,
  file_type text,
  file_name text,
  file_size bigint,
  visibility_scope visibility_scope not null,
  linked_entity_type text,
  linked_entity_id uuid,
  checksum text,
  created_at timestamptz default now()
);
```

### 5.18 `knowledge_documents`

Admin knowledge base documents.

```sql
create table knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  source_type text not null,
  category text,
  visibility_scope visibility_scope not null,
  uploaded_file_id uuid references uploaded_files(id),
  uploaded_by_user_id uuid references profiles(id),
  processing_status knowledge_processing_status default 'uploaded',
  linked_association_id uuid references association_profiles(id),
  linked_company_id uuid references company_profiles(id),
  linked_university text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### 5.19 `knowledge_chunks`

Text chunks and embeddings.

```sql
create table knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  knowledge_document_id uuid not null references knowledge_documents(id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  embedding vector(1536),
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  unique(knowledge_document_id, chunk_index)
);
```

Embedding dimension depends on selected embedding model. Use a migration if the model changes.

### 5.20 `notifications`

In-app and mobile push notification records.

```sql
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  data jsonb default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz default now()
);
```

### 5.21 `audit_logs`

Sensitive action history.

```sql
create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references profiles(id),
  action text not null,
  entity_type text,
  entity_id uuid,
  before_snapshot jsonb,
  after_snapshot jsonb,
  metadata jsonb default '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz default now()
);
```

### 5.22 `ai_logs`

AI call logs.

```sql
create table ai_logs (
  id uuid primary key default gen_random_uuid(),
  module text not null,
  provider text not null,
  model text not null,
  prompt_version text,
  entity_type text,
  entity_id uuid,
  user_id uuid references profiles(id),
  input_metadata jsonb default '{}'::jsonb,
  output_summary jsonb default '{}'::jsonb,
  raw_input_file_id uuid references uploaded_files(id),
  raw_output_file_id uuid references uploaded_files(id),
  tokens_input integer,
  tokens_output integer,
  estimated_cost numeric(10,4),
  status text default 'success',
  error_message text,
  created_at timestamptz default now()
);
```

Do not store sensitive raw input/output directly if avoidable. Store redacted metadata or protected files.

---

## 6. Future Tables: Company Module

Create these when implementing the company module.

### 6.1 `company_profiles`

```sql
create table company_profiles (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  display_name text,
  slug text unique,
  website_url text,
  email_domain text,
  logo_url text,
  sector text,
  size_range text,
  locations jsonb default '[]'::jsonb,
  description text,
  culture_profile jsonb default '{}'::jsonb,
  recruiting_needs jsonb default '{}'::jsonb,
  verification_status company_status default 'pending_verification',
  verified_by_user_id uuid references profiles(id),
  verified_at timestamptz,
  subscription_status text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### 6.2 `company_memberships`

```sql
create table company_memberships (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references company_profiles(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role text not null,
  permissions jsonb default '{}'::jsonb,
  status text default 'active',
  invited_by_user_id uuid references profiles(id),
  joined_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(company_id, user_id)
);
```

### 6.3 `company_searches`

```sql
create table company_searches (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references company_profiles(id) on delete cascade,
  created_by_user_id uuid references profiles(id),
  title text,
  natural_language_query text not null,
  structured_criteria jsonb default '{}'::jsonb,
  filters jsonb default '{}'::jsonb,
  status text default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### 6.4 `candidate_matches`

```sql
create table candidate_matches (
  id uuid primary key default gen_random_uuid(),
  company_search_id uuid not null references company_searches(id) on delete cascade,
  company_id uuid not null references company_profiles(id) on delete cascade,
  student_profile_id uuid not null references student_profiles(id) on delete cascade,
  anonymous_candidate_code text not null,
  match_score numeric(5,2),
  match_category text,
  explanation jsonb default '{}'::jsonb,
  evidence jsonb default '[]'::jsonb,
  status text default 'suggested',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(company_search_id, student_profile_id)
);
```

### 6.5 `anonymous_chats` and `messages`

```sql
create table anonymous_chats (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references company_profiles(id) on delete cascade,
  student_profile_id uuid not null references student_profiles(id) on delete cascade,
  candidate_match_id uuid references candidate_matches(id) on delete set null,
  student_identity_revealed boolean default false,
  student_revealed_at timestamptz,
  status text default 'open',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references anonymous_chats(id) on delete cascade,
  sender_user_id uuid references profiles(id),
  sender_context text not null,
  body text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);
```

---

## 7. Future Tables: Simulations and Evidence

### 7.1 `skill_taxonomy`

```sql
create table skill_taxonomy (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  description text,
  parent_skill_id uuid references skill_taxonomy(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### 7.2 `student_skills`

```sql
create table student_skills (
  id uuid primary key default gen_random_uuid(),
  student_profile_id uuid not null references student_profiles(id) on delete cascade,
  skill_id uuid not null references skill_taxonomy(id) on delete cascade,
  level numeric(4,2),
  confidence text,
  source text,
  evidence_count integer default 0,
  last_updated_at timestamptz default now(),
  unique(student_profile_id, skill_id)
);
```

### 7.3 `student_profile_evidence`

Generic evidence graph.

```sql
create table student_profile_evidence (
  id uuid primary key default gen_random_uuid(),
  student_profile_id uuid not null references student_profiles(id) on delete cascade,
  evidence_type text not null,
  title text not null,
  description text,
  source_entity_type text,
  source_entity_id uuid,
  skills jsonb default '[]'::jsonb,
  visibility_scope visibility_scope default 'private_to_student',
  verified_by_user_id uuid references profiles(id),
  verified_at timestamptz,
  ai_summary text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### 7.4 `simulation_paths`, `simulation_tasks`, `simulation_attempts`

```sql
create table simulation_paths (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  macro_area text,
  branch text,
  description text,
  level integer,
  status text default 'draft',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table simulation_tasks (
  id uuid primary key default gen_random_uuid(),
  simulation_path_id uuid not null references simulation_paths(id) on delete cascade,
  title text not null,
  task_type text not null,
  device_requirement text not null,
  brief text,
  materials jsonb default '[]'::jsonb,
  rubric jsonb default '{}'::jsonb,
  profile_visibility_rule text,
  status text default 'draft',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table simulation_attempts (
  id uuid primary key default gen_random_uuid(),
  simulation_task_id uuid not null references simulation_tasks(id) on delete cascade,
  student_profile_id uuid not null references student_profiles(id) on delete cascade,
  status text default 'started',
  submitted_file_id uuid references uploaded_files(id),
  answers jsonb default '{}'::jsonb,
  ai_feedback jsonb default '{}'::jsonb,
  score numeric(5,2),
  started_at timestamptz default now(),
  submitted_at timestamptz,
  evaluated_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

---

## 8. Future Tables: Orientation

### 8.1 `career_paths` and `micro_sectors`

```sql
create table career_paths (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  macro_area text,
  description text,
  status text default 'draft',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table micro_sectors (
  id uuid primary key default gen_random_uuid(),
  career_path_id uuid references career_paths(id) on delete set null,
  name text not null,
  description text,
  required_skills jsonb default '[]'::jsonb,
  recommended_courses jsonb default '[]'::jsonb,
  recommended_simulations jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### 8.2 `university_courses`

```sql
create table university_courses (
  id uuid primary key default gen_random_uuid(),
  university text not null,
  degree_program text,
  course_name text not null,
  course_code text,
  credits numeric(5,2),
  course_type text,
  syllabus_url text,
  syllabus_document_id uuid references knowledge_documents(id),
  extracted_skills jsonb default '[]'::jsonb,
  academic_year text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

---

## 9. Future Tables: Payments

Use Stripe as payment provider when company subscriptions are implemented.

```sql
create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references company_profiles(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  tier text,
  status text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid references subscriptions(id) on delete set null,
  stripe_payment_intent_id text,
  amount_cents integer,
  currency text default 'eur',
  status text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);
```

---

## 10. Storage Buckets

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
ai-logs-protected
```

### 10.1 Storage Access Principles

- `avatars`: owner can upload/update own avatar; public read if desired.
- `association-logos`: association admins can upload; public read.
- `student-transcripts`: private; signed URLs only; raw access audited.
- `application-files`: private to candidate, relevant association reviewers and admin.
- `knowledge-base`: private; admin and AI service only unless scoped otherwise.
- `simulation-materials`: read access for students with access to task.
- `simulation-submissions`: private to student and evaluation service.
- `ai-logs-protected`: admin/debug only; avoid storing sensitive raw data when possible.

---

## 11. RLS Policy Logic

Exact SQL policies should be written during implementation. The logic must follow these rules.

### 11.1 Profiles

Users can read/update their own profile.

MIRA admin can read/update all profiles.

Association users can read limited candidate profile data only for applications submitted to their association.

### 11.2 Student Profiles

Students can read/update their own student profile.

MIRA admin can read all for support/moderation.

Association reviewers can read only fields exposed for applications to their association.

Companies can read only anonymous candidate profile data after verified access and matching permissions.

### 11.3 Associations

Published association pages are publicly readable.

Draft/unpublished association profiles are readable only by MIRA admin and association members with permission.

Association profile editing requires `manage_association_profile` permission.

### 11.4 Applications

Students can read their own applications.

Students can create/update draft applications before submission.

After submission, answers should be immutable unless reopening is explicitly allowed.

Association users can read applications for their association if they have candidate permissions.

Candidate status changes require `change_candidate_status` permission and must create an audit/status event.

### 11.5 AI Evaluations

AI evaluations are visible to association users only if they have `view_candidate_ai_evaluation` permission.

Students do not see internal AI evaluations unless a specific feedback feature is built.

MIRA admin can inspect AI evaluations for quality/support.

### 11.6 Knowledge Base

Admin can manage all documents.

Association-specific documents can be visible to authorized association users only when explicitly scoped.

AI service can retrieve documents according to module context and scope.

---

## 12. Migration Order

### Migration 001 - Core Setup

- extensions;
- enums;
- helper functions for updated timestamps;
- `profiles`;
- `global_role_assignments`;
- initial RLS enablement.

### Migration 002 - Files and Logs

- `uploaded_files`;
- `audit_logs`;
- `ai_logs`;
- storage bucket setup.

### Migration 003 - Students

- `student_profiles`;
- `student_transcripts`;
- `student_courses`.

### Migration 004 - Associations

- `association_profiles`;
- `association_memberships`;
- `invitations`.

### Migration 005 - Applications

- `application_cycles`;
- `application_questions`;
- `applications`;
- `application_answers`;
- `candidate_ai_evaluations`;
- `application_status_events`;
- `candidate_internal_notes`;
- `interview_invites`.

### Migration 006 - Knowledge Base

- `knowledge_documents`;
- `knowledge_chunks`.

### Migration 007 - Notifications

- `notifications`.

### Future Migrations

- company module;
- simulations module;
- orientation module;
- payments module;
- analytics materialized views if needed.

---

## 13. Seed Data

Initial seed data should include:

### 13.1 Admin

- MIRA admin profile;
- `mira_admin` global role assignment.

### 13.2 University Domains

If a `university_domains` table is implemented early:

```text
studbocconi.it -> Bocconi University -> student domain
```

### 13.3 Association Categories

Use table or config values:

- finance;
- consulting;
- entrepreneurship;
- tech;
- marketing;
- social impact;
- politics;
- culture;
- sports;
- other.

### 13.4 Application Statuses

If using lookup tables rather than enums, seed statuses defined above.

### 13.5 Permission Templates

Permission templates:

- president_full;
- board_admin;
- reviewer_basic;
- reviewer_ai;
- interviewer;
- member_no_recruiting_access.

---

## 14. Required Helper Functions

Implement helper functions in server-side code and, where needed, Postgres functions.

### 14.1 Permission Checks

- `is_mira_admin(user_id)`;
- `is_association_member(user_id, association_id)`;
- `has_association_permission(user_id, association_id, permission_key)`;
- `can_view_application(user_id, application_id)`;
- `can_change_application_status(user_id, application_id)`;
- `can_view_raw_transcript(user_id, student_profile_id, context)`;
- `can_access_company_workspace(user_id, company_id)`.

### 14.2 Audit Helpers

- write audit log after permission changes;
- write audit log after candidate status changes;
- write audit log after raw transcript access;
- write audit log after admin overrides;
- write audit log after company verification changes.

---

## 15. Build Rules for Claude Code

When implementing this schema:

1. Create migrations incrementally.
2. Do not create all future tables unless required by current build.
3. Keep table names consistent with this document.
4. Do not hardcode permissions in frontend only.
5. Enable RLS before production use.
6. Implement storage buckets with private defaults.
7. Add indexes for foreign keys and common filters.
8. Add seed data only through migration or controlled seed scripts.
9. Never store API keys or secrets in tables.
10. Commit after each stable migration.
