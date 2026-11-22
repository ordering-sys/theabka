-- TheabKa: storage buckets and policies.
--
-- Object path convention (all three buckets): <user_id>/<invitation_id>/<random>.<ext>
-- Buckets are private. Files are served through signed URLs:
--   * owners can sign anything under their own <user_id>/ folder;
--   * anyone (anon key) can sign files of a *live* invitation.
-- Writes are only allowed into the caller's own folder for an invitation they own.
-- Custom music uploads additionally require a Premium invitation.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('photos',  'photos',  false, 10485760, array['image/jpeg', 'image/png', 'image/webp']),
  ('music',   'music',   false, 10485760, array['audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/ogg', 'audio/wav']),
  ('gift-qr', 'gift-qr', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Second path segment as a uuid, or null if it isn't one.
create or replace function public.storage_invitation_id(p_name text)
returns uuid
language sql
stable
set search_path = ''
as $$
  select case
    when (storage.foldername(p_name))[2] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then ((storage.foldername(p_name))[2])::uuid
  end;
$$;

-- Read
create policy "theabka owners read own files" on storage.objects
  for select to authenticated
  using (
    bucket_id in ('photos', 'music', 'gift-qr')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "theabka anyone reads live invitation files" on storage.objects
  for select to anon, authenticated
  using (
    bucket_id in ('photos', 'music', 'gift-qr')
    and public.is_live_invitation(public.storage_invitation_id(name))
  );

-- Insert
create policy "theabka owners upload photos and gift qr" on storage.objects
  for insert to authenticated
  with check (
    bucket_id in ('photos', 'gift-qr')
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and public.owns_invitation(public.storage_invitation_id(name))
  );

create policy "theabka owners upload music on premium" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'music'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and public.owns_invitation(public.storage_invitation_id(name))
    and public.invitation_allows_custom_music(public.storage_invitation_id(name))
  );

-- Update (overwrite)
create policy "theabka owners update own files" on storage.objects
  for update to authenticated
  using (
    bucket_id in ('photos', 'music', 'gift-qr')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id in ('photos', 'music', 'gift-qr')
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and public.owns_invitation(public.storage_invitation_id(name))
    and (bucket_id <> 'music' or public.invitation_allows_custom_music(public.storage_invitation_id(name)))
  );

-- Delete
create policy "theabka owners delete own files" on storage.objects
  for delete to authenticated
  using (
    bucket_id in ('photos', 'music', 'gift-qr')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
