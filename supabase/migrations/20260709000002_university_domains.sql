-- Broaden self-serve student signup from studbocconi.it/gmail.com to real
-- institutional email domains across ~80 Italian universities (kept in sync
-- by hand with packages/domain/src/validation.ts — the two are the same list
-- expressed in TS for the client and SQL for this trigger). Also stops
-- hardcoding every new student as "Bocconi University": university and
-- degree_level now come from what the student picked on the signup form.
create or replace function handle_new_user()
returns trigger as $$
declare
  email_domain text;
  profile_id uuid;
  signup_source text;
  is_university_domain boolean;
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

  is_university_domain := exists (
    select 1 from (values
      ('studbocconi.it'), ('polimi.it'), ('unimi.it'), ('unimib.it'), ('icatt.it'),
      ('iulm.it'), ('unisr.it'), ('hunimed.eu'),
      ('uniroma1.it'), ('uniroma2.it'), ('uniroma3.it'), ('uniroma4.it'), ('luiss.it'),
      ('lumsa.it'), ('unicampus.it'), ('unint.eu'),
      ('polito.it'), ('unito.it'),
      ('unibo.it'),
      ('unipd.it'), ('unina.it'), ('unior.it'), ('uniparthenope.it'),
      ('unipi.it'), ('sns.it'), ('santannapisa.it'),
      ('unifi.it'), ('unige.it'), ('unive.it'), ('iuav.it'),
      ('unitn.it'), ('univr.it'),
      ('uniba.it'), ('poliba.it'), ('unipa.it'), ('unict.it'),
      ('unimore.it'), ('unipr.it'), ('unisi.it'), ('unistrasi.it'),
      ('unipg.it'), ('unistrapg.it'),
      ('unica.it'), ('units.it'), ('uniud.it'), ('unife.it'), ('unipv.it'),
      ('uninsubria.it'), ('unibg.it'), ('unibs.it'), ('unibz.it'), ('univda.it'),
      ('unical.it'), ('unirc.it'), ('unicz.it'), ('unime.it'), ('unikore.it'),
      ('uniss.it'), ('unisalento.it'), ('unisa.it'), ('unicampania.it'),
      ('unisannio.it'), ('unimol.it'), ('unibas.it'), ('univaq.it'), ('unich.it'),
      ('unitus.it'), ('unicas.it'), ('uniupo.it'), ('unicam.it'), ('unimc.it'),
      ('uniurb.it'), ('univpm.it'), ('unite.it'), ('lum.it'), ('imtlucca.it'),
      ('gssi.it')
    ) as d(domain)
    where email_domain = d.domain or email_domain like ('%.' || d.domain)
  );

  -- Auto-create student profile for recognized university domains, unless
  -- this signup came from the company or association registration flow.
  if is_university_domain and signup_source is null then
    insert into public.student_profiles (user_id, university_email, university, degree_level)
    values (
      profile_id,
      new.email,
      coalesce(new.raw_user_meta_data->>'university', 'Non specificata'),
      new.raw_user_meta_data->>'degree_level'
    );

    insert into public.global_role_assignments (user_id, role)
    values (profile_id, 'student');
  end if;

  return new;
end;
$$ language plpgsql security definer;

-- MIRA is no longer Bocconi-only; stop silently defaulting new rows to it.
alter table student_profiles alter column university drop default;
alter table student_profiles alter column university set default 'Non specificata';

