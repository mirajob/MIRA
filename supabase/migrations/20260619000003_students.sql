-- Migration 003: Students
-- student_profiles, student_transcripts, student_courses

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
  onboarding_answers jsonb default '{}'::jsonb,
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

create index student_profiles_university_idx on student_profiles(university);
create index student_profiles_degree_program_idx on student_profiles(degree_program);

create trigger student_profiles_updated_at
  before update on student_profiles
  for each row execute function update_updated_at_column();

-- Student transcripts
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

create trigger student_transcripts_updated_at
  before update on student_transcripts
  for each row execute function update_updated_at_column();

-- Normalized course rows from transcript
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

create index student_courses_student_idx on student_courses(student_profile_id);
create index student_courses_name_idx on student_courses(course_name);

-- Enable RLS
alter table student_profiles enable row level security;
alter table student_transcripts enable row level security;
alter table student_courses enable row level security;
