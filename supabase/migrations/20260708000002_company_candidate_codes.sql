-- Migration: stable per-company candidate codes
--
-- Company search previously labeled candidates "Candidato A/B/C" recomputed
-- fresh on every message (by array index into an unordered query), with a
-- SECOND independent lettering in the UI (by first-appearance-in-text) that
-- didn't reliably match the first. Neither scaled past 26 candidates.
--
-- This table assigns a short code ("C-001", "C-002"...) the first time a
-- student is surfaced to a given company, and reuses it forever afterward
-- for that (company, student) pair — one source of truth, stable across
-- searches, arbitrary (doesn't leak identity or a real university ID).

create table company_candidate_codes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references company_profiles(id) on delete cascade,
  student_profile_id uuid not null references student_profiles(id) on delete cascade,
  code text not null,
  created_at timestamptz default now(),
  unique(company_id, student_profile_id),
  unique(company_id, code)
);

create index company_candidate_codes_company_idx on company_candidate_codes(company_id);

alter table company_candidate_codes enable row level security;

create policy "Company members read own candidate codes"
  on company_candidate_codes for select
  using (is_company_member(get_profile_id(), company_id) or is_mira_admin(get_profile_id()));

-- Returns the existing code for (company, student) or assigns the next one.
-- Locks the company row to serialize numbering under concurrent calls.
create or replace function get_or_create_candidate_code(p_company_id uuid, p_student_profile_id uuid)
returns text as $$
declare
  v_code text;
  v_next int;
begin
  select code into v_code from company_candidate_codes
    where company_id = p_company_id and student_profile_id = p_student_profile_id;

  if v_code is not null then
    return v_code;
  end if;

  perform 1 from company_profiles where id = p_company_id for update;

  select count(*) + 1 into v_next from company_candidate_codes where company_id = p_company_id;
  v_code := 'C-' || lpad(v_next::text, 3, '0');

  insert into company_candidate_codes(company_id, student_profile_id, code)
  values (p_company_id, p_student_profile_id, v_code)
  on conflict (company_id, student_profile_id) do nothing;

  select code into v_code from company_candidate_codes
    where company_id = p_company_id and student_profile_id = p_student_profile_id;

  return v_code;
end;
$$ language plpgsql;
