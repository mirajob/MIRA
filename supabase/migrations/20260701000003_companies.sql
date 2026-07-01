-- Migration: Company module
-- Tables: company_profiles, company_memberships, company_searches,
--         candidate_matches, company_contact_requests, company_chats, company_chat_messages

------------------------------------------------------------
-- company_profiles
------------------------------------------------------------
create table company_profiles (
  id uuid primary key default gen_random_uuid(),
  created_by_user_id uuid not null references profiles(id) on delete restrict,
  legal_name text not null,
  display_name text,
  slug text unique not null,
  website_url text,
  sector text,
  size_range text,
  description text,
  logo_url text,
  verification_status company_status default 'pending_verification',
  verified_by_user_id uuid references profiles(id),
  verified_at timestamptz,
  rejected_reason text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index company_profiles_slug_idx on company_profiles(slug);
create index company_profiles_status_idx on company_profiles(verification_status);

create trigger company_profiles_updated_at
  before update on company_profiles
  for each row execute function update_updated_at_column();

------------------------------------------------------------
-- company_memberships
------------------------------------------------------------
create table company_memberships (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references company_profiles(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role text not null default 'admin',
  status text not null default 'active',
  invited_by_user_id uuid references profiles(id),
  joined_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(company_id, user_id)
);

create index company_memberships_user_idx on company_memberships(user_id);
create index company_memberships_company_idx on company_memberships(company_id);

create trigger company_memberships_updated_at
  before update on company_memberships
  for each row execute function update_updated_at_column();

------------------------------------------------------------
-- company_searches
------------------------------------------------------------
create table company_searches (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references company_profiles(id) on delete cascade,
  created_by_user_id uuid references profiles(id),
  title text not null default 'Nuova ricerca',
  messages jsonb default '[]'::jsonb,
  status text default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index company_searches_company_idx on company_searches(company_id);

create trigger company_searches_updated_at
  before update on company_searches
  for each row execute function update_updated_at_column();

------------------------------------------------------------
-- candidate_matches
-- Students surfaced within a search session
------------------------------------------------------------
create table candidate_matches (
  id uuid primary key default gen_random_uuid(),
  company_search_id uuid not null references company_searches(id) on delete cascade,
  company_id uuid not null references company_profiles(id) on delete cascade,
  student_profile_id uuid not null references student_profiles(id) on delete cascade,
  anonymous_code text not null,
  match_score numeric(5,2),
  match_explanation text,
  status text default 'suggested',
  created_at timestamptz default now(),
  unique(company_search_id, student_profile_id)
);

create index candidate_matches_company_idx on candidate_matches(company_id);
create index candidate_matches_student_idx on candidate_matches(student_profile_id);

------------------------------------------------------------
-- company_contact_requests
------------------------------------------------------------
create table company_contact_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references company_profiles(id) on delete cascade,
  student_profile_id uuid not null references student_profiles(id) on delete cascade,
  candidate_match_id uuid references candidate_matches(id) on delete set null,
  created_by_user_id uuid references profiles(id),
  role_title text not null,
  message text not null,
  status text not null default 'pending',
  student_contact_info jsonb,
  responded_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(company_id, student_profile_id)
);

create index company_contact_requests_company_idx on company_contact_requests(company_id);
create index company_contact_requests_student_idx on company_contact_requests(student_profile_id);

create trigger company_contact_requests_updated_at
  before update on company_contact_requests
  for each row execute function update_updated_at_column();

------------------------------------------------------------
-- company_chats
-- Opens after a contact request is accepted
------------------------------------------------------------
create table company_chats (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references company_profiles(id) on delete cascade,
  student_profile_id uuid not null references student_profiles(id) on delete cascade,
  contact_request_id uuid not null references company_contact_requests(id) on delete cascade,
  student_identity_revealed boolean default false,
  student_revealed_at timestamptz,
  status text not null default 'open',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(contact_request_id)
);

create index company_chats_company_idx on company_chats(company_id);
create index company_chats_student_idx on company_chats(student_profile_id);

create trigger company_chats_updated_at
  before update on company_chats
  for each row execute function update_updated_at_column();

------------------------------------------------------------
-- company_chat_messages
------------------------------------------------------------
create table company_chat_messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references company_chats(id) on delete cascade,
  sender_role text not null,  -- 'company' | 'student'
  sender_profile_id uuid references profiles(id),
  message_type text not null default 'text',  -- 'text' | 'interview_invite'
  content text not null,
  metadata jsonb default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz default now()
);

create index company_chat_messages_chat_idx on company_chat_messages(chat_id);
create index company_chat_messages_created_idx on company_chat_messages(created_at);

-- Enable Realtime for live chat
alter publication supabase_realtime add table company_chat_messages;

------------------------------------------------------------
-- RLS
------------------------------------------------------------
alter table company_profiles enable row level security;
alter table company_memberships enable row level security;
alter table company_searches enable row level security;
alter table candidate_matches enable row level security;
alter table company_contact_requests enable row level security;
alter table company_chats enable row level security;
alter table company_chat_messages enable row level security;

-- Helper: is user a member of a company?
create or replace function is_company_member(check_user_id uuid, check_company_id uuid)
returns boolean as $$
  select exists (
    select 1 from company_memberships
    where user_id = check_user_id
      and company_id = check_company_id
      and status = 'active'
  );
$$ language sql security definer stable;

-- Helper: get student profile id from auth
create or replace function get_student_profile_id()
returns uuid as $$
  select sp.id from student_profiles sp
  join profiles p on p.id = sp.user_id
  where p.auth_user_id = auth.uid()
  limit 1;
$$ language sql security definer stable;

-- company_profiles: members read own, admin read all, anyone can read basic info for pending page
create policy "Company members read own profile"
  on company_profiles for select
  using (is_company_member(get_profile_id(), id) or is_mira_admin(get_profile_id()));

create policy "Company members update own profile"
  on company_profiles for update
  using (is_company_member(get_profile_id(), id) or is_mira_admin(get_profile_id()));

create policy "Authenticated users can insert company profile on registration"
  on company_profiles for insert
  with check (created_by_user_id = get_profile_id());

-- company_memberships: members read own company's memberships, admin read all
create policy "Company members read own memberships"
  on company_memberships for select
  using (is_company_member(get_profile_id(), company_id) or is_mira_admin(get_profile_id()) or user_id = get_profile_id());

create policy "Insert own membership on registration"
  on company_memberships for insert
  with check (user_id = get_profile_id());

create policy "Admin manages memberships"
  on company_memberships for update
  using (is_mira_admin(get_profile_id()));

-- company_searches: company members manage their own
create policy "Company members manage searches"
  on company_searches for all
  using (is_company_member(get_profile_id(), company_id));

-- candidate_matches: company members read their own
create policy "Company members read matches"
  on candidate_matches for all
  using (is_company_member(get_profile_id(), company_id));

-- company_contact_requests: company reads/writes own; student reads their own
create policy "Company reads own contact requests"
  on company_contact_requests for select
  using (
    is_company_member(get_profile_id(), company_id)
    or student_profile_id = get_student_profile_id()
    or is_mira_admin(get_profile_id())
  );

create policy "Company inserts contact requests"
  on company_contact_requests for insert
  with check (is_company_member(get_profile_id(), company_id));

create policy "Student or company updates contact request"
  on company_contact_requests for update
  using (
    is_company_member(get_profile_id(), company_id)
    or student_profile_id = get_student_profile_id()
  );

-- company_chats: company member or the student in the chat
create policy "Chat participants read chats"
  on company_chats for select
  using (
    is_company_member(get_profile_id(), company_id)
    or student_profile_id = get_student_profile_id()
  );

create policy "Chat participants update chats"
  on company_chats for update
  using (
    is_company_member(get_profile_id(), company_id)
    or student_profile_id = get_student_profile_id()
  );

create policy "System inserts chats"
  on company_chats for insert
  with check (is_company_member(get_profile_id(), company_id));

-- company_chat_messages: chat participants read and write
create policy "Chat participants read messages"
  on company_chat_messages for select
  using (
    exists (
      select 1 from company_chats cc
      where cc.id = chat_id
        and (
          is_company_member(get_profile_id(), cc.company_id)
          or cc.student_profile_id = get_student_profile_id()
        )
    )
  );

create policy "Chat participants insert messages"
  on company_chat_messages for insert
  with check (
    exists (
      select 1 from company_chats cc
      where cc.id = chat_id
        and cc.status = 'open'
        and (
          is_company_member(get_profile_id(), cc.company_id)
          or cc.student_profile_id = get_student_profile_id()
        )
    )
  );

create policy "Mark messages as read"
  on company_chat_messages for update
  using (
    exists (
      select 1 from company_chats cc
      where cc.id = chat_id
        and (
          is_company_member(get_profile_id(), cc.company_id)
          or cc.student_profile_id = get_student_profile_id()
        )
    )
  );
