# TheabKa

@AGENTS.md

A Cambodian digital invitation app. Hosts build a wedding or engagement invitation in Khmer and English, pay once per invitation by KHQR, share one link (or a personal link per guest on Premium), and collect RSVPs. Guests open the link in a phone browser, with no app and no account.

The full product spec (screens, states, components, data model, sample data) is in [docs/design-prompt.md](docs/design-prompt.md). Read the relevant section before building a screen.

## Design references

The visual source of truth is two prototype exports. Match their layout, spacing, colours and copy, but write clean Next.js + Tailwind code; never copy their HTML. Ignore each folder's `_runtime/` (it only runs the prototypes). Each `*.dc.html` has its markup at the top and its Khmer/English strings and sample data in the `data-dc-script` block at the bottom; `canvas.json` lists the screens.

- [theabka-mobile-resource/](theabka-mobile-resource/) (390 px): `Main` (landing), `SignIn`, `Templates`, `Editor`, `Pay`, `Dashboard`, `Invite` (guest invitation, RSVP, gift), `States` (empty, loading, upload error, payment expired, 404, link preview).
- [theabka-web-resource/](theabka-web-resource/) (desktop, `lg` and up): `Main` (landing), `WebHowItWorks`, `WebEditor`, `WebDashboard`.

Where the spec and a prototype disagree, follow the prototype and say so (e.g. the sample date is Sunday 13 December 2026; 15 December is a Tuesday).

## Current state

