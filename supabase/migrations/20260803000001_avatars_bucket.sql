-- Foto profilo degli studenti.
--
-- Il bucket è pubblico come quello dei loghi: l'url finisce nella MiraCard, che
-- viene letta da chi la riceve senza passare da una firma. Quello che protegge
-- la foto non è il bucket, è chi passa l'url: la vista azienda non lo riceve
-- finché lo studente non condivide i recapiti.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

-- Scrittura solo nella propria cartella: il percorso è <profile_id>/avatar.<ext>,
-- e la prima parte del percorso deve essere il profilo di chi sta caricando.
drop policy if exists "avatars_owner_write" on storage.objects;
create policy "avatars_owner_write" on storage.objects
  for all
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] in (
      select p.id::text from public.profiles p where p.auth_user_id = auth.uid()
    )
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] in (
      select p.id::text from public.profiles p where p.auth_user_id = auth.uid()
    )
  );

drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read" on storage.objects
  for select
  to public
  using (bucket_id = 'avatars');
