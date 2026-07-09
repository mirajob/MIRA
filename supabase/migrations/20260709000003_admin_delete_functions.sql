-- Admin "delete account" for real: nulls every non-cascading (audit/
-- attribution) foreign key pointing at the target row across the whole
-- public schema, then deletes the row so the schema's existing ON DELETE
-- CASCADE constraints take care of the rest. Built generically against
-- information_schema instead of a hand-maintained table list, so it keeps
-- working as new tables/columns are added later.
--
-- security definer + revoked from PUBLIC: only callable via the service-role
-- key from a server action that has already checked the caller is a MIRA
-- admin — never exposed to authenticated/anon clients directly.

create or replace function admin_delete_profile(target_profile_id uuid)
returns void as $$
declare
  fk record;
  target_auth_user_id uuid;
begin
  select auth_user_id into target_auth_user_id from public.profiles where id = target_profile_id;
  if target_auth_user_id is null then
    raise exception 'Profile % not found', target_profile_id;
  end if;

  for fk in
    select tc.table_name, kcu.column_name
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
    join information_schema.constraint_column_usage ccu
      on tc.constraint_name = ccu.constraint_name and tc.table_schema = ccu.table_schema
    join information_schema.referential_constraints rc
      on tc.constraint_name = rc.constraint_name and tc.table_schema = rc.constraint_schema
    where tc.constraint_type = 'FOREIGN KEY'
      and tc.table_schema = 'public'
      and ccu.table_schema = 'public'
      and ccu.table_name = 'profiles'
      and ccu.column_name = 'id'
      and rc.delete_rule in ('NO ACTION', 'RESTRICT')
  loop
    execute format('update public.%I set %I = null where %I = $1', fk.table_name, fk.column_name, fk.column_name)
    using target_profile_id;
  end loop;

  delete from auth.users where id = target_auth_user_id;
end;
$$ language plpgsql security definer;

revoke all on function admin_delete_profile(uuid) from public;
grant execute on function admin_delete_profile(uuid) to service_role;

create or replace function admin_delete_association(target_association_id uuid)
returns void as $$
declare
  fk record;
begin
  for fk in
    select tc.table_name, kcu.column_name
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
    join information_schema.constraint_column_usage ccu
      on tc.constraint_name = ccu.constraint_name and tc.table_schema = ccu.table_schema
    join information_schema.referential_constraints rc
      on tc.constraint_name = rc.constraint_name and tc.table_schema = rc.constraint_schema
    where tc.constraint_type = 'FOREIGN KEY'
      and tc.table_schema = 'public'
      and ccu.table_schema = 'public'
      and ccu.table_name = 'association_profiles'
      and ccu.column_name = 'id'
      and rc.delete_rule in ('NO ACTION', 'RESTRICT')
  loop
    execute format('update public.%I set %I = null where %I = $1', fk.table_name, fk.column_name, fk.column_name)
    using target_association_id;
  end loop;

  delete from public.association_profiles where id = target_association_id;
end;
$$ language plpgsql security definer;

revoke all on function admin_delete_association(uuid) from public;
grant execute on function admin_delete_association(uuid) to service_role;
