# TheabKa ធៀបការ

A Cambodian digital invitation app. Hosts build a wedding or engagement invitation in Khmer and English, pay once per invitation by KHQR, share one link, and collect RSVPs. Guests open the link in a phone browser, with no app and no account.

## Features

**For hosts** (`/app`)

- Sign in with a 6-digit email code or Google. No passwords.
- Pick a template, then fill in a 7-step editor (couple, date and time, venue, program, photos, music, gift) with a live phone preview and autosave.
- Publishing is locked until every required field is filled in, in Khmer and English. The stepper shows a warning on each incomplete step and a green tick on each finished one.
- Pay once by KHQR (Bakong) to publish: Basic $5 (20,000 ៛), Premium $15 (60,000 ៛). Editing after publishing is free.
- Dashboard per invitation: share link (Telegram, Messenger, QR code), opens and RSVP stats, a searchable RSVP list, and exports as an editable Excel file (`.xlsx`) or a print-ready PDF.
- Delete drafts that haven't been published. Their photos and uploads are removed too.

**For guests** (`/i/[slug]`)

- The invitation in both languages, with Khmer numerals and dates, a map, the program, photos, music, and an RSVP form.
- The gift section shows the host's own KHQR image. The app never handles gift money.

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router, TypeScript, `cacheComponents` on), React 19, Tailwind CSS 4, Motion
- [Supabase](https://supabase.com): Postgres with row-level security, Auth, Storage
- KHQR payments through Bakong (sandbox mode for local development)
- `exceljs` (RSVP Excel export, loaded only when used), `qrcode`

## Getting started

You need Node.js 20 or newer and a Supabase project.

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env` in the project root and fill it in. The template and what each variable does are in [docs/environment.md](docs/environment.md). `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are required: the app has no offline mode. For local payments, set `PAYMENT_PROVIDER=sandbox`.

3. Set up the database, auth and storage by following [docs/supabase-setup.md](docs/supabase-setup.md) (migrations, email code template, Google sign-in, payments).

4. Start the dev server and open <http://localhost:3000>:

   ```bash
   npm run dev
   ```

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build. Also type-checks: run it before calling work done |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run bakong:check` | Check the Bakong API token and connection |

There is no test runner yet.

## Project structure

```text
app/              Routes only. Pages stay thin and render a module's component.
modules/<feature>/ One folder per feature: auth, landing, templates, editor,
                  payments, dashboard, guest, legal, share.
  components/     UI
  content.ts      Page copy, with km and en objects
  hooks/ lib/     Client hooks; pure helpers (safe on client and server)
  server/         Server-only code
components/       UI shared across modules: ui/, motion/, invitation/
lib/              Shared infrastructure: store.ts (the only data API for UI),
                  data/, auth/, supabase/, i18n, Khmer formatting, static catalogue
supabase/         migrations/ (schema, RLS, storage) and email templates
docs/             Setup guides and the product spec
```

UI code reads and writes data only through `lib/store.ts`. Never import `lib/data` from components.

## Routes

| Route | Page |
| --- | --- |
| `/` | Landing page |
| `/signin` | Sign in (email code or Google) |
| `/app` | Host's invitations |
| `/app/new` | Pick a template |
| `/app/[id]/edit` | Step-by-step editor |
| `/app/[id]/pay` | Review and pay by KHQR |
| `/app/[id]/dashboard` | Share link, stats, RSVPs, exports |
| `/i/[slug]` | Public guest invitation (server-rendered, with Open Graph tags) |
| `/terms`, `/privacy` | Terms of service and privacy policy |

## Documentation

- [docs/supabase-setup.md](docs/supabase-setup.md): Supabase project, migrations, auth, storage, payments, Vercel, launch checklist
- [docs/environment.md](docs/environment.md): every environment variable
- [docs/design-prompt.md](docs/design-prompt.md): full product spec (screens, states, data model)
- [CLAUDE.md](CLAUDE.md): conventions for contributors and coding agents (design rules, code layout, product rules)

## Deploying

The app is built for Vercel. Add the environment variables in the Vercel project settings, point the Supabase URL configuration and the Google OAuth client at the production domain, and redeploy after changing any `NEXT_PUBLIC_*` value. Details are in [docs/supabase-setup.md](docs/supabase-setup.md#7-vercel).
