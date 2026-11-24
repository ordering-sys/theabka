-- TheabKa: who comes with a guest invited by name.
-- Replaces invitation_guests.with_family (true/false) with one choice:
--   ''        no one            (លោក សុខ ដារ៉ា)
--   'family'  and family        (… និងក្រុមគ្រួសារ)
--   'partner' and partner       (… និងគូស្នេហ៍)
--   'wife'    and wife          (… និងភរិយា)
--   'husband' and husband       (… និងស្វាមី)
--   'friend'  and friend        (… និងមិត្តភក្តិ)
-- Keep in sync with GUEST_COMPANIONS in modules/guest/lib/greeting.ts.

alter table public.invitation_guests
  add column companion text not null default ''
    check (companion in ('', 'family', 'partner', 'wife', 'husband', 'friend'));

update public.invitation_guests set companion = 'family' where with_family;

-- Column grants: hosts write companion instead of with_family.
revoke insert (with_family), update (with_family) on public.invitation_guests from authenticated;
alter table public.invitation_guests drop column with_family;
grant insert (companion) on public.invitation_guests to authenticated;
grant update (companion) on public.invitation_guests to authenticated;

create or replace function public.get_invited_guest(p_slug text, p_code text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', g.id, 'title', g.title, 'name_km', g.name_km, 'name_en', g.name_en, 'companion', g.companion
  )
  from public.invitation_guests g
  join public.invitations i on i.id = g.invitation_id
  where i.slug = p_slug
    and g.code = p_code
    and i.status = 'live'
    and i.paid_tier = 'premium'
    and public.is_live_invitation(i.id);
$$;
