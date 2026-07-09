-- Companies now "request access" without creating an account/password up
-- front. This table holds that request; approval sends an invitation email
-- (reusing the existing company_admin invitations pipeline) which is what
-- actually lets them create an account and set a password.
create table company_access_requests (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  sector text,
  website_url text,
  contact_name text not null,
  email text not null,
  status text not null default 'pending', -- pending | approved | rejected
  rejected_reason text,
  reviewed_by_user_id uuid references profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz default now()
);

create index company_access_requests_email_idx on company_access_requests(email);
create index company_access_requests_status_idx on company_access_requests(status);

alter table company_access_requests enable row level security;
-- No client-facing policies: submissions, review, and the pending-email
-- lookup on the login page all go through service-role server actions.
