# Supabase and payment setup

Step-by-step setup for TheabKa's backend: Supabase (Postgres, Auth, Storage) and KHQR payments through Bakong. Run the steps in order. The schema lives in `supabase/migrations/`; never edit an applied migration, add a new one.

## Environment variables

Put these in `.env.local` (development) and in Vercel. `NEXT_PUBLIC_*` values are inlined into the browser bundle: never put secrets in them.

| Variable | Where | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | public | Base URL, no trailing slash (share links, payment callback URL) |
| `NEXT_PUBLIC_SUPABASE_URL` | public | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | anon / publishable key (RLS applies) |
| `SUPABASE_SERVICE_ROLE_KEY` | **secret**, server | service_role key, bypasses RLS; only `lib/supabase/admin.ts` reads it |
| `PAYMENT_PROVIDER` | server | `bakong` (default) \| `sandbox` (local development only; refused in production) |
| `PAYMENT_WEBHOOK_SECRET` | **secret**, server | HMAC key for webhook bodies (`openssl rand -hex 32`) |
| `PAYMENT_WEBHOOK_SIGNATURE_HEADER` | server | signature header name, default `x-signature` |
| `PAYMENT_CONFIRM_WEBHOOKS` | server | `true` re-confirms each webhook with the provider's status API |
| `BAKONG_ACCOUNT_ID` | server | receiving Bakong account, e.g. `name@bank` |
| `BAKONG_MERCHANT_NAME` | server | name shown in the KHQR (default TheabKa) |
| `BAKONG_MERCHANT_CITY` | server | city in the KHQR (default Phnom Penh) |
| `BAKONG_API_TOKEN` | **secret**, server | Bakong Open API token |
| `BAKONG_API_URL` | server | Bakong Open API base URL |

## 1. Create the Supabase project

1. Go to <https://supabase.com/dashboard>, click **New project**.
2. Region: **Southeast Asia (Singapore)**, the closest to Cambodia.
3. Save the database password in a password manager.
4. In **Project Settings > API**, copy:
   - Project URL to `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` / publishable key to `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` / secret key to `SUPABASE_SERVICE_ROLE_KEY` (server only, never in client code)
5. Create `.env.local` with the variables listed above and fill those in.

## 2. Run the migrations with the Supabase CLI

```bash
npx supabase login
npx supabase init                 # creates supabase/config.toml; keeps supabase/migrations
npx supabase link --project-ref YOUR-PROJECT-REF
npx supabase db push              # applies the four migrations in order
```

The migrations create:

| File | Contents |
| --- | --- |
| `20261122090000_init.sql` | enums, `plans` (prices and limits), `profiles` (+ trigger on sign-up), `templates` (8 seeded), `music_tracks` (5 seeded), `invitations`, `photos`, `rsvps`, `views`, `payments`, guard triggers, `mark_payment_paid()` |
| `20261122090100_rls.sql` | RLS on every table, grants, helper predicates, `get_published_invitation(slug)` |
| `20261122090200_storage.sql` | `photos`, `music`, `gift-qr` buckets (private, 10 MB, mime allow-lists) and their policies |
| `20261123090000_explicit_grants.sql` | Explicit table and function grants for `anon`, `authenticated` and `service_role`. Newer Supabase projects don't grant these by default; without them, creating an invitation fails with "permission denied for table invitations". Idempotent, and it doesn't widen anything the earlier migrations restricted. |

Optional: regenerate the TypeScript types once linked:

```bash
npx supabase gen types typescript --linked > lib/supabase/database.types.ts
```

Check in the dashboard afterwards:

- **Table Editor**: every table shows "RLS enabled".
- **Storage**: buckets `photos`, `music`, `gift-qr` exist, are **not public**, with a 10 MB limit.
- **Database > Functions**: `mark_payment_paid` exists. It must not be executable by `anon` or `authenticated` (the migration revokes it).

## 3. Auth: 6-digit email code

Hosts sign in (and register, on first use) with their email: the app sends a 6-digit code, they type it in. There's no password. Phone sign-in is not used.

1. **Authentication > Sign In / Providers > Email**: make sure it's enabled (it is by default).
   - **Confirm email**: can stay on. A verified code counts as confirmation.
