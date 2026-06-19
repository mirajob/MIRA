-- Migration 004: Associations
-- association_profiles, association_memberships, invitations

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

create trigger association_profiles_updated_at
  before update on association_profiles
  for each row execute function update_updated_at_column();

-- Association memberships
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

create trigger association_memberships_updated_at
  before update on association_memberships
  for each row execute function update_updated_at_column();

-- Generic invitations (association presidents, board members, future companies/universities)
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
  invited_role text,
  invited_permissions jsonb default '{}'::jsonb,
  metadata jsonb default '{}'::jsonb,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index invitations_email_idx on invitations(invited_email);
create index invitations_type_status_idx on invitations(invitation_type, status);
create index invitations_token_idx on invitations(invitation_token);

create trigger invitations_updated_at
  before update on invitations
  for each row execute function update_updated_at_column();

-- Association access requests (from docs/MIRA_ANALISI section 2.4)
create table association_access_requests (
  id uuid primary key default gen_random_uuid(),
  requester_name text not null,
  requester_email text not null,
  association_name text not null,
  association_website text,
  description text,
  status text default 'pending',
  reviewed_by_user_id uuid references profiles(id),
  review_note text,
  created_at timestamptz default now(),
  reviewed_at timestamptz
);

-- Enable RLS
alter table association_profiles enable row level security;
alter table association_memberships enable row level security;
alter table invitations enable row level security;
alter table association_access_requests enable row level security;
