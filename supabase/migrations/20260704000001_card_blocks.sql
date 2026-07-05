-- Migration: card_blocks
-- MIRA Card data model (docs/MIRA_SPEC_rifacimento_card_onboarding.md section 3).
-- One row per block per student. Additive migration: does not touch existing
-- student_profiles jsonb columns, which remain in use until the onboarding/profile
-- rebuild steps replace their read/write paths.

create type card_block_type as enum (
  'header',
  'disponibilita',
  'esperienze',
  'formazione',
  'competenze',
  'lingue',
  'autodescrizione',
  'interessi',
  'piano_carriera'
);

create type card_block_status as enum ('empty', 'draft', 'approved');

create table card_blocks (
  id uuid primary key default gen_random_uuid(),
  student_profile_id uuid not null references student_profiles(id) on delete cascade,
  block_type card_block_type not null,
  prose_content jsonb not null default '{}'::jsonb,
  structured_data jsonb not null default '{}'::jsonb,
  status card_block_status not null default 'empty',
  visibility jsonb not null default '{}'::jsonb,
  approved_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (student_profile_id, block_type)
);

create index card_blocks_student_idx on card_blocks(student_profile_id);

-- update_updated_at_column() is already defined in 20260619000001_core.sql.
create trigger card_blocks_updated_at
  before update on card_blocks
  for each row execute function update_updated_at_column();

alter table card_blocks enable row level security;

create policy "Students can manage own card blocks"
  on card_blocks for all
  using (student_profile_id in (select id from student_profiles where user_id = get_profile_id()));

create policy "Admin can read all card blocks"
  on card_blocks for select
  using (is_mira_admin(get_profile_id()));

-- Principle: no card content is visible to associations unless status = 'approved'.
-- The existing has_association_permission check is preserved; status = 'approved'
-- is enforced directly in this policy rather than left to application code.
create policy "Association reviewers can read approved candidate blocks"
  on card_blocks for select
  using (
    status = 'approved'
    and student_profile_id in (
      select a.student_profile_id from applications a
      where has_association_permission(get_profile_id(), a.association_id, 'view_candidates')
    )
  );

-- NOTE FOR FUTURE STEPS: company matching runs server-side with the service role key
-- and bypasses RLS. When it switches to reading card_blocks, the status = 'approved'
-- filter must be applied explicitly in the matching code, not relied on from RLS alone.
-- NOTE FOR FUTURE STEPS: RLS gates visibility at the block level only. Per-item visibility
-- (e.g. grade average hidden inside the header block's `visibility` field) must be applied
-- by the rendering layer in the association view (step 5), not by RLS.
