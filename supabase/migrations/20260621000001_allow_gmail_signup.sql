-- Migration: Allow gmail.com signups to create student profiles (for testing)
-- Also disable email confirmation requirement

create or replace function handle_new_user()
returns trigger as $$
declare
  email_domain text;
  profile_id uuid;
begin
  email_domain := split_part(new.email, '@', 2);

  insert into public.profiles (auth_user_id, email, email_domain, full_name)
  values (
    new.id,
    new.email,
    email_domain,
    coalesce(new.raw_user_meta_data->>'full_name', null)
  )
  returning id into profile_id;

  -- Auto-create student profile for allowed domains
  if email_domain in ('studbocconi.it', 'gmail.com') then
    insert into public.student_profiles (user_id, university_email, university)
    values (profile_id, new.email, 'Bocconi University');

    insert into public.global_role_assignments (user_id, role)
    values (profile_id, 'student');
  end if;

  return new;
end;
$$ language plpgsql security definer;
