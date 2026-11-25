-- TheabKa: gift ledger (បញ្ជីចំណងដៃ), Premium only. Spec: docs/gift-ledger-spec.md.
--
--   * gift_entries: the gifts a host received (cash envelopes, KHQR transfers, gold, other),
--     typed in by the host. A record only: TheabKa never receives or moves gift money.
--   * Owner only (RLS). Guests never read it and no guest-facing function exposes it.
--   * Writable while the invitation is live, on a plan with plans.gift_ledger, and still
--     online. After the online period it is read-only, and purge_invitation_content()
--     deletes it with the rest of the content.
--   * Amounts are whole numbers in one currency: riel, or US cents (like plans.price_usd_cents).
--     Riel and dollars are never converted or added together.
-- Keep in sync with PLANS in lib/mock-data.ts (giftLedger).

-- ---------------------------------------------------------------------------
-- Plans
-- ---------------------------------------------------------------------------
alter table public.plans add column gift_ledger boolean not null default false;

update public.plans set gift_ledger = false where tier = 'basic';
update public.plans set gift_ledger = true  where tier = 'premium';

alter table public.plans alter column gift_ledger drop default;

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------
create table public.gift_entries (
  id               uuid primary key default gen_random_uuid(),
  invitation_id    uuid not null references public.invitations (id) on delete cascade,
  -- The invited guest this gift came from, if the host picked one from the guest list.
  -- The name is copied below too, so the entry still reads right if the guest is removed.
  invited_guest_id uuid references public.invitation_guests (id) on delete set null,
  -- Key of a Khmer honorific (modules/guest/lib/greeting.ts), or '' for none.
  title            text not null default '' check (title in ('', 'mr', 'mrs', 'miss', 'he', 'lok_chumteav', 'teacher_m', 'teacher_f')),
  name_km          text not null check (char_length(btrim(name_km)) between 1 and 100),
  name_en          text not null default '' check (char_length(name_en) <= 100),
  -- 'groom' (ខាងប្រុស), 'bride' (ខាងស្រី), or '' when not set.
  side             text not null default '' check (side in ('', 'groom', 'bride')),
  kind             text not null default 'cash' check (kind in ('cash', 'transfer', 'gold', 'other')),
  currency         text check (currency in ('KHR', 'USD')),
  -- Riel, or US cents.
  amount           bigint check (amount between 1 and 100000000000),
  description      text not null default '' check (char_length(description) <= 100),
  note             text not null default '' check (char_length(note) <= 200),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check ((amount is null) = (currency is null)),
  -- Cash and transfers always have an amount; gold and other may have only a description.
  check (kind in ('gold', 'other') or amount is not null),
  check (amount is not null or char_length(btrim(description)) > 0)
);

create index gift_entries_invitation_idx on public.gift_entries (invitation_id, created_at desc);
create index gift_entries_invited_guest_idx on public.gift_entries (invited_guest_id) where invited_guest_id is not null;

create trigger gift_entries_set_updated_at
  before update on public.gift_entries
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Guard: plan, online period, guest link and a size cap (client roles only;
-- the retention purge runs as the table owner and is not limited).
-- ---------------------------------------------------------------------------
create or replace function public.gift_entries_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invitation uuid := case when tg_op = 'DELETE' then old.invitation_id else new.invitation_id end;
  v_ledger     boolean;
  v_online     boolean;
  v_count      integer;
begin
  if not public.is_client_role() then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  if tg_op = 'UPDATE' and new.invitation_id <> old.invitation_id then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select p.gift_ledger,
         i.purged_at is null and public.khmer_today() <= public.online_until(i.event_date, i.published_at, p.online_months)
    into v_ledger, v_online
    from public.invitations i
    join public.plans p on p.tier = i.paid_tier
   where i.id = v_invitation
     and i.status = 'live'
     for update of i;

  if v_ledger is distinct from true then
    raise exception 'gift_ledger_requires_premium' using errcode = 'P0001';
  end if;
  if v_online is distinct from true then
    raise exception 'invitation_ended' using errcode = 'P0001';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  if new.invited_guest_id is not null and not exists (
    select 1 from public.invitation_guests g
     where g.id = new.invited_guest_id and g.invitation_id = new.invitation_id
  ) then
    raise exception 'invalid_guest' using errcode = 'P0001';
  end if;

  if tg_op = 'INSERT' then
    select count(*) into v_count from public.gift_entries e where e.invitation_id = new.invitation_id;
    if v_count >= 3000 then
      raise exception 'gift_limit_reached' using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

create trigger gift_entries_guard
  before insert or update or delete on public.gift_entries
  for each row execute function public.gift_entries_guard();

-- ---------------------------------------------------------------------------
-- RLS and grants: the invitation's owner only
-- ---------------------------------------------------------------------------
alter table public.gift_entries enable row level security;

revoke all on public.gift_entries from anon, authenticated;
grant select, delete on public.gift_entries to authenticated;
grant insert (invitation_id, invited_guest_id, title, name_km, name_en, side, kind, currency, amount, description, note)
  on public.gift_entries to authenticated;
grant update (invited_guest_id, title, name_km, name_en, side, kind, currency, amount, description, note)
  on public.gift_entries to authenticated;
grant all on public.gift_entries to service_role;

create policy "hosts read own gifts" on public.gift_entries
  for select to authenticated using (public.owns_invitation(invitation_id));
create policy "hosts add own gifts" on public.gift_entries
  for insert to authenticated with check (public.owns_invitation(invitation_id));
create policy "hosts update own gifts" on public.gift_entries
  for update to authenticated
  using (public.owns_invitation(invitation_id)) with check (public.owns_invitation(invitation_id));
create policy "hosts delete own gifts" on public.gift_entries
  for delete to authenticated using (public.owns_invitation(invitation_id));

grant execute on function public.gift_entries_guard() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Retention: purge the ledger too (replaces the 20261124120000 version)
-- ---------------------------------------------------------------------------
create or replace function public.purge_invitation_content(p_invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.gift_entries      where invitation_id = p_invitation_id;
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
