-- TheabKa: RSVP limits per plan, a burst throttle on RSVPs, and Basic -> Premium upgrades.
--
--   * plans.max_rsvps: Basic 150 RSVPs (one RSVP is one form a guest sends, for up to
--     10 people). Premium is shown as "unlimited"; 2,000 is only a safety cap against abuse.
--   * rsvps_guard(): refuses an RSVP past the plan's limit ('rsvp_limit_reached') or when
--     an invitation gets more than 40 in 10 minutes ('rsvp_rate_limited'), so a script
--     can't fill a Basic invitation with fake replies in one go.
--   * payments.kind: 'publish' (draft -> live) or 'upgrade' (live Basic -> Premium, paying
--     the price difference). mark_payment_paid() already raises paid_tier to the payment's plan.
--   * get_published_invitation() also returns rsvps_open, so the guest page can say
--     "replies are closed" before a guest fills in the form.
-- Keep in sync with PLANS in lib/mock-data.ts (maxRsvps).

-- ---------------------------------------------------------------------------
-- Plans
-- ---------------------------------------------------------------------------
alter table public.plans
  add column max_rsvps integer not null default 150 check (max_rsvps between 1 and 100000);

update public.plans set max_rsvps = 150  where tier = 'basic';
update public.plans set max_rsvps = 2000 where tier = 'premium';

alter table public.plans alter column max_rsvps drop default;

-- ---------------------------------------------------------------------------
-- Payments: what the payment was for
-- ---------------------------------------------------------------------------
alter table public.payments
  add column kind text not null default 'publish' check (kind in ('publish', 'upgrade'));

-- ---------------------------------------------------------------------------
-- RSVP guard (SECURITY DEFINER: guests can't read RSVPs, but the count must see them all)
-- ---------------------------------------------------------------------------
create or replace function public.rsvps_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_max    integer;
  v_count  integer;
  v_recent integer;
begin
  -- Lock the invitation row so two guests replying at once can't both pass the count.
  select p.max_rsvps into v_max
    from public.invitations i
    join public.plans p on p.tier = i.paid_tier
   where i.id = new.invitation_id
     for update of i;

  if v_max is null then
    return new; -- not live: the insert policy already refuses it
  end if;

  select count(*) into v_count from public.rsvps r where r.invitation_id = new.invitation_id;
  if v_count >= v_max then
    raise exception 'rsvp_limit_reached' using errcode = 'P0001', detail = format('limit=%s', v_max);
  end if;

  select count(*) into v_recent
    from public.rsvps r
   where r.invitation_id = new.invitation_id
     and r.created_at > now() - interval '10 minutes';
  if v_recent >= 40 then
    raise exception 'rsvp_rate_limited' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

create trigger rsvps_guard
  before insert on public.rsvps
  for each row execute function public.rsvps_guard();

grant execute on function public.rsvps_guard() to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Guest read: same as 20261124090000, plus rsvps_open
-- ---------------------------------------------------------------------------
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
      'rsvps_open', (select count(*) from public.rsvps r where r.invitation_id = i.id) < p.max_rsvps,
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
