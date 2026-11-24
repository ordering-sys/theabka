# TheabKa

@AGENTS.md

A Cambodian digital invitation app. Hosts build a wedding or engagement invitation in Khmer and English, pay once per invitation by KHQR, share one link, and collect RSVPs. Guests open the link in a phone browser, with no app and no account.

The full product spec (screens, states, components, data model, sample data) is in [docs/design-prompt.md](docs/design-prompt.md). Read the relevant section before building a screen.

## Design references

The visual source of truth is two prototype exports. Match their layout, spacing, colours and copy, but write clean Next.js + Tailwind code; never copy their HTML. Ignore each folder's `_runtime/` (it only runs the prototypes). Each `*.dc.html` has its markup at the top and its Khmer/English strings and sample data in the `data-dc-script` block at the bottom; `canvas.json` lists the screens.

- [theabka-mobile-resource/](theabka-mobile-resource/) (390 px): `Main` (landing), `SignIn`, `Templates`, `Editor`, `Pay`, `Dashboard`, `Invite` (guest invitation, RSVP, gift), `States` (empty, loading, upload error, payment expired, 404, link preview).
- [theabka-web-resource/](theabka-web-resource/) (desktop, `lg` and up): `Main` (landing), `WebHowItWorks`, `WebEditor`, `WebDashboard`.

Where the spec and a prototype disagree, follow the prototype and say so (e.g. the sample date is Sunday 13 December 2026; 15 December is a Tuesday).

## Current state

All 9 screens and the extra states are built. UI code reads and writes data only through `lib/store.ts`, which is backed by Supabase only (`lib/data/`, `lib/auth/`, `app/api/payments/`); `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are required (there is no localStorage fallback). Server-side guest lookups go through `modules/guest/server/published.ts`. Templates, plans and music tracks are static in `lib/mock-data.ts` (the database seeds the same ids); its sample couple and RSVPs are only demo content for the landing page and editor placeholders, never a host's data. Schema, RLS and storage live in `supabase/migrations/`; setup steps in `docs/supabase-setup.md`, env vars in `docs/environment.md`. Never import `lib/data` directly from components. shadcn/ui and PostHog are not installed.

Code layout (modular, by feature):

- `app/`: routes only. Pages stay thin and render a module's component.
- `modules/<feature>/`: one folder per feature: `auth`, `landing`, `templates`, `editor`, `payments`, `dashboard`, `guest`, `legal`, `share`. Inside each one: `components/` (UI), `content.ts` (page copy with `km` and `en` objects, read with `useContent`), and only when needed `hooks/`, `lib/` (pure helpers, safe on client and server) and `server/` (server-only code, never imported by client components).
- `components/`: UI shared across modules only: `ui/` (buttons, sheets, toasts), `motion/`, `invitation/` (lotus, kbach, template thumbnails).
- `lib/`: core infrastructure shared by every module: `store.ts`, `data/`, `auth/`, `supabase/`, `i18n.tsx`, `khmer.ts`, `mock-data.ts`, `cn.ts`.

Modules may import from `components/`, `lib/` and, when needed, from another module's files. `lib/` and `components/` never import from `modules/`. Import with the `@/` alias across folders and with `./` inside the same folder.

## Commands

- `npm run dev`: start the dev server
- `npm run build`: production build (run it to check types before calling work done)
- `npm run lint`: ESLint

There is no test runner yet.

## Stack

- Next.js 16 (App Router, TypeScript), React 19, Tailwind CSS 4. This Next.js version differs from older ones: check `node_modules/next/dist/docs/` before using an API you are unsure of (see AGENTS.md).
- Import alias `@/*` points to the project root.
- `cacheComponents` is on in `next.config.ts`: anything that reads runtime data (`useParams`, `useSearchParams`, `params`, cookies) must sit inside a `<Suspense>` boundary or the build fails with a "blocking prerender" error. Pipe-free `npm run build` exit codes are the real pass/fail signal.
- Backend: Supabase (Postgres with row-level security, Storage, Auth). Hosts sign in with a 6-digit email code or Google; there is no phone or password sign-in. Payments: KHQR via Bakong only for now (`modules/payments/server/bakong.ts`, QR built in `modules/payments/server/khqr.ts`); ABA PayWay is not supported yet. `PAYMENT_PROVIDER=sandbox` gives fake payments for local development and is always refused in production.
- Planned: shadcn/ui, PostHog, Vercel.

## Routes

- `/`: landing page
- `/i/[slug]`: public guest invitation, server-rendered with Open Graph tags
- `/app`: host dashboard (list of invitations)
- `/app/new`: pick a template
- `/app/[id]/edit`: step-form editor
- `/app/[id]/dashboard`: share link, stats, RSVP table

## Product rules

- Pricing: Basic $5 (20,000 ៛), Premium $15 (60,000 ៛), paid once per invitation at publish. Building, previewing and editing after publishing are free. Always show both USD and riel.
- Basic allows 3 photos; Premium allows 6 photos and a custom music upload.
- The gift section shows the host's own KHQR image. The app never handles gift money.
- Invitation statuses: draft and live. A paid payment webhook sets the invitation to live.

## Language and design

- Khmer first, English beside it. A KH/EN toggle switches the host UI; the guest invitation always shows both languages.
- Invitations use Khmer numerals and Khmer dates (e.g. ថ្ងៃអាទិត្យ ទី១៥ ខែធ្នូ ឆ្នាំ២០២៦), with the Western date smaller underneath.
- Colours: maroon `#7A1F2B` (primary), gold `#C9A24B` (accent), ivory `#FBF6EE` (soft tint for panels inside cards), charcoal `#2B2B2B` (text), jade `#5E8C7A` (success / attending). Define them as Tailwind theme tokens rather than hard-coding hex values.
- Page and navbar backgrounds are white on every page (`bg-white`), not ivory. This overrides the prototypes, which use ivory. Cards stand out through `shadow-card`, which includes a hairline edge.
- Fonts (Google Fonts via `next/font`): Moul (Khmer decorative titles only), Kantumruy Pro (Khmer UI and body), Playfair Display (English invitation titles), Inter (English UI).
- Khmer text needs line height of at least 1.6 so stacked vowels and subscripts don't clip.
- Mobile-first at 390 px. Tap targets at least 44 px, 12 px corner radius, shadows on cards only.
- Khmer ornaments (kbach borders, lotus, jasmine) go on invitation pages only, used lightly. Keep the host app plain.
