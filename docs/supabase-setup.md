# Supabase and payment setup

Step-by-step setup for TheabKa's backend: Supabase (Postgres, Auth, Storage) and KHQR payments (ABA PayWay or Bakong). Run the steps in order. The schema lives in `supabase/migrations/`; never edit an applied migration, add a new one.

## Environment variables

Put these in `.env.local` (development) and in Vercel. `NEXT_PUBLIC_*` values are inlined into the browser bundle: never put secrets in them.

| Variable | Where | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | public | Base URL, no trailing slash (share links, payment callback URL) |
| `NEXT_PUBLIC_SUPABASE_URL` | public | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | anon / publishable key (RLS applies) |
| `SUPABASE_SERVICE_ROLE_KEY` | **secret**, server | service_role key, bypasses RLS; only `lib/supabase/admin.ts` reads it |
| `PAYMENT_PROVIDER` | server | `sandbox` (default) \| `aba_payway` \| `bakong` |
| `ALLOW_SANDBOX_PAYMENTS` | server | `true` allows sandbox when `VERCEL_ENV=production`; leave unset in production |
| `PAYMENT_WEBHOOK_SECRET` | **secret**, server | HMAC key for webhook bodies (`openssl rand -hex 32`) |
| `PAYMENT_WEBHOOK_SIGNATURE_HEADER` | server | signature header name, default `x-signature` |
| `PAYMENT_CONFIRM_WEBHOOKS` | server | `true` re-confirms each webhook with the provider's status API |
| `ABA_PAYWAY_MERCHANT_ID` | server | PayWay merchant ID |
| `ABA_PAYWAY_API_KEY` | **secret**, server | PayWay API key (hash key) |
| `ABA_PAYWAY_API_URL` | server | PayWay sandbox or production API base URL |
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
npx supabase db push              # applies the three migrations in order
```

The migrations create:

| File | Contents |
| --- | --- |
| `20261122090000_init.sql` | enums, `plans` (prices and limits), `profiles` (+ trigger on sign-up), `templates` (8 seeded), `music_tracks` (5 seeded), `invitations`, `photos`, `rsvps`, `views`, `payments`, guard triggers, `mark_payment_paid()` |
| `20261122090100_rls.sql` | RLS on every table, grants, helper predicates, `get_published_invitation(slug)` |
| `20261122090200_storage.sql` | `photos`, `music`, `gift-qr` buckets (private, 10 MB, mime allow-lists) and their policies |

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
5. Keep rate limits on (**Authentication > Rate Limits**). The app shows a clear message when a guest hits one.

## 4. Auth: Google

1. In Google Cloud Console > **APIs & Services > Credentials**, create an **OAuth client ID** (type: Web application).
   - Authorized JavaScript origins: `http://localhost:3000`, `https://YOUR-DOMAIN`
   - Authorized redirect URI: `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback`
2. Configure the OAuth consent screen (app name TheabKa, support email, scopes `email`, `profile`, `openid`).
3. In Supabase **Authentication > Sign In / Providers > Google**: enable it and paste the Client ID and Client Secret.
4. **Authentication > URL Configuration**:
   - Site URL: `https://YOUR-DOMAIN`
   - Redirect URLs: `http://localhost:3000/auth/callback`, `https://YOUR-DOMAIN/auth/callback`, and for Vercel previews `https://*-YOUR-TEAM.vercel.app/auth/callback`.

The app's callback is `app/auth/callback/route.ts`. It exchanges the code for a session cookie and redirects to `?next=` (same-site paths only).

## 5. Storage

The migration creates the buckets and policies. Nothing to click, but verify:

- Paths are `<user_id>/<invitation_id>/<random>.<ext>`.
- Owners can upload only into their own folder for an invitation they own. Music uploads also require a Premium invitation.
- Anyone can read files of a **live** invitation (through signed URLs). Draft files are visible only to the owner.
- If you change limits, do it in a new migration, not in the dashboard, so environments stay in sync.

## 6. Payments

Pricing comes from the `plans` table: Basic 500 cents / 20,000 riel (3 photos), Premium 1,500 cents / 60,000 riel (6 photos and custom music). The server computes the amount from the invitation's template tier; the client never sends an amount.

Flow:

