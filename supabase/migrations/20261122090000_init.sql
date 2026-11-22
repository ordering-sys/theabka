-- TheabKa: core schema (docs/design-prompt.md section 5).
-- Money is stored as integers: USD in cents, KHR in whole riel.
-- Never edit this file once applied; add a new migration instead.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.event_type as enum ('wedding', 'engagement');
create type public.tier as enum ('basic', 'premium');
create type public.invitation_status as enum ('draft', 'live');
create type public.payment_status as enum ('pending', 'paid', 'expired', 'refunded');
create type public.payment_provider as enum ('aba_payway', 'bakong', 'sandbox');
create type public.payment_currency as enum ('USD', 'KHR');
create type public.app_language as enum ('km', 'en');

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- True when the statement runs as a client (anon key or a signed-in user),
-- false for service_role, postgres and SECURITY DEFINER functions owned by postgres.
create or replace function public.is_client_role()
returns boolean
language sql
stable
set search_path = ''
as $$
  select current_user in ('anon', 'authenticated');
$$;

create or replace function public.generate_slug()
returns text
language sql
volatile
set search_path = ''
as $$
  select 'inv-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 10);
$$;

-- ---------------------------------------------------------------------------
-- Plans: single source of truth for prices and limits
-- ---------------------------------------------------------------------------
create table public.plans (
  tier            public.tier primary key,
  price_usd_cents integer  not null check (price_usd_cents > 0),
  price_khr       integer  not null check (price_khr > 0),
  max_photos      smallint not null check (max_photos between 0 and 20),
  custom_music    boolean  not null
);

insert into public.plans (tier, price_usd_cents, price_khr, max_photos, custom_music) values
  ('basic',    500, 20000, 3, false),
  ('premium', 1500, 60000, 6, true);

