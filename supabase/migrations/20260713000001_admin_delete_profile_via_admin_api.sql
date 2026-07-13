-- admin_delete_profile used to `delete from auth.users` directly in SQL.
-- Supabase explicitly warns against this: GoTrue keeps auth-schema state
-- (identities, sessions, refresh tokens, one-time tokens, flow state) that
-- a raw SQL delete does not reliably clean up, even though the FKs cascade —
-- leaving ghost rows that produced flaky behavior on re-signup with the same
-- email (no confirmation email sent, or immediate login without confirming).
--
-- Fix: this function now only cleans up public-schema data and returns the
-- auth_user_id; the caller (deleteUserAccount server action) deletes the
-- auth user via the official Admin API (supabase.auth.admin.deleteUser),
-- which is what actually clears all of GoTrue's internal state.
create or replace function admin_delete_profile(target_profile_id uuid)
returns uuid as $$
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

  delete from public.profiles where id = target_profile_id;

  return target_auth_user_id;
end;
$$ language plpgsql security definer;

revoke all on function admin_delete_profile(uuid) from public;
grant execute on function admin_delete_profile(uuid) to service_role;
