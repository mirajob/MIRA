-- Migration 009: Seed data
-- University domains table + association categories reference

-- University domains for future multi-university support
create table university_domains (
  id uuid primary key default gen_random_uuid(),
  domain text not null unique,
  university_name text not null,
  country text default 'IT',
  active boolean default true,
  created_at timestamptz default now()
);

insert into university_domains (domain, university_name) values
  ('studbocconi.it', 'Bocconi University');

-- Note: MIRA admin profile is created automatically when the founder
-- signs up with their email. The admin role must be granted manually:
--
-- 1. Sign up at the app
-- 2. Find your profile id:
--    select id from profiles where email = 'your-email@domain.com';
-- 3. Grant admin role:
--    insert into global_role_assignments (user_id, role)
--    values ('your-profile-uuid', 'mira_admin');

alter table university_domains enable row level security;

create policy "Anyone can read active university domains"
  on university_domains for select
  using (active = true);

create policy "Admin can manage university domains"
  on university_domains for all
  using (is_mira_admin(get_profile_id()));
