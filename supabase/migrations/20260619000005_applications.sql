-- Migration 005: Applications
-- application_cycles, application_questions, applications, application_answers,
-- candidate_ai_evaluations, application_status_events, candidate_internal_notes, interview_invites

-- Application cycles
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

create trigger application_cycles_updated_at
  before update on application_cycles
  for each row execute function update_updated_at_column();

-- Custom questions per cycle
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

create trigger application_questions_updated_at
  before update on application_questions
  for each row execute function update_updated_at_column();

-- Student applications
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

create index applications_association_idx on applications(association_id);
create index applications_student_idx on applications(student_user_id);
create index applications_status_idx on applications(status);

create trigger applications_updated_at
  before update on applications
  for each row execute function update_updated_at_column();

-- Application answers
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

create trigger application_answers_updated_at
  before update on application_answers
  for each row execute function update_updated_at_column();

-- AI evaluations
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

create trigger candidate_ai_evaluations_updated_at
  before update on candidate_ai_evaluations
  for each row execute function update_updated_at_column();

-- Status history (append-only)
create table application_status_events (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications(id) on delete cascade,
  previous_status application_status,
  new_status application_status not null,
  changed_by_user_id uuid references profiles(id),
  note text,
  visible_to_candidate boolean default true,
  created_at timestamptz default now()
);

-- Internal notes
create table candidate_internal_notes (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications(id) on delete cascade,
  author_user_id uuid not null references profiles(id) on delete cascade,
  note_text text not null,
  visibility text default 'association_internal',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create trigger candidate_internal_notes_updated_at
  before update on candidate_internal_notes
  for each row execute function update_updated_at_column();

-- Interview invites
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

create trigger interview_invites_updated_at
  before update on interview_invites
  for each row execute function update_updated_at_column();

-- Enable RLS
alter table application_cycles enable row level security;
alter table application_questions enable row level security;
alter table applications enable row level security;
alter table application_answers enable row level security;
alter table candidate_ai_evaluations enable row level security;
alter table application_status_events enable row level security;
alter table candidate_internal_notes enable row level security;
alter table interview_invites enable row level security;
