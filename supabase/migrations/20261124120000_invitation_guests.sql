-- TheabKa: personal invitation links ("special guests"), Premium only.
--
--   * invitation_guests: names the host adds. Each gets a random code; the guest link is
--     /i/<slug>/<code> and the invitation greets them by title and name.
--   * Hosts manage their own guests (RLS). Guests never read the table: get_invited_guest()
--     returns one guest's greeting for an exact slug + code, only while the invitation is
--     online and on Premium. mark_guest_opened() records the first open.
--   * rsvps.invited_guest_id links a reply to the guest it came from, so the host sees who
--     replied. These replies count toward the plan's RSVP limit like any other.
--   * Guest names are deleted with the rest of the content when retention purges an invitation.

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------
create or replace function public.generate_guest_code()
returns text
language sql
volatile
set search_path = ''
as $$
  select substr(replace(gen_random_uuid()::text, '-', ''), 1, 10);
$$;

create table public.invitation_guests (
  id            uuid primary key default gen_random_uuid(),
  invitation_id uuid not null references public.invitations (id) on delete cascade,
  -- Key of a Khmer honorific (modules/guest/lib/greeting.ts), or '' for none.
  title         text not null default '' check (title in ('', 'mr', 'mrs', 'miss', 'he', 'lok_chumteav', 'teacher_m', 'teacher_f')),
  name_km       text not null check (char_length(btrim(name_km)) between 1 and 100),
  name_en       text not null default '' check (char_length(name_en) <= 100),
  with_family   boolean not null default false,
  code          text not null unique default public.generate_guest_code() check (code ~ '^[a-z0-9]{6,16}$'),
  sent_at       timestamptz,
  opened_at     timestamptz,
  created_at    timestamptz not null default now()
);

create index invitation_guests_invitation_idx on public.invitation_guests (invitation_id, created_at);

-- ---------------------------------------------------------------------------
-- Guard: Premium only, not on purged invitations, at most 2,000 per invitation
-- ---------------------------------------------------------------------------
create or replace function public.invitation_guests_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tier   public.tier;
  v_purged timestamptz;
  v_count  integer;
begin
  if tg_op = 'UPDATE' then
    if new.invitation_id <> old.invitation_id or new.code <> old.code then
      raise exception 'forbidden' using errcode = '42501';
    end if;
    return new;
  end if;

  select case when i.status = 'live' then coalesce(i.paid_tier, t.tier) else t.tier end, i.purged_at
    into v_tier, v_purged
    from public.invitations i
    join public.templates t on t.id = i.template_id
   where i.id = new.invitation_id
     for update of i;

  if v_tier is distinct from 'premium' then
    raise exception 'guests_require_premium' using errcode = 'P0001';
  end if;
  if v_purged is not null then
    raise exception 'invitation_ended' using errcode = 'P0001';
  end if;

  select count(*) into v_count from public.invitation_guests g where g.invitation_id = new.invitation_id;
  if v_count >= 2000 then
    raise exception 'guest_limit_reached' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

create trigger invitation_guests_guard
  before insert or update on public.invitation_guests
  for each row execute function public.invitation_guests_guard();

-- ---------------------------------------------------------------------------
-- RLS and grants: hosts only
-- ---------------------------------------------------------------------------
alter table public.invitation_guests enable row level security;

revoke all on public.invitation_guests from anon, authenticated;
grant select, delete on public.invitation_guests to authenticated;
grant insert (invitation_id, title, name_km, name_en, with_family) on public.invitation_guests to authenticated;
grant update (title, name_km, name_en, with_family, sent_at) on public.invitation_guests to authenticated;
grant all on public.invitation_guests to service_role;

create policy "hosts read own guests" on public.invitation_guests
  for select to authenticated using (public.owns_invitation(invitation_id));
create policy "hosts add own guests" on public.invitation_guests
  for insert to authenticated with check (public.owns_invitation(invitation_id));
create policy "hosts update own guests" on public.invitation_guests
  for update to authenticated
  using (public.owns_invitation(invitation_id)) with check (public.owns_invitation(invitation_id));
create policy "hosts delete own guests" on public.invitation_guests
  for delete to authenticated using (public.owns_invitation(invitation_id));

-- ---------------------------------------------------------------------------
-- Guest-facing functions
-- ---------------------------------------------------------------------------

-- One guest's greeting, or null (unknown code, invitation not online, or not Premium).
create or replace function public.get_invited_guest(p_slug text, p_code text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', g.id, 'title', g.title, 'name_km', g.name_km, 'name_en', g.name_en, 'with_family', g.with_family
  )
  from public.invitation_guests g
  join public.invitations i on i.id = g.invitation_id
  where i.slug = p_slug
    and g.code = p_code
    and i.status = 'live'
    and i.paid_tier = 'premium'
    and public.is_live_invitation(i.id);
$$;

-- First time a guest opens their link. Returns nothing, so it reveals nothing.
create or replace function public.mark_guest_opened(p_slug text, p_code text)
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  update public.invitation_guests g
     set opened_at = now()
    from public.invitations i
   where i.id = g.invitation_id
     and i.slug = p_slug
     and g.code = p_code
     and g.opened_at is null
     and public.is_live_invitation(i.id);
$$;

grant execute on function public.get_invited_guest(text, text), public.mark_guest_opened(text, text)
  to anon, authenticated, service_role;
grant execute on function public.generate_guest_code(), public.invitation_guests_guard()
  to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Link replies to guests
-- ---------------------------------------------------------------------------
alter table public.rsvps
  add column invited_guest_id uuid references public.invitation_guests (id) on delete set null;

create index rsvps_invited_guest_idx on public.rsvps (invited_guest_id) where invited_guest_id is not null;

grant insert (invited_guest_id) on public.rsvps to anon, authenticated;

-- The linked guest must belong to the same invitation.
create or replace function public.rsvps_guest_link_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.invited_guest_id is not null and not exists (
    select 1 from public.invitation_guests g
     where g.id = new.invited_guest_id and g.invitation_id = new.invitation_id
  ) then
    new.invited_guest_id := null;
  end if;
  return new;
end;
$$;

create trigger rsvps_guest_link_guard
  before insert on public.rsvps
  for each row execute function public.rsvps_guest_link_guard();

grant execute on function public.rsvps_guest_link_guard() to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Retention: purge guest names too (replaces the 20261124090000 version)
-- ---------------------------------------------------------------------------
create or replace function public.purge_invitation_content(p_invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.rsvps             where invitation_id = p_invitation_id;
  delete from public.views             where invitation_id = p_invitation_id;
  delete from public.invitation_guests where invitation_id = p_invitation_id;
  delete from public.photos            where invitation_id = p_invitation_id;
  update public.invitations
     set purged_at = coalesce(purged_at, now()),
         music_url = null,
         custom_music_ref = null,
         custom_music_name = null,
         gift_qr_url = null,
         gift_note_km = null,
         gift_note_en = null,
         parents = '{}'::jsonb,
         schedule = '[]'::jsonb,
         start_time = null,
         venue_name_km = '',
         venue_name_en = '',
         venue_address_km = '',
         venue_address_en = '',
         lat = null,
         lng = null
   where id = p_invitation_id;
end;
$$;