2. **Send a code, not a link.** Supabase decides from the template: if it contains `{{ .ConfirmationURL }}` it sends a link (the default); if it contains `{{ .Token }}` it sends a code. Two templates are involved: **Magic Link** (returning users) and **Confirm signup** (first sign-in). Both must use the code. The template is in the repo: [supabase/templates/otp-code.html](../supabase/templates/otp-code.html). Apply it one of two ways:
   - **Script (recommended).** Updates only the two templates, the code length (6) and expiry (600 s); nothing else in your Auth settings changes.
     1. Create a personal access token at <https://supabase.com/dashboard/account/tokens>.
     2. Add it to `.env` as `SUPABASE_ACCESS_TOKEN=...` (it's an account-level secret; remove it when done).
     3. Run `node --env-file=.env scripts/push-email-templates.mjs --dry-run` to check, then without `--dry-run` to apply.
   - **Dashboard.** Go to **Authentication > Emails > Templates**. In **Magic Link** and in **Confirm signup**, set the subject to `លេខកូដ TheabKa · Your TheabKa code` and paste the HTML from `otp-code.html` (without the comment at the top) as the body. Make sure `{{ .ConfirmationURL }}` no longer appears anywhere.

   Don't use `supabase config push` for this: it pushes the whole Auth config and would overwrite dashboard settings such as Google sign-in and SMTP.
3. **Code length 6.** The script sets it. If you used the dashboard, set **Email OTP Length** to `6` under **Authentication > Providers > Email** (the app accepts 6 to 8 digits as a safety net, but the screen says 6). Keep **Email OTP Expiration** at 600 to 3600 s.
4. **Use your own SMTP before launch.** Supabase's built-in email sender is for testing only: it sends very few emails per hour and only to team members' addresses on some plans. Connect Resend (below) or another provider (Postmark, Amazon SES, Brevo).
5. Keep rate limits on (**Authentication > Rate Limits**). The app shows a clear message when someone hits one.

### Sending sign-in emails with Resend

The app has no email code of its own: Supabase Auth sends the codes, so Resend is configured in the two dashboards only. No env vars are needed in this project.

1. **Verify a domain in Resend.** Use a subdomain you own, such as `mail.your-domain.com`.
   - In Resend, go to **Domains → Add domain**, enter it, and pick the region closest to your users (Tokyo or Singapore if offered).
   - Add the DNS records Resend shows at your DNS host (Cloudflare, Namecheap, etc.): the **MX** and **TXT (SPF)** records for sending, and the **TXT (DKIM)** record `resend._domainkey`.
   - Add a DMARC record too, if you don't have one: TXT `_dmarc.your-domain.com` = `v=DMARC1; p=none;`. Gmail and Yahoo expect it.
   - Wait until Resend shows the domain as **Verified** (minutes to a few hours).
2. **Create an API key** in Resend under **API Keys**, with **Sending access** only, limited to that domain. Copy it; it's shown once.
3. **Connect it in Supabase**, either way:
   - **Automatic:** in Resend, open **Integrations → Supabase**, sign in, pick the project and domain. It fills in Supabase's SMTP settings for you.
   - **Manual:** in Supabase, open the SMTP settings (**Authentication → Emails → SMTP Settings**, or **Project Settings → Authentication** in older dashboards), turn on **Enable custom SMTP**, and enter:

     | Field | Value |
     | --- | --- |
     | Sender email | `no-reply@mail.your-domain.com` (must be on the verified domain) |
     | Sender name | `TheabKa ធៀបការ` |
     | Host | `smtp.resend.com` |
     | Port | `465` (or `587` if 465 is blocked) |
     | Username | `resend` |
     | Password | your Resend API key |

4. **Raise Supabase's email rate limit.** With custom SMTP on, go to **Authentication → Rate Limits** and set **emails per hour** to what your Resend plan allows (Supabase's default is low). Keep the per-user limits.
5. **Test.** Sign in at `/signin` with a Gmail, a Yahoo and an Outlook address. Check that the code arrives in the inbox (not spam) and the sender shows as TheabKa. Delivery logs are in Resend under **Emails**; failures on the Supabase side show in **Authentication → Logs**.

