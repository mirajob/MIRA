-- Migration 001: Core setup
-- Extensions, enums, profiles, global roles, updated_at trigger

-- Extensions
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";
create extension if not exists "vector";

-- Enums
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

-- Helper function: auto-update updated_at
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Profiles table
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

create index profiles_email_domain_idx on profiles(email_domain);

create trigger profiles_updated_at
  before update on profiles
  for each row execute function update_updated_at_column();

-- Global role assignments
create table global_role_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  role global_role not null,
  granted_by_user_id uuid references profiles(id),
  created_at timestamptz default now(),
  unique(user_id, role)
);

-- Enable RLS on core tables
alter table profiles enable row level security;
alter table global_role_assignments enable row level security;
