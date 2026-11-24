-- TheabKa: data retention.
--
-- Rules (shown to hosts in the privacy policy, terms and pricing):
--   * A live invitation stays online for plans.online_months after the event
--     date: Basic 3 months, Premium 6 months. The day it counts from is the
--     event date, capped at 12 months after publishing, so moving the date far
--     into the future can't keep a page online forever.
--   * After that the guest link shows "this invitation has ended": no RSVPs,
--     no views, no photo/music/gift-QR reads.
--   * 30 days after it ends, purge_invitation_content() deletes its photos,
--     music, gift QR, RSVPs, views and event details. Only a tombstone (slug,
--     names, date) is kept so the old link can say the invitation has ended.
--   * Unpaid drafts not edited for 3 months are deleted.
--   * Expired/pending payments are deleted after 30 days; paid payments keep
--     their accounting fields, but raw provider data and the QR payload are
--     cleared after 30 days.
-- Storage files are removed by the server (modules/retention/server), which
-- calls these functions with the service role.
--
-- Dates are counted in Cambodia's time zone.

-- ---------------------------------------------------------------------------
-- Plans: how long a paid invitation stays online after the event
-- ---------------------------------------------------------------------------
alter table public.plans
  add column online_months smallint not null default 3 check (online_months between 1 and 60);

update public.plans set online_months = 3 where tier = 'basic';
update public.plans set online_months = 6 where tier = 'premium';

alter table public.plans alter column online_months drop default;

-- ---------------------------------------------------------------------------
-- Invitations: set once its content has been purged
-- ---------------------------------------------------------------------------
alter table public.invitations add column purged_at timestamptz;

create index invitations_live_event_idx on public.invitations (event_date)
  where status = 'live' and purged_at is null;
create index invitations_draft_updated_idx on public.invitations (updated_at)
  where status = 'draft';

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.khmer_today()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'Asia/Phnom_Penh')::date;
$$;

-- Last day a live invitation is online (inclusive). Null for drafts.
-- Keep in sync with modules/retention/lib/policy.ts.
create or replace function public.online_until(
  p_event_date    date,
  p_published_at  timestamptz,
  p_online_months smallint
)
returns date
language sql
immutable
set search_path = ''
as $$
  select case when p_published_at is null or p_online_months is null then null else
    (least(
       coalesce(p_event_date, (p_published_at at time zone 'Asia/Phnom_Penh')::date),
       ((p_published_at at time zone 'Asia/Phnom_Penh') + interval '12 months')::date
     ) + make_interval(months => p_online_months))::date
  end;
$$;

-- True while guests may see and reply to the invitation.
-- Replaces the 20261122090100 version, so RSVP/view inserts and the
-- "anyone reads live invitation files" storage policy stop at the end date.
create or replace function public.is_live_invitation(p_invitation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.invitations i
      join public.plans p on p.tier = i.paid_tier
     where i.id = p_invitation_id
       and i.status = 'live'
       and i.purged_at is null
       and public.khmer_today() <= public.online_until(i.event_date, i.published_at, p.online_months)
  );
$$;

-- Public read by exact slug.
--   * online:  the full invitation, as before, plus 'online_until'.
--   * ended:   { ended: true, invitation: names, date, template } only.
--   * otherwise null (unknown slug or a draft).
create or replace function public.get_published_invitation(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when i.purged_at is null
     and public.khmer_today() <= public.online_until(i.event_date, i.published_at, p.online_months)
    then jsonb_build_object(
      'invitation',
        (to_jsonb(i) - 'paid_tier' - 'custom_music_ref' - 'purged_at')
        || jsonb_build_object(
             'music_url', case when i.music_url like 'storage://%' and not p.custom_music then null else i.music_url end,
             'custom_music_name', case when p.custom_music then i.custom_music_name end
           ),
      'tier', p.tier,
      'online_until', public.online_until(i.event_date, i.published_at, p.online_months),
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
    else jsonb_build_object(
      'ended', true,
      'invitation', jsonb_build_object(
        'slug', i.slug, 'template_id', i.template_id, 'event_date', i.event_date,
        'bride_km', i.bride_km, 'bride_en', i.bride_en, 'groom_km', i.groom_km, 'groom_en', i.groom_en
      )
    )
  end
  from public.invitations i
  join public.plans p on p.tier = i.paid_tier
  where i.slug = p_slug and i.status = 'live';
$$;

-- ---------------------------------------------------------------------------
-- Purged invitations are read-only for hosts
-- ---------------------------------------------------------------------------
create or replace function public.invitations_retention_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if public.is_client_role() and old.purged_at is not null then
    raise exception 'invitation_ended' using errcode = 'P0001',
      hint = 'This invitation has ended and its content was deleted.';
  end if;
  return new;
end;
$$;

create trigger invitations_retention_guard
  before update on public.invitations
  for each row execute function public.invitations_retention_guard();

create or replace function public.photos_retention_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if public.is_client_role() and exists (
    select 1 from public.invitations i where i.id = new.invitation_id and i.purged_at is not null
  ) then
    raise exception 'invitation_ended' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger photos_retention_guard
  before insert on public.photos
  for each row execute function public.photos_retention_guard();

grant execute on function
  public.khmer_today(),
  public.online_until(date, timestamptz, smallint),
  public.invitations_retention_guard(),
  public.photos_retention_guard()
to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Retention jobs (service_role only; called by /api/cron/retention)
-- ---------------------------------------------------------------------------

-- Live invitations that ended more than p_grace_days ago and aren't purged yet.
create or replace function public.retention_due_purges(p_grace_days integer default 30, p_limit integer default 50)
returns table (id uuid, user_id uuid, slug text)
language sql
stable
security definer
set search_path = ''
as $$
  select i.id, i.user_id, i.slug
    from public.invitations i
    join public.plans p on p.tier = i.paid_tier
   where i.status = 'live'
     and i.purged_at is null
     and public.online_until(i.event_date, i.published_at, p.online_months) + p_grace_days < public.khmer_today()
   order by i.event_date
   limit p_limit;
$$;

-- Delete everything but the tombstone. The caller removes the storage files
-- (everything under <user_id>/<invitation_id>/ in each bucket) first.
-- Deleting photos clears cover_photo_id through its foreign key.
create or replace function public.purge_invitation_content(p_invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.rsvps  where invitation_id = p_invitation_id;
  delete from public.views  where invitation_id = p_invitation_id;
  delete from public.photos where invitation_id = p_invitation_id;
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

revoke all on function public.retention_due_purges(integer, integer) from public, anon, authenticated;
revoke all on function public.purge_invitation_content(uuid) from public, anon, authenticated;
grant execute on function public.retention_due_purges(integer, integer) to service_role;
grant execute on function public.purge_invitation_content(uuid) to service_role;