-- ---------------------------------------------------------------------------
-- Profiles (the "User" entity; auth.users holds credentials)
-- ---------------------------------------------------------------------------
-- Hosts sign in with a 6-digit email code or Google (no phone, no password).
-- email mirrors auth.users.email (lower-cased) and is kept in sync by triggers;
-- hosts can't edit it directly (see the column grants in the RLS migration).
create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text unique check (
               email is null
               or (email = lower(email) and char_length(email) <= 254 and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')
             ),
  google_id  text unique,
  name       text check (name is null or char_length(name) <= 100),
  language   public.app_language not null default 'km',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, google_id, name)
  values (
    new.id,
    nullif(lower(trim(new.email)), ''),
    case when new.raw_app_meta_data ->> 'provider' = 'google'
         then coalesce(new.raw_user_meta_data ->> 'provider_id', new.raw_user_meta_data ->> 'sub') end,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'), 100)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep profiles.email in step when a user changes (and confirms) their email in Supabase Auth.
create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
     set email = nullif(lower(trim(new.email)), '')
   where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_user_email_change() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Templates and built-in music
-- ---------------------------------------------------------------------------
create table public.templates (
  id            text primary key check (id ~ '^[a-z0-9-]{2,40}$'),
  name_km       text not null,
  name_en       text not null,
  event_type    public.event_type not null,
  tier          public.tier not null references public.plans (tier),
  thumbnail_url text,
  theme         jsonb not null default '{}'::jsonb check (jsonb_typeof(theme) = 'object'),
  position      smallint not null default 0,
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

insert into public.templates (id, name_km, name_en, event_type, tier, theme, position) values
  ('royal',   'ក្រហមរាជ',        'Royal Maroon',  'wedding',    'premium', '{"bg":"#7A1F2B","fg":"#FBF6EE","accent":"#C9A24B","ctaFg":"#2B2B2B"}', 1),
  ('lotus',   'ផ្កាឈូកមាស',       'Golden Lotus',  'wedding',    'premium', '{"bg":"#FBF6EE","fg":"#2B2B2B","accent":"#8A6A1F","ctaFg":"#FFFFFF"}', 2),
  ('jasmine', 'ផ្កាម្លិះ',          'Jasmine',       'wedding',    'basic',   '{"bg":"#FFFFFF","fg":"#2B2B2B","accent":"#4C7564","ctaFg":"#FFFFFF"}', 3),
  ('angkor',  'អង្គរពេលព្រលប់',    'Angkor Dusk',   'wedding',    'premium', '{"bg":"#3B2A4A","fg":"#F6EEDD","accent":"#D9B866","ctaFg":"#2B2B2B"}', 4),
  ('ivory',   'ភ្លុកបុរាណ',        'Classic Ivory', 'wedding',    'basic',   '{"bg":"#F4ECDD","fg":"#2B2B2B","accent":"#7A1F2B","ctaFg":"#FFFFFF"}', 5),
  ('rumduol', 'រំដួល',            'Rumduol',       'engagement', 'basic',   '{"bg":"#F3E3C3","fg":"#2B2B2B","accent":"#7A4A12","ctaFg":"#FFFFFF"}', 6),
  ('jade',    'សួនមរកត',          'Jade Garden',   'engagement', 'premium', '{"bg":"#3F6B5B","fg":"#F6EEDD","accent":"#E3C277","ctaFg":"#2B2B2B"}', 7),
  ('rose',    'កុលាបសូត្រ',         'Silk Rose',     'engagement', 'basic',   '{"bg":"#F2DCD7","fg":"#2B2B2B","accent":"#8E3B46","ctaFg":"#FFFFFF"}', 8);

create table public.music_tracks (
  id         text primary key check (id ~ '^[a-z0-9-]{2,40}$'),
  name_km    text not null,
  name_en    text not null,
  style_km   text not null,
  style_en   text not null,
  duration   text not null check (duration ~ '^[0-9]{1,2}:[0-9]{2}$'),
  url        text not null unique,
  position   smallint not null default 0,
  active     boolean not null default true
);

insert into public.music_tracks (id, name_km, name_en, style_km, style_en, duration, url, position) values
  ('sarika',  'ភ្លេងការ សារិកាកែវ', 'Sarika Keo (traditional wedding music)', 'ភ្លេងប្រពៃណី', 'Traditional',        '3:12', '/music/sarika.mp3',  1),
  ('lotus',   'ផ្កាឈូករីក',        'Lotus in Bloom',                         'ព្យ៉ាណូ',      'Piano',              '2:48', '/music/lotus.mp3',   2),
  ('forever', 'ស្នេហាអមតៈ',        'Forever Love',                           'អាកូស្ទិក',    'Acoustic',           '3:30', '/music/forever.mp3', 3),
  ('mangala', 'ពិធីមង្គល',          'Mangala Ceremony',                       'ភ្លេងខ្មែរ',    'Khmer instrumental', '2:55', '/music/mangala.mp3', 4),
  ('golden',  'ថ្ងៃមាស',           'Golden Day',                             'ភ្លេងខ្សែ',     'Strings',            '3:05', '/music/golden.mp3',  5);

-- ---------------------------------------------------------------------------
-- Invitations
-- Storage-backed fields (custom_music_ref, gift_qr_url) hold refs like
-- 'storage://<bucket>/<user_id>/<invitation_id>/<file>'; the app turns them
-- into signed URLs when reading.
-- music_url is the selected song: null, a built-in track url, or equal to
-- custom_music_ref (the uploaded song, Premium only). Writing any value that
-- starts with 'custom:' (the editor's sentinel) selects the uploaded song.
-- ---------------------------------------------------------------------------
create table public.invitations (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users (id) on delete cascade,
  template_id         text not null references public.templates (id),
  slug                text not null unique default public.generate_slug()
                        check (slug ~ '^[a-z0-9](?:[a-z0-9-]{1,62}[a-z0-9])$'),
  status              public.invitation_status not null default 'draft',
  paid_tier           public.tier references public.plans (tier),
  bride_km            text not null default '' check (char_length(bride_km) <= 100),
  bride_en            text not null default '' check (char_length(bride_en) <= 100),
  groom_km            text not null default '' check (char_length(groom_km) <= 100),
  groom_en            text not null default '' check (char_length(groom_en) <= 100),
  parents             jsonb not null default '{}'::jsonb
                        check (jsonb_typeof(parents) = 'object' and pg_column_size(parents) < 8192),
  event_date          date,
  start_time          time,
  venue_name_km       text not null default '' check (char_length(venue_name_km) <= 200),
  venue_name_en       text not null default '' check (char_length(venue_name_en) <= 200),
  venue_address_km    text not null default '' check (char_length(venue_address_km) <= 500),
  venue_address_en    text not null default '' check (char_length(venue_address_en) <= 500),
  lat                 double precision check (lat between -90 and 90),
  lng                 double precision check (lng between -180 and 180),
  schedule            jsonb not null default '[]'::jsonb
                        check (jsonb_typeof(schedule) = 'array' and jsonb_array_length(schedule) <= 20
                               and pg_column_size(schedule) < 16384),
  cover_photo_id      uuid,
  music_url           text check (char_length(music_url) <= 1000),
  custom_music_ref    text check (char_length(custom_music_ref) <= 1000),
  custom_music_name  text check (char_length(custom_music_name) <= 200),
  music_muted_default boolean not null default false,
  gift_qr_url         text check (char_length(gift_qr_url) <= 1000),
  gift_note_km        text check (char_length(gift_note_km) <= 500),
  gift_note_en        text check (char_length(gift_note_en) <= 500),
  published_at        timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint live_requires_payment check (status = 'draft' or (paid_tier is not null and published_at is not null))
);

create index invitations_user_created_idx on public.invitations (user_id, created_at desc);
create index invitations_live_slug_idx on public.invitations (slug) where status = 'live';

create trigger invitations_updated_at
  before update on public.invitations
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Photos
-- ---------------------------------------------------------------------------
create table public.photos (
  id            uuid primary key default gen_random_uuid(),
  invitation_id uuid not null references public.invitations (id) on delete cascade,
  storage_path  text not null unique check (storage_path !~ '\.\.'),
  position      smallint not null default 0 check (position between 0 and 19),
  created_at    timestamptz not null default now()
);

create index photos_invitation_position_idx on public.photos (invitation_id, position);

alter table public.invitations
  add constraint invitations_cover_photo_fk
  foreign key (cover_photo_id) references public.photos (id) on delete set null;

-- ---------------------------------------------------------------------------
-- RSVPs and views
-- ---------------------------------------------------------------------------
create table public.rsvps (
  id            uuid primary key default gen_random_uuid(),
  invitation_id uuid not null references public.invitations (id) on delete cascade,
  guest_name    text not null check (char_length(btrim(guest_name)) between 1 and 80),
  attending     boolean not null,
  party_size    smallint not null default 1 check (party_size between 1 and 10),
  message       text check (message is null or char_length(message) <= 500),
  created_at    timestamptz not null default now()
);

create index rsvps_invitation_created_idx on public.rsvps (invitation_id, created_at desc);

create table public.views (
  id            bigint generated always as identity primary key,
  invitation_id uuid not null references public.invitations (id) on delete cascade,
  opened_at     timestamptz not null default now()
);

create index views_invitation_idx on public.views (invitation_id, opened_at desc);

-- ---------------------------------------------------------------------------
-- Payments (written only by the server with the service role)
-- ---------------------------------------------------------------------------
create table public.payments (
  id               uuid primary key default gen_random_uuid(),
  invitation_id    uuid references public.invitations (id) on delete set null,
  user_id          uuid references auth.users (id) on delete set null,
  plan             public.tier not null references public.plans (tier),
  amount_usd_cents integer not null check (amount_usd_cents > 0),
  amount_khr       integer not null check (amount_khr > 0),
  currency         public.payment_currency not null,
  provider         public.payment_provider not null,
  provider_ref     text not null unique check (char_length(provider_ref) between 4 and 128),
  status           public.payment_status not null default 'pending',
  qr_payload       text,
  expires_at       timestamptz not null,
  paid_at          timestamptz,
  raw              jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint paid_has_timestamp check (status <> 'paid' or paid_at is not null)
);

create index payments_invitation_idx on public.payments (invitation_id, created_at desc);
create index payments_user_idx on public.payments (user_id, created_at desc);

create trigger payments_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Invitation guard: status/publish fields are server-only, plan rules enforced.
-- ---------------------------------------------------------------------------
create or replace function public.invitations_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_template_tier public.tier;
  v_tier          public.tier;
  v_custom_music  boolean;
  v_prefix        text;
begin
  if public.is_client_role() then
    if tg_op = 'INSERT' then
      new.status := 'draft';
      new.published_at := null;
      new.paid_tier := null;
      if new.user_id is distinct from auth.uid() then
        raise exception 'forbidden' using errcode = '42501';
      end if;
    else
      if new.status is distinct from old.status
         or new.published_at is distinct from old.published_at
         or new.paid_tier is distinct from old.paid_tier then
        raise exception 'status_change_forbidden'
          using errcode = '42501', hint = 'Invitations go live only through the payment webhook.';
      end if;
      if new.id <> old.id or new.user_id <> old.user_id or new.created_at <> old.created_at then
        raise exception 'forbidden' using errcode = '42501';
      end if;
      if old.status = 'live' and new.slug <> old.slug then
        raise exception 'slug_locked' using errcode = 'P0001', hint = 'The link of a live invitation cannot change.';
      end if;
    end if;
  end if;

  select t.tier into v_template_tier from public.templates t where t.id = new.template_id;
  v_tier := case when new.status = 'live' then coalesce(new.paid_tier, v_template_tier) else v_template_tier end;
  select p.custom_music into v_custom_music from public.plans p where p.tier = v_tier;

  -- A Basic-paid live invitation cannot switch to a Premium template.
  if public.is_client_role() and new.status = 'live' and new.paid_tier = 'basic' and v_template_tier = 'premium'
     and (tg_op = 'INSERT' or new.template_id is distinct from old.template_id) then
    raise exception 'template_requires_upgrade' using errcode = 'P0001';
  end if;

  -- Uploaded song: must sit in this invitation's music folder; Premium only.
  if new.custom_music_ref is not null
     and (tg_op = 'INSERT' or new.custom_music_ref is distinct from old.custom_music_ref) then
    v_prefix := 'storage://music/' || new.user_id::text || '/' || new.id::text || '/';
    if left(new.custom_music_ref, length(v_prefix)) <> v_prefix then
      raise exception 'invalid_music_ref' using errcode = 'P0001';
    end if;
    if not coalesce(v_custom_music, false) then
      raise exception 'custom_music_requires_premium' using errcode = 'P0001';
    end if;
  end if;
  if new.custom_music_ref is null then
    new.custom_music_name := null;
  end if;

  -- 'custom:<anything>' selects the uploaded song.
  if new.music_url like 'custom:%' then
    if new.custom_music_ref is null then
      raise exception 'no_custom_music' using errcode = 'P0001';
    end if;
    new.music_url := new.custom_music_ref;
  end if;

  -- Uploaded song was removed: clear the selection.
  if new.music_url like 'storage://%' and new.music_url is distinct from new.custom_music_ref then
    new.music_url := null;
  end if;

  -- Selected song: null, a built-in track, or (Premium only) the uploaded song.
  if new.music_url is not null and (tg_op = 'INSERT' or new.music_url is distinct from old.music_url) then
    if new.music_url like 'storage://%' then
      if not coalesce(v_custom_music, false) then
        raise exception 'custom_music_requires_premium' using errcode = 'P0001';
      end if;
    elsif not exists (select 1 from public.music_tracks m where m.url = new.music_url and m.active) then
      raise exception 'invalid_music_url' using errcode = 'P0001';
    end if;
  end if;

  -- Gift QR: null or a file in this invitation's gift-qr folder.
  if new.gift_qr_url is not null and (tg_op = 'INSERT' or new.gift_qr_url is distinct from old.gift_qr_url) then
    v_prefix := 'storage://gift-qr/' || new.user_id::text || '/' || new.id::text || '/';
    if left(new.gift_qr_url, length(v_prefix)) <> v_prefix then
      raise exception 'invalid_gift_qr_ref' using errcode = 'P0001';
    end if;
  end if;

  -- Cover photo must belong to this invitation.
  if new.cover_photo_id is not null and (tg_op = 'INSERT' or new.cover_photo_id is distinct from old.cover_photo_id) then
    if not exists (select 1 from public.photos ph where ph.id = new.cover_photo_id and ph.invitation_id = new.id) then
      raise exception 'invalid_cover_photo' using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

create trigger invitations_guard
  before insert or update on public.invitations
  for each row execute function public.invitations_guard();

-- ---------------------------------------------------------------------------
-- Photo guard: plan photo limit, path must sit under the owner's folder.
-- ---------------------------------------------------------------------------
create or replace function public.photos_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_tier    public.tier;
  v_max     smallint;
  v_count   integer;
begin
  if tg_op = 'UPDATE' then
    if new.invitation_id <> old.invitation_id or new.storage_path <> old.storage_path then
      raise exception 'forbidden' using errcode = '42501';
    end if;
    return new;
  end if;

  -- Lock the invitation row so concurrent uploads can't both pass the count.
  select i.user_id,
         case when i.status = 'live' then coalesce(i.paid_tier, t.tier) else t.tier end
    into v_user_id, v_tier
    from public.invitations i
    join public.templates t on t.id = i.template_id
   where i.id = new.invitation_id
     for update of i;

  if v_user_id is null then
    raise exception 'invitation_not_found' using errcode = 'P0002';
  end if;

  if left(new.storage_path, 74) <> v_user_id::text || '/' || new.invitation_id::text || '/' then
    raise exception 'invalid_storage_path' using errcode = 'P0001';
  end if;

  select p.max_photos into v_max from public.plans p where p.tier = v_tier;
  select count(*) into v_count from public.photos ph where ph.invitation_id = new.invitation_id;
  if v_count >= v_max then
    raise exception 'photo_limit_reached' using errcode = 'P0001', detail = format('limit=%s', v_max);
  end if;

  return new;
end;
$$;

create trigger photos_guard
  before insert or update on public.photos
  for each row execute function public.photos_guard();

-- ---------------------------------------------------------------------------
-- Payment webhook: mark paid + set invitation live, atomically and idempotently.
-- Callable by service_role only (revoked from clients below).
-- ---------------------------------------------------------------------------
create or replace function public.mark_payment_paid(
  p_provider_ref text,
  p_amount       integer,
  p_currency     public.payment_currency,
  p_raw          jsonb default null
)
returns table (payment_id uuid, invitation_id uuid, slug text, already_paid boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payment public.payments%rowtype;
  v_slug    text;
begin
  select * into v_payment from public.payments p where p.provider_ref = p_provider_ref for update;
  if not found then
    raise exception 'payment_not_found' using errcode = 'P0002';
  end if;

  if v_payment.status = 'paid' then
    select i.slug into v_slug from public.invitations i where i.id = v_payment.invitation_id;
    return query select v_payment.id, v_payment.invitation_id, v_slug, true;
    return;
  end if;

  if v_payment.status = 'refunded' then
    raise exception 'payment_refunded' using errcode = 'P0001';
  end if;

  if (p_currency = 'USD' and (v_payment.currency <> 'USD' or p_amount <> v_payment.amount_usd_cents))
     or (p_currency = 'KHR' and (v_payment.currency <> 'KHR' or p_amount <> v_payment.amount_khr)) then
    raise exception 'amount_mismatch' using errcode = 'P0001',
      detail = format('expected %s %s, got %s %s', v_payment.currency,
        case when v_payment.currency = 'USD' then v_payment.amount_usd_cents else v_payment.amount_khr end,
        p_currency, p_amount);
  end if;

  -- Accept pending and expired: if money arrived after the QR expired we still honour it.
  update public.payments
     set status = 'paid', paid_at = now(), raw = coalesce(p_raw, raw)
   where id = v_payment.id;

  update public.invitations i
     set status = 'live',
         paid_tier = case
           when i.paid_tier = 'premium' then 'premium'::public.tier
           else v_payment.plan end,
         published_at = coalesce(i.published_at, now())
   where i.id = v_payment.invitation_id
  returning i.slug into v_slug;

  return query select v_payment.id, v_payment.invitation_id, v_slug, false;
end;
$$;

revoke all on function public.mark_payment_paid(text, integer, public.payment_currency, jsonb) from public, anon, authenticated;
grant execute on function public.mark_payment_paid(text, integer, public.payment_currency, jsonb) to service_role;