All 9 screens and the extra states are built, plus data retention, RSVP limits, Basic → Premium upgrades and personal guest links. UI code reads and writes data only through `lib/store.ts`, which is backed by Supabase only (`lib/data/`, `lib/auth/`, `app/api/`); `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are required (there is no localStorage fallback). Never import `lib/data` directly from components.

- Server-side guest lookups go through `modules/guest/server/published.ts`; both guest routes render `InvitationPageView` from `modules/guest/server/invitation-page.tsx`.
- Storage buckets (`photos`, `music`, `gift-qr`) are private. Database columns hold refs (`storage://<bucket>/<path>`, see `lib/data/storage-refs.ts`), turned into signed URLs on read. Upload size and type limits are in `lib/data/limits.ts`; the buckets enforce the same rules.
- After a host saves a live invitation, call the `refreshPublishedInvitation` server action (`lib/data/actions.ts`) so guests see the edit at once.
- `proxy.ts` (Next 16's replacement for middleware) keeps the Supabase session cookie fresh on `/app/*` and `/signin` only; guest pages are untouched.
- Google sign-in runs on our own domain (`/auth/google`, `lib/auth/google-oauth.ts`) when `NEXT_PUBLIC_GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set, otherwise through Supabase's hosted flow.
- The Premium guest list download is an Excel file built with `exceljs` (`modules/dashboard/lib/rsvp-xlsx.ts`). Animations use `motion` (`components/motion/`).
- Templates, plans and music tracks are static in `lib/mock-data.ts` (the database seeds the same ids). Its sample couple and RSVPs are only demo content for the landing page and editor placeholders, never a host's data. The sample invitation is `/i/dara-sophea`, with a sample personal link at `/i/dara-sophea/sample`.
- Schema, RLS, storage and database functions live in `supabase/migrations/` (apply them in order; never edit an applied one, add a new migration). `lib/supabase/database.types.ts` is hand-written to match them; update it with every migration.
- Docs: setup steps in `docs/supabase-setup.md`, env vars in `docs/environment.md`.
- Built-in songs: only `public/music/special-someone.mp3` exists; `sarika`, `lotus`, `mangala` and `golden` still need licensed audio files.
- shadcn/ui and PostHog are not installed.

Code layout (modular, by feature):

- `app/`: routes only. Pages stay thin and render a module's component.
- `modules/<feature>/`: one folder per feature: `auth`, `landing`, `templates`, `editor`, `payments`, `dashboard`, `guest`, `legal`, `share`, `retention`. Inside each one: `components/` (UI), `content.ts` (page copy with `km` and `en` objects, read with `useContent`), and only when needed `hooks/`, `lib/` (pure helpers, safe on client and server) and `server/` (server-only code, never imported by client components).
- `components/`: UI shared across modules only: `ui/` (buttons, `BottomSheet`, `Select`, toasts), `motion/`, `invitation/` (lotus, kbach, template thumbnails).
- `lib/`: core infrastructure shared by every module: `store.ts`, `data/`, `auth/`, `supabase/`, `i18n.tsx`, `khmer.ts`, `mock-data.ts`, `cn.ts`, `company.ts`.

Modules may import from `components/`, `lib/` and, when needed, from another module's files. `lib/` and `components/` never import from `modules/` (so a few types, like guest titles, are duplicated in `lib/`). Import with the `@/` alias across folders and with `./` inside the same folder.

## Commands

- `npm run dev`: start the dev server
- `npm run build`: production build (run it to check types before calling work done). On this machine it can run out of memory during static page generation (Windows paging file); close the dev server first. If it still fails, `npx next typegen && npx tsc --noEmit -p .` checks types without building.
- `npm run lint`: ESLint
- `npx next typegen`: regenerate route types (needed after adding a route, before a standalone `tsc`).
- `npm run bakong:check`: check the Bakong KHQR settings and token (never prints secrets). `-- --qr 0.01` writes a real $0.01 test QR and waits for payment; `-- --md5 <md5>` looks up one payment.
- `node --env-file=.env scripts/push-email-templates.mjs [--dry-run]`: push the 6-digit sign-in code email (`supabase/templates/otp-code.html`) to Supabase Auth. Needs `SUPABASE_ACCESS_TOKEN`.

There is no test runner yet.

## Stack

- Next.js 16 (App Router, TypeScript), React 19, Tailwind CSS 4. This Next.js version differs from older ones: check `node_modules/next/dist/docs/` before using an API you are unsure of (see AGENTS.md). `revalidateTag` needs a second argument (`"max"` or `{ expire: 0 }`); `updateTag` works only in Server Actions.
- Import alias `@/*` points to the project root.
- `cacheComponents` is on in `next.config.ts`: anything that reads runtime data (`useParams`, `useSearchParams`, `params`, cookies) must sit inside a `<Suspense>` boundary or the build fails with a "blocking prerender" error. Guest pages instead use `export const instant = false`. Dynamic routes need `generateStaticParams` with at least one entry. Pipe-free `npm run build` exit codes are the real pass/fail signal.
- Guest invitation data is cached with `"use cache"` and tagged `invitation:<slug>` (`invitationTag` in `lib/data/server.ts`). Anything that changes what guests see (host edits, guest list edits, payments, retention) must refresh that tag.
- `cn()` in `lib/cn.ts` only joins class names; it does not merge Tailwind classes, so never pass two conflicting classes (e.g. two `max-w-*`).
- Backend: Supabase (Postgres with row-level security, Storage, Auth). Hosts sign in with a 6-digit email code or Google; there is no phone or password sign-in.
- Payments: KHQR via Bakong only for now (`modules/payments/server/bakong.ts`, QR built in `modules/payments/server/khqr.ts`); ABA PayWay is not supported yet. `PAYMENT_PROVIDER=sandbox` gives fake payments for local development and is always refused in production.
- Scheduled job: `vercel.json` runs `/api/cron/retention` daily at 03:00 Cambodia time; it needs `CRON_SECRET` and `SUPABASE_SERVICE_ROLE_KEY`.
- Planned: shadcn/ui, PostHog, Vercel.

## Routes

- `/`: landing page (pricing, FAQ). `/privacy`, `/terms`: legal pages. `/signin`: sign in.
- `/auth/callback` (Supabase auth callback), `/auth/google` and `/auth/google/callback` (Google sign-in on our own domain).
- `/i/[slug]`: public guest invitation, server-rendered with Open Graph tags. Shows a bilingual "this invitation has ended" page after its online period.
- `/i/[slug]/[code]`: a guest's personal link (Premium): greets them by title and name, pre-fills and links their RSVP. Unknown codes show the general invitation.
- `/app`: host dashboard (list of invitations)
- `/app/new`: pick a template
- `/app/[id]/edit`: step-form editor
- `/app/[id]/pay`: preview and pay; for a live Basic invitation, upgrade to Premium
- `/app/[id]/dashboard`: share card, stats, RSVP limit meter (Basic), tabs for Replies and Invited by name
- `/api/payments/khqr` (create a charge; `upgrade: true` for upgrades), `/api/payments/status`, `/api/payments/webhook`, `/api/cron/retention`

## Product rules

- Pricing: Basic $5 (20,000 ៛), Premium $15 (60,000 ៛), paid once per invitation at publish. A live Basic invitation can upgrade to Premium by paying the difference ($10 / 40,000 ៛); the link stays the same. Building, previewing and editing after publishing are free. Always show both USD and riel.
- What each plan includes lives in `PLANS` (`lib/mock-data.ts`) and the `plans` table; keep them in sync, and with the pricing cards in `modules/landing/content.ts`:

  | | Basic | Premium |
  | --- | --- | --- |
  | Photos | 3 | 6 |
  | Own song upload | no | yes |
  | Guest replies (RSVPs) | 150 | unlimited (2,000 abuse cap in the database) |
  | Opening | plain "tap to open" cover | animated doors |
  | Guest list download | no | yes |
  | Personal links per guest | no | yes |
  | Online after the event | 3 months | 6 months |

- One RSVP is one form a guest sends, for up to 10 people; every reply counts toward the limit, including "not coming". In host-facing copy say "guest replies" or "families", not "RSVPs". The database also throttles RSVPs to 40 per invitation per 10 minutes.
- Personal links (`invitation_guests`): the host adds guests with a title (លោក, លោកស្រី, កញ្ញា, ឯកឧត្តម, លោកជំទាវ, លោកគ្រូ, អ្នកគ្រូ, or none), a Khmer name, an optional English name, and who comes with them (family, partner, wife, husband, friend, or no one). Greeting text and keys live in `modules/guest/lib/greeting.ts`. Replies from a personal link are linked to the guest and count toward the RSVP limit.
- The gift section shows the host's own KHQR image. The app never handles gift money.
- Invitation statuses: draft and live. A paid payment (webhook or status poll) sets the invitation to live via `mark_payment_paid()`.
- Data retention: a live invitation stays online 3 months (Basic) or 6 months (Premium) after the event date (counted from no later than 12 months after publishing), then shows "ended". 30 days later its content is purged (photos, music, gift QR, RSVPs, views, guest names, event details), keeping only names, date and slug. Unpaid drafts are deleted after 3 months without edits. Unfinished payments are deleted, and raw provider data cleared, after 30 days. Rules live in `modules/retention/lib/policy.ts` and the retention migrations; the privacy policy and terms (`modules/legal/content.ts`, with `LEGAL_UPDATED` in `lib/company.ts`) describe them. Change all of them together.

## Language and design

- Khmer first, English beside it. A KH/EN toggle switches the host UI; the guest invitation always shows both languages.
- Invitations use Khmer numerals and Khmer dates (e.g. ថ្ងៃអាទិត្យ ទី១៥ ខែធ្នូ ឆ្នាំ២០២៦), with the Western date smaller underneath.
- Colours: maroon `#7A1F2B` (primary), gold `#C9A24B` (accent), ivory `#FBF6EE` (soft tint for panels inside cards), charcoal `#2B2B2B` (text), jade `#5E8C7A` (success / attending). Define them as Tailwind theme tokens rather than hard-coding hex values.
- Page and navbar backgrounds are white on every page (`bg-white`), not ivory. This overrides the prototypes, which use ivory. Cards stand out through `shadow-card`, which includes a hairline edge.
- Fonts (Google Fonts via `next/font`): Moul (Khmer decorative titles only), Kantumruy Pro (Khmer UI and body), Playfair Display (English invitation titles), Inter (English UI).
- Khmer text needs line height of at least 1.6 so stacked vowels and subscripts don't clip, including inside buttons.
- Mobile-first at 390 px. Tap targets at least 44 px, 12 px corner radius, shadows on cards only.
- Khmer ornaments (kbach borders, lotus, jasmine) go on invitation pages only, used lightly. Keep the host app plain.
- Host UI patterns:
  - Forms and confirmations open in `BottomSheet` with `dialogOnDesktop` (a sheet from the bottom on phones, a centred modal from 640 px).
  - Never use `window.confirm` or `alert`.
  - Use `components/ui/Select` instead of a native `<select>`.
  - Keep one strong (maroon) button per area; secondary actions go in a quiet button or a ⋯ menu.
  - Show a Premium badge only where a Basic host meets a locked feature, never to Premium hosts.
