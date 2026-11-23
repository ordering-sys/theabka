-- Explicit privileges for the API roles.
--
-- 20261122090100_rls.sql assumed Supabase grants ALL on new public tables and
-- functions to anon/authenticated/service_role by default, and only revoked
-- from that. Newer projects can have those defaults turned off, which leaves
-- hosts unable to insert or read invitations ("permission denied for table
-- invitations"): creating an invitation fails and the list is always empty.
--
-- This migration grants exactly what the earlier migrations intended. It does
-- not widen anything they restricted (profiles, rsvps, views and payments keep
-- their column/role grants; RLS policies still decide which rows are visible).
-- Every statement is idempotent, so it is safe on projects that already had
-- the old defaults.

grant usage on schema public to anon, authenticated, service_role;

-- Hosts: full CRUD on their own invitations and photos (rows limited by RLS;
-- status/payment columns locked by invitations_guard).
grant select, insert, update, delete on public.invitations, public.photos to authenticated;

-- Guests record views; the id is an identity column.
grant usage on sequence public.views_id_seq to anon, authenticated;

-- Server routes (payment webhook, published lookups) use the service role,
-- which bypasses RLS but still needs table privileges.
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

-- Helpers called from column defaults, RLS policies and (non-definer) triggers
-- run with the caller's privileges, so the API roles need EXECUTE on them.
grant execute on function
  public.is_client_role(),
  public.generate_slug(),
  public.set_updated_at(),
  public.invitations_guard(),
  public.photos_guard(),
  public.owns_invitation(uuid),
  public.is_live_invitation(uuid),
  public.invitation_allows_custom_music(uuid),
  public.storage_invitation_id(text)
to anon, authenticated, service_role;
