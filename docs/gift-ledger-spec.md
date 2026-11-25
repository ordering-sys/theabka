# Gift Ledger (បញ្ជីចំណងដៃ): feature spec

Status: version 1 built (migration `20261125090000_gift_ledger.sql`). Plan: Premium. Open questions in section 10 use the defaults below until decided.

## 1. Why

At a Cambodian wedding, guests give cash in envelopes (ចំណងដៃ). Family members at the gift table write down every envelope in a notebook: who gave it and how much. The couple keeps that notebook for years, so that when the giver's own family holds a wedding they can give back at least the same amount.

The Gift Ledger replaces that notebook with a list on the invitation dashboard. It is a record only: the host types in what they received. TheabKa never receives, holds or moves gift money, the same as the existing gift KHQR section.

## 2. Plan placement

The ledger is a Premium feature. There is no new plan and no new template.

- It builds on the Premium guest list (`invitation_guests`): an entry can point to an invited guest, so the host doesn't type the name again.
- Two plans and one upgrade price ($10 / 40,000 ៛) stay simple. A third plan would add pricing cards, `plans` rows, upgrade combinations and legal copy.
- It gives Basic hosts a reason to upgrade after the wedding, when the existing Premium features no longer matter to them.

Basic hosts see the ledger tab locked, with a Premium badge and the existing upgrade button (same pattern as the "Invited by name" tab). Premium hosts never see a badge.

## 3. Scope

### Version 1

- Host-only: only the signed-in owner of the invitation can read and write entries.
- Available while the invitation is live and not purged, including after the event (the main time hosts enter envelopes).
- Add, edit and delete entries.
- Totals, search, filter by side, Excel download.
- Never shown to guests.

### Later (not in version 1)

- **Helper link:** a link with a PIN for the person at the gift table, allowed to add entries only. Needs its own access rules and abuse limits.
- **Offline entry:** save entries on the phone when the venue has no signal and send them when it's back.
- **Lookup across invitations:** "What did this family give us?" when the host is invited to their event later. Only useful if the ledger is kept longer than the invitation (see section 8).
- **Import:** paste or upload a list from a spreadsheet.

## 4. What an entry holds

| Field | Required | Notes |
| --- | --- | --- |
| Giver | Yes | Either an invited guest (`invitation_guests`) or a name typed in. The name is always saved on the entry too, so the entry still reads correctly if the guest is later removed from the guest list. |
| Side | No | Groom's side (ខាងប្រុស), bride's side (ខាងស្រី), or not set. Families often split envelopes by side. |
| Gift type | Yes | Cash envelope (ស្រោមសំបុត្រ), KHQR / bank transfer, gold, or other. |
| Amount | Yes for cash and KHQR | A whole number, in one currency: riel or US dollars. Gold and other can have no amount. |
| Currency | With an amount | ៛ or $. No conversion: an envelope with $50 is stored as $50. |
| Description | For gold and other | Short text, such as "ខ្សែក ១ជី" (a 1-chi necklace). |
| Note | No | Free text, up to 200 characters. |

An envelope with both riel and dollars becomes two entries for the same giver. The form makes this easy with a "+ add another currency" control rather than adding a second amount field to every entry.

## 5. Screens

### Dashboard: new "Gift ledger" tab

The invitation dashboard (`/app/[id]/dashboard`) gets a third tab beside "Replies" and "Invited by name": **ចំណងដៃ / Gifts**. Check that three tabs fit at 390 px in Khmer; if not, shorten the labels before adding scrolling.

The tab shows, top to bottom:

1. **Totals card** (ivory panel inside the card): total in riel and total in US dollars, shown separately and never added together. Number of givers. Number of gold / other gifts.
2. **Search and filter:** search by name (Khmer or English), filter by side.
3. **Action row:** one maroon button, "Add a gift". "Download Excel" is a quiet button.
4. **List:** newest first. Each row shows the giver (title + name, with the English name smaller), side, the amount (Khmer numerals in Khmer mode) or the description, and a ⋯ menu with Edit and Delete.
5. **Empty state:** a short explanation of what the ledger is for, and the "Add a gift" button.

On desktop (`lg` and up) the list becomes a table, like the Replies tab.

### Add / edit sheet

Opens in `BottomSheet` with `dialogOnDesktop`.

- **Giver:** a search field over the invited guest list. Typing a name that isn't on the list offers "Use this name". Picking a guest fills the name and title.
- **Side:** two choices plus "not set".
- **Gift type:** four choices, cash envelope selected by default.
- **Amount** with a ៛ / $ switch, using a numeric keypad (`inputMode="numeric"`). The last currency used is remembered.
- **Description** (gold and other) and **Note**.
- **Buttons:** "Save and add next" as the main button, which keeps the sheet open and clears the form, because hosts enter many envelopes in a row. "Done" is the quiet button.

Deleting uses a confirmation in `BottomSheet`, never `window.confirm`.

### Basic hosts

The tab is visible but locked: a blurred sample list, one line explaining the feature, a Premium badge and the upgrade button that leads to `/app/[id]/pay`.

### Ended invitations

After the online period ends and before the content is purged, the ledger is read-only and the tab shows a warning: "Download your ledger before <date>. It will be deleted with the rest of the invitation." The same warning appears on the dashboard's retention notice.

## 6. Excel download

Reuse the `exceljs` export in `modules/dashboard/lib/`. The file has:

- one row per entry: date added, giver (title + Khmer name), English name, side, gift type, amount in riel, amount in USD, description, note.
- totals at the bottom: total riel, total USD, number of givers.
- the sheet title with the couple's names and the event date.