1. The pay sheet calls `startKhqrPayment(invitationId, currency)` (POST `/api/payments/khqr`). This returns the QR payload and expiry (10 minutes).
2. The sheet polls `getPaymentStatus(paymentId)` (GET `/api/payments/status?id=`) every 2-3 s.
3. The payment is confirmed either by the provider's webhook (POST `/api/payments/webhook`) or by the status endpoint asking the provider's API. Both call `mark_payment_paid()`, which marks the payment paid and sets the invitation live in one transaction, idempotent on `provider_ref`.

### Sandbox (default)

`PAYMENT_PROVIDER=sandbox`: the status endpoint reports paid 3 seconds after the charge is created. It's refused when `VERCEL_ENV=production` unless `ALLOW_SANDBOX_PAYMENTS=true`.

To test the webhook locally:

```bash
BODY='{"provider_ref":"TK...","status":"paid","amount":500,"currency":"USD"}'
SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$PAYMENT_WEBHOOK_SECRET" -hex | sed 's/^.* //')
curl -X POST http://localhost:3000/api/payments/webhook \
  -H "content-type: application/json" -H "x-signature: $SIG" -d "$BODY"
```

Sending it twice returns `{"ok":true,"alreadyPaid":true}` the second time.

### ABA PayWay

1. Apply for a PayWay merchant account with ABA (business registration needed), and ask for KHQR / QR payments and sandbox access.
2. Set `PAYMENT_PROVIDER=aba_payway`, `ABA_PAYWAY_MERCHANT_ID`, `ABA_PAYWAY_API_KEY`, `ABA_PAYWAY_API_URL`.
3. Implement the `TODO(ABA)` parts in `lib/payments/aba-payway.ts` from the PayWay docs: the create-QR call, the callback fields and status codes, and the check-transaction call.
4. Register the callback (pushback) URL with ABA: `https://YOUR-DOMAIN/api/payments/webhook`. Ask ABA to whitelist your domain.
5. Confirm how PayWay authenticates callbacks. If they're not HMAC-signed with a shared secret, set `PAYMENT_CONFIRM_WEBHOOKS=true` and implement `checkStatus()` so every callback is re-confirmed with PayWay before the invitation goes live.

### Bakong KHQR

1. Register for the Bakong Open API (NBC) and get an API token. You need a Bakong account to receive money.
2. Set `PAYMENT_PROVIDER=bakong`, `BAKONG_ACCOUNT_ID`, `BAKONG_MERCHANT_NAME`, `BAKONG_MERCHANT_CITY`, `BAKONG_API_TOKEN`, `BAKONG_API_URL`.
3. Implement the `TODO(Bakong)` part of `createCharge()` in `lib/payments/bakong.ts` (generate the KHQR with NBC's `bakong-khqr` SDK and use its md5 as `provider_ref`).
4. Bakong has no merchant webhook: confirmation comes from the status endpoint polling `check_transaction_by_md5`. If you add a background worker, have it POST signed events to `/api/payments/webhook`.

## 7. Vercel

1. Import the repository in Vercel.
2. In **Project Settings > Environment Variables**, add every key from the table at the top of this doc:
   - Production: real provider (`PAYMENT_PROVIDER=aba_payway` or `bakong`), `ALLOW_SANDBOX_PAYMENTS` unset, `NEXT_PUBLIC_SITE_URL=https://YOUR-DOMAIN`.
   - Preview / Development: `PAYMENT_PROVIDER=sandbox` is fine.
   - `SUPABASE_SERVICE_ROLE_KEY`, `PAYMENT_WEBHOOK_SECRET` and provider keys are secrets. Never prefix them with `NEXT_PUBLIC_`.
3. Add the production domain to Supabase **URL Configuration** and to the Google OAuth client (step 4).
4. Redeploy after changing env vars (NEXT_PUBLIC_* values are fixed at build time).

## 8. Launch checklist

- [ ] Migrations applied; RLS enabled on all tables.
- [ ] Sign-in code emails arrive (inbox, not spam) at Gmail, Yahoo and Outlook addresses through your own SMTP.
- [ ] Google sign-in works on the production domain.
- [ ] A test payment in the provider's sandbox flips an invitation to live; a replayed webhook is a no-op.
- [ ] `PAYMENT_PROVIDER` is not `sandbox` in production.
- [ ] If you add a `.env.example`, un-ignore it (the default `.gitignore` pattern `.env*` hides it; add `!.env.example`).