Treat the Resend API key as a secret: it lives only in Supabase's SMTP settings, never in this repo or `.env`.

## 4. Auth: Google

Google sign-in runs on the app's own domain, so Google's account picker says "to continue to YOUR-DOMAIN" (or "TheabKa" once the consent screen is verified) instead of `YOUR-PROJECT-REF.supabase.co`:

`/auth/google` → Google → `/auth/google/callback` → the server swaps Google's code for an ID token → `supabase.auth.signInWithIdToken()` sets the normal Supabase session → redirect to `?next=` (same-site paths only, default `/app`).

1. In Google Cloud Console > **APIs & Services > Credentials**, create an **OAuth client ID** (type: Web application).
   - Authorized JavaScript origins: `http://localhost:3000`, `https://YOUR-DOMAIN`
   - Authorized redirect URIs: `http://localhost:3000/auth/google/callback`, `https://YOUR-DOMAIN/auth/google/callback`
   - Google doesn't accept wildcards, so Vercel preview URLs can't use Google sign-in (use the email code there), unless you add each preview URL by hand.
2. Configure the OAuth consent screen (app name TheabKa, support email, scopes `email`, `profile`, `openid`). For verification, the authorized domain is YOUR-DOMAIN only; `supabase.co` is no longer needed.
3. In Supabase **Authentication > Sign In / Providers > Google**: enable it and put the Client ID in **Client IDs**. Supabase checks that the ID token was issued for one of these IDs. Leave **Skip nonce checks** off.
4. Set `NEXT_PUBLIC_GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env` and in Vercel (see `docs/environment.md`).

Code: `lib/auth/google-oauth.ts`, `app/auth/google/route.ts`, `app/auth/google/callback/route.ts`. The flow uses a short-lived httpOnly cookie for the CSRF `state` and the nonce.

**Fallback:** with the two env vars blank, `signInWithGoogle()` uses Supabase's hosted flow instead. That needs the Client Secret in Supabase, the redirect URI `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback` in Google Cloud, and `http://localhost:3000/auth/callback` / `https://YOUR-DOMAIN/auth/callback` in Supabase **Authentication > URL Configuration**. Its callback is `app/auth/callback/route.ts`.

## 5. Storage

The migration creates the buckets and policies. Nothing to click, but verify:

- Paths are `<user_id>/<invitation_id>/<random>.<ext>`.
- Owners can upload only into their own folder for an invitation they own. Music uploads also require a Premium invitation.
- Anyone can read files of a **live** invitation (through signed URLs). Draft files are visible only to the owner.
- If you change limits, do it in a new migration, not in the dashboard, so environments stay in sync.

### Deleting drafts

Hosts can delete an invitation from `/app` while it's still a draft (`deleteDraft()` in `lib/data/index.ts`, called through `lib/store.ts`):

- The RLS policy `hosts delete own drafts` allows deleting only the caller's own rows with `status = 'draft'`. A live (paid) invitation can't be deleted from the client; the code also filters on `status = 'draft'` as a second guard.
- Photos, RSVPs and views go with the row (`on delete cascade`). Payments keep their record, with `invitation_id` set to null.
- After the row is deleted, the app removes the draft's files under `<user_id>/<invitation_id>/` from all three buckets. This is best effort: if it fails, the files stay private (draft files are readable only by the owner) and can be cleaned up later.

## 6. Payments

Pricing comes from the `plans` table: Basic 500 cents / 20,000 riel (3 photos), Premium 1,500 cents / 60,000 riel (6 photos and custom music). The server computes the amount from the invitation's template tier; the client never sends an amount.

### What must be filled in before paying

An invitation can only be paid for (and so published) once every required field is filled in. The rules live in one place, `modules/payments/lib/invitation-checks.ts` (`missingDetails()`), and are used by the editor (Publish lock and step warnings), the pay screen and the payment API, so the three always agree:

| Step | Required |
| --- | --- |
| Couple | Groom's and bride's names, in Khmer and English. Parents' names are optional. |
| Date and time | Event date and start time |
| Venue | Venue name and address, each in Khmer and English |
| Program | At least one event, each with a time and a title in Khmer and English |
| Photos | At least one photo |
| Music | A song selected |
| Gift | The host's KHQR image, and the gift note in Khmer and English |