Riel and USD stay in separate columns so a spreadsheet can total each one.

## 7. Data model (sketch)

A new migration, for example `supabase/migrations/<timestamp>_gift_ledger.sql`. Never edit an applied migration.

```sql
create type public.gift_kind as enum ('cash', 'transfer', 'gold', 'other');
create type public.gift_side as enum ('groom', 'bride');

create table public.gift_entries (
  id               uuid primary key default gen_random_uuid(),
  invitation_id    uuid not null references public.invitations (id) on delete cascade,
  invited_guest_id uuid references public.invitation_guests (id) on delete set null,
  title            text not null default '',          -- same keys as invitation_guests.title
  name_km          text not null check (char_length(btrim(name_km)) between 1 and 100),
  name_en          text not null default '' check (char_length(name_en) <= 100),
  side             public.gift_side,                  -- null = not set
  kind             public.gift_kind not null default 'cash',
  currency         text check (currency in ('KHR', 'USD')),
  amount           bigint check (amount > 0),         -- riel, or US cents
  description      text not null default '' check (char_length(description) <= 100),
  note             text not null default '' check (char_length(note) <= 200),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check ((amount is null) = (currency is null)),
  check (kind in ('gold', 'other') or amount is not null)
);

create index gift_entries_invitation_idx on public.gift_entries (invitation_id, created_at desc);
```

Rules to add in the same migration:

- **Guard trigger** (like `invitation_guests_guard()`): the invitation must be live, on Premium (`paid_tier`), and not purged. At most 3,000 entries per invitation. Reject writes after the online period ends (read-only, see section 5). An `invited_guest_id` must belong to the same invitation. Set `updated_at` on update.
- **RLS:** owner only, through `owns_invitation(invitation_id)`, for select, insert, update and delete. No grants to `anon`. No guest-facing function.
- **Column grants:** clients cannot write `invitation_id` on update, `created_at` or `updated_at`.
- **Plans:** add `gift_ledger boolean` to `public.plans` (false for Basic, true for Premium).
- **Retention:** `purge_invitation_content()` deletes `gift_entries` along with RSVPs, views and photos.

Amounts in USD are stored in cents, like `plans.price_usd_cents`. The form only accepts whole dollars in version 1.

Update `lib/supabase/database.types.ts` by hand to match.

Guests never see the ledger, so its writes don't need to refresh the `invitation:<slug>` cache tag.

## 8. Retention and privacy

The ledger links money amounts to named people, so it's the most sensitive data in the app.

**Version 1:** the ledger follows the invitation's lifecycle. It is read-only once the invitation ends, and it is deleted with the rest of the content 30 days later. Hosts are reminded to download the Excel file:

- on the dashboard retention notice while the invitation is online (short reminder),
- in the ended-invitation warning (with the deletion date),
- as a button in that warning, so the download is one tap away.

**Possible later change:** keep only the ledger longer (for example 2 years), because the real use is giving back years later. That would need, all together: `modules/retention/lib/policy.ts`, a new retention migration, the privacy policy and terms in `modules/legal/content.ts`, `LEGAL_UPDATED` in `lib/company.ts`, and the data retention rules in CLAUDE.md. Decide this before launch if it will be a selling point.

**Privacy policy and terms (version 1):** add that hosts may record gifts they received, that this data is visible only to the host, that TheabKa does not handle or verify gift money, and that it is deleted with the invitation.

## 9. Code changes (checklist)

**Plans and pricing**
- `lib/mock-data.ts`: add `giftLedger: boolean` to `PLANS`.
- `modules/landing/content.ts`: add the ledger to the Premium pricing card (km and en), and a FAQ entry.
- CLAUDE.md: add a "Gift ledger" row to the plan table.

**Data**
- New migration (section 7). Update `lib/supabase/database.types.ts`.
- `lib/data/`: types, mappers and functions `listGiftEntries`, `addGiftEntry`, `updateGiftEntry`, `deleteGiftEntry`.
- `lib/store.ts`: expose the same functions. Components use only the store.

**Dashboard**
- `modules/dashboard/components/GiftLedger.tsx`: the tab (totals, search, list, empty and locked states).
- `modules/dashboard/components/GiftEntrySheet.tsx`: the add / edit sheet.
- `modules/dashboard/lib/gift-xlsx.ts`: the Excel export.
- `modules/dashboard/components/InvitationDashboard.tsx`: add the third tab.
- `modules/dashboard/content.ts`: all strings, km and en.

**Retention and legal**
- Retention migration change (purge deletes gift entries) and the ended-invitation warning.
- `modules/legal/content.ts` and `LEGAL_UPDATED`.

**Checks**
- `npm run build` (or `npx next typegen && npx tsc --noEmit -p .`) and `npm run lint`.
- RLS: a second account cannot read or write another host's entries. `anon` gets nothing.
- Basic invitation: inserts are refused by the database, and the tab is locked.
- Upgrade from Basic to Premium: the ledger unlocks with no reload problems.
- Khmer at 390 px: three tabs fit, amounts in Khmer numerals, line height at least 1.6 in the sheet buttons.

## 10. Open questions

1. Keep the ledger longer than the invitation (section 8)? This is the biggest product decision.
2. Is "side" (groom's / bride's) wanted by most couples, or only some? If only some, it could be hidden until turned on.
3. Should the ledger open before the wedding, for gifts given early (common from close family), or only once the invitation is live? This spec assumes live, which covers both because hosts publish before the wedding.
4. Should engagement invitations have the ledger too, or weddings only? This spec assumes both.
