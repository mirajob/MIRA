-- Migration 002: Files and logs
-- uploaded_files, audit_logs, ai_logs

-- Uploaded files registry (actual files in Supabase Storage)
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

-- Audit logs (append-only)
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

-- AI call logs (append-only)
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

-- Enable RLS
alter table uploaded_files enable row level security;
alter table audit_logs enable row level security;
alter table ai_logs enable row level security;
