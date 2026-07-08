-- Migration: make handle_new_user() aware of which flow created the account.
--
-- The trigger auto-granted the 'student' role + a student_profiles row to
-- ANY signup with a studbocconi.it/gmail.com email, regardless of whether
-- the account was created via /signup (student), /aziende (company), or
-- /associations/candidati (association president). A company or
-- association registering with a gmail.com address ended up with both a
-- student identity AND their company/association identity on one login.
--
-- Fix: the client now passes signup_source ('company' | 'association') in
-- auth.signUp's options.data for those two flows; the trigger skips
-- student auto-provisioning when that flag is present.

create or replace function handle_new_user()
returns trigger as $$
declare
  email_domain text;
  profile_id uuid;
  signup_source text;
begin
  email_domain := split_part(new.email, '@', 2);
  signup_source := new.raw_user_meta_data->>'signup_source';

  insert into public.profiles (auth_user_id, email, email_domain, full_name)
  values (
    new.id,
    new.email,
    email_domain,
    coalesce(new.raw_user_meta_data->>'full_name', null)
  )
  returning id into profile_id;

  -- Auto-create student profile for allowed domains, unless this signup
  -- came from the company or association registration flow.
  if email_domain in ('studbocconi.it', 'gmail.com') and signup_source is null then
    insert into public.student_profiles (user_id, university_email, university)
    values (profile_id, new.email, 'Bocconi University');

    insert into public.global_role_assignments (user_id, role)
    values (profile_id, 'student');
  end if;

  return new;
end;
$$ language plpgsql security definer;
