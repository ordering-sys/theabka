-- TheabKa: row-level security, grants and public read functions.
--
-- Model:
--   * Hosts (authenticated) read/write only their own invitations and photos,
--     read their own payments, and read/delete the RSVPs and views of their invitations.
--   * Guests (anon) never select invitations or photos directly. They call
--     get_published_invitation(slug), which returns a single live invitation by
--     exact slug, so live invitations cannot be enumerated with the anon key.
--   * Guests may insert RSVPs and views for live invitations only.
--   * Payments are written only by the server (service_role), and
--     status draft -> live only happens in mark_payment_paid().

-- ---------------------------------------------------------------------------
-- Helper predicates (SECURITY DEFINER so policies don't recurse through RLS)
-- ---------------------------------------------------------------------------
create or replace function public.owns_invitation(p_invitation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.invitations i
     where i.id = p_invitation_id and i.user_id = auth.uid()
  );
$$;

create or replace function public.is_live_invitation(p_invitation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.invitations i
     where i.id = p_invitation_id and i.status = 'live'
  );
$$;

create or replace function public.invitation_allows_custom_music(p_invitation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select p.custom_music
      from public.invitations i
      join public.templates t on t.id = i.template_id
      join public.plans p on p.tier = case when i.status = 'live' then coalesce(i.paid_tier, t.tier) else t.tier end
     where i.id = p_invitation_id
  ), false);
$$;

-- Public read of one live invitation by exact slug. Photos are capped at the
-- paid plan's limit, and custom music is dropped if the plan doesn't allow it.
create or replace function public.get_published_invitation(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'invitation',
      (to_jsonb(i) - 'paid_tier' - 'custom_music_ref')
      || jsonb_build_object(
           'music_url', case when i.music_url like 'storage://%' and not p.custom_music then null else i.music_url end,
           'custom_music_name', case when p.custom_music then i.custom_music_name end
         ),
    'tier', p.tier,
    'photos', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', ph.id, 'invitation_id', ph.invitation_id,
               'storage_path', ph.storage_path, 'position', ph.position
             ) order by ph.position, ph.created_at)
        from (
          select * from public.photos x
           where x.invitation_id = i.id
           order by x.position, x.created_at
           limit p.max_photos
        ) ph
    ), '[]'::jsonb)
  )
  from public.invitations i
  join public.templates t on t.id = i.template_id
  join public.plans p on p.tier = coalesce(i.paid_tier, t.tier)
  where i.slug = p_slug and i.status = 'live';
$$;

grant execute on function public.get_published_invitation(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Enable RLS everywhere
-- ---------------------------------------------------------------------------
alter table public.plans        enable row level security;
alter table public.profiles     enable row level security;
alter table public.templates    enable row level security;
alter table public.music_tracks enable row level security;
alter table public.invitations  enable row level security;
alter table public.photos       enable row level security;
alter table public.rsvps        enable row level security;
alter table public.views        enable row level security;
alter table public.payments     enable row level security;

-- ---------------------------------------------------------------------------
-- Grants (defence in depth on top of RLS; Supabase grants ALL by default)
-- ---------------------------------------------------------------------------
revoke all on public.plans, public.templates, public.music_tracks from anon, authenticated;
grant select on public.plans, public.templates, public.music_tracks to anon, authenticated;

revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (name, language) on public.profiles to authenticated;

revoke all on public.invitations, public.photos from anon;
revoke truncate, references, trigger on public.invitations, public.photos from authenticated;

revoke all on public.payments from anon, authenticated;
grant select on public.payments to authenticated;

revoke all on public.rsvps from anon, authenticated;
grant insert (id, invitation_id, guest_name, attending, party_size, message) on public.rsvps to anon, authenticated;
grant select, delete on public.rsvps to authenticated;

revoke all on public.views from anon, authenticated;
grant insert (invitation_id) on public.views to anon, authenticated;
grant select on public.views to authenticated;

-- ---------------------------------------------------------------------------
-- Policies
-- ---------------------------------------------------------------------------

-- Catalogue tables: readable by everyone.
create policy "plans are public" on public.plans
  for select to anon, authenticated using (true);

create policy "active templates are public" on public.templates
  for select to anon, authenticated using (active);

create policy "active music tracks are public" on public.music_tracks
  for select to anon, authenticated using (active);

-- Profiles: own row only.
create policy "read own profile" on public.profiles
  for select to authenticated using (id = (select auth.uid()));

create policy "update own profile" on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Invitations: owner CRUD. Status/published_at/paid_tier are locked by invitations_guard.
create policy "hosts read own invitations" on public.invitations
  for select to authenticated using (user_id = (select auth.uid()));

create policy "hosts create own invitations" on public.invitations
  for insert to authenticated with check (user_id = (select auth.uid()) and status = 'draft');

create policy "hosts update own invitations" on public.invitations
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "hosts delete own drafts" on public.invitations
  for delete to authenticated using (user_id = (select auth.uid()) and status = 'draft');

-- Photos: owner CRUD (limit enforced by photos_guard).
create policy "hosts read own photos" on public.photos
  for select to authenticated using (public.owns_invitation(invitation_id));

create policy "hosts add own photos" on public.photos
  for insert to authenticated with check (public.owns_invitation(invitation_id));

create policy "hosts update own photos" on public.photos
  for update to authenticated
  using (public.owns_invitation(invitation_id)) with check (public.owns_invitation(invitation_id));

create policy "hosts delete own photos" on public.photos
  for delete to authenticated using (public.owns_invitation(invitation_id));

-- RSVPs: guests insert for live invitations; hosts read/delete their own.
create policy "guests rsvp to live invitations" on public.rsvps
  for insert to anon, authenticated
  with check (
    public.is_live_invitation(invitation_id)
    and char_length(btrim(guest_name)) between 1 and 80
    and party_size between 1 and 10
    and (message is null or char_length(message) <= 500)
  );

create policy "hosts read rsvps of own invitations" on public.rsvps
  for select to authenticated using (public.owns_invitation(invitation_id));

create policy "hosts delete rsvps of own invitations" on public.rsvps
  for delete to authenticated using (public.owns_invitation(invitation_id));

-- Views: guests insert for live invitations; hosts read their own.
create policy "guests record views of live invitations" on public.views
  for insert to anon, authenticated with check (public.is_live_invitation(invitation_id));

create policy "hosts read views of own invitations" on public.views
  for select to authenticated using (public.owns_invitation(invitation_id));

-- Payments: hosts read their own. No client write policies: the server writes with service_role.
create policy "hosts read own payments" on public.payments
  for select to authenticated using (user_id = (select auth.uid()));