If anything is missing, POST `/api/payments/khqr` refuses with HTTP 422 `{"error":"incomplete","missing":[...]}` and creates no charge. To change the rules, edit `missingDetails()` and its labels in `modules/payments/lib/missing-labels.ts`.

### Flow

1. The pay sheet calls `startKhqrPayment(invitationId, currency)` (POST `/api/payments/khqr`). The server checks the requirements above and the plan limits, then returns the QR payload and expiry (10 minutes).
2. The sheet polls `getPaymentStatus(paymentId)` (GET `/api/payments/status?id=`) every 2-3 s.
3. The payment is confirmed either by the provider's webhook (POST `/api/payments/webhook`) or by the status endpoint asking the provider's API. Both call `mark_payment_paid()`, which marks the payment paid and sets the invitation live in one transaction, idempotent on `provider_ref`.

### Sandbox (local development)

`PAYMENT_PROVIDER=sandbox`: the status endpoint reports paid 3 seconds after the charge is created, and the QR is deliberately not payable. It's always refused in production.

To test the webhook locally:

```bash
BODY='{"provider_ref":"TK...","status":"paid","amount":500,"currency":"USD"}'
SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$PAYMENT_WEBHOOK_SECRET" -hex | sed 's/^.* //')
curl -X POST http://localhost:3000/api/payments/webhook \
  -H "content-type: application/json" -H "x-signature: $SIG" -d "$BODY"
```

Sending it twice returns `{"ok":true,"alreadyPaid":true}` the second time.

### Bakong KHQR (the only payment provider for now)

1. Register for the Bakong Open API (NBC) and get an API token. You need a Bakong account to receive money.
2. Set `BAKONG_ACCOUNT_ID`, `BAKONG_API_TOKEN`, `BAKONG_API_URL` (`https://api-bakong.nbc.gov.kh`), and optionally `BAKONG_MERCHANT_NAME`, `BAKONG_MERCHANT_CITY` (and `BAKONG_MERCHANT_ID`, `BAKONG_ACQUIRING_BANK` for a merchant account). `PAYMENT_PROVIDER` defaults to `bakong`.
3. The app builds the KHQR itself (`modules/payments/server/khqr.ts`) and uses its md5 as `provider_ref`.
4. Bakong has no merchant webhook: confirmation comes from the status endpoint polling `check_transaction_by_md5`. If you add a background worker, have it POST signed events to `/api/payments/webhook`.

## 7. Vercel

1. Import the repository in Vercel.
2. In **Project Settings > Environment Variables**, add every key from the table at the top of this doc:
   - Production: the Bakong variables, `PAYMENT_PROVIDER` unset or `bakong`, `NEXT_PUBLIC_SITE_URL=https://YOUR-DOMAIN`.
   - Preview: the Bakong variables, or `PAYMENT_PROVIDER=sandbox` for fake payments (only the Production environment refuses the sandbox).
   - `SUPABASE_SERVICE_ROLE_KEY`, `PAYMENT_WEBHOOK_SECRET` and provider keys are secrets. Never prefix them with `NEXT_PUBLIC_`.
3. Add the production domain to Supabase **URL Configuration** and to the Google OAuth client (step 4).
4. Redeploy after changing env vars (NEXT_PUBLIC_* values are fixed at build time).

## 8. Launch checklist

- [ ] All four migrations applied; RLS enabled on all tables.
- [ ] A test host can create an invitation, see it on `/app`, and delete it while it's a draft.
- [ ] The pay screen refuses an incomplete invitation and lists what's missing.
- [ ] Sign-in code emails arrive (inbox, not spam) at Gmail, Yahoo and Outlook addresses through your own SMTP.
- [ ] Google sign-in works on the production domain.
- [ ] A small real Bakong payment flips an invitation to live, and the status check isn't refused (HTTP 401/403 in the server log means an expired token or a server outside Cambodia).
- [ ] `PAYMENT_PROVIDER` is unset or `bakong` in production.
- [ ] If you add a `.env.example`, un-ignore it (the default `.gitignore` pattern `.env*` hides it; add `!.env.example`).
