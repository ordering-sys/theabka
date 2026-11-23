# Environment variables

TheabKa reads its settings from a `.env` file in the project root. Next.js loads it automatically when you run `npm run dev` or `npm run build`.

The file is git-ignored (`.gitignore` has `.env*`), so your keys stay on your computer. Never commit it, and never paste its contents into a chat, issue or screenshot.

## Quick start

1. Create a file named `.env` in the project root (next to `package.json`).
2. Paste the template below into it.
3. Restart `npm run dev`. Next.js only reads `.env` at startup.

With every Supabase value left blank, the app keeps running on the browser-storage prototype, and payments run in sandbox mode. Fill in the values as you set up each service.

```bash
# ── Site ──────────────────────────────────────────────────────────────
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# ── Supabase ──────────────────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# ── Google sign-in on your own domain (optional) ──────────────────────
NEXT_PUBLIC_GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# ── KHQR payments ─────────────────────────────────────────────────────
# bakong (default). Use sandbox only on your own machine; production always refuses it.
PAYMENT_PROVIDER=bakong
PAYMENT_WEBHOOK_SECRET=
PAYMENT_WEBHOOK_SIGNATURE_HEADER=x-signature
PAYMENT_CONFIRM_WEBHOOKS=false

# Bakong KHQR
BAKONG_ACCOUNT_ID=
BAKONG_API_TOKEN=
BAKONG_API_URL=https://api-bakong.nbc.gov.kh
BAKONG_MERCHANT_NAME=TheabKa
BAKONG_MERCHANT_CITY=Phnom Penh
BAKONG_MERCHANT_ID=
BAKONG_ACQUIRING_BANK=
```

## What each variable does

### Site

| Variable | Needed | What it is |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Always | The public address of the site, without a trailing slash. Share links, QR codes, calendar files and link previews (Open Graph) use it. Locally: `http://localhost:3000`. In production: your real domain, such as `https://theabka.com`. If it's wrong, links shared on Telegram point to the wrong place. |

### Supabase

Find these in the Supabase dashboard under **Project Settings → API**.

| Variable | Needed | Secret? | What it is |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | For the real backend | No | Your project URL, such as `https://abcd1234.supabase.co`. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | For the real backend | No | The public "anon" key. It's safe in the browser because row-level security limits what it can do. |
| `SUPABASE_SERVICE_ROLE_KEY` | For payments | **Yes** | The "service_role" key. It bypasses row-level security; the payment webhook uses it to mark an invitation live. Server only. Never put it in a `NEXT_PUBLIC_` variable or client code. |

The app switches from the browser-storage prototype to Supabase only when **both** `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set.

| Variable | Needed | Secret? | What it is |
|---|---|---|---|
| `SUPABASE_ACCESS_TOKEN` | Only to run `scripts/push-email-templates.mjs` | **Yes** | A personal access token for your Supabase account (not just this project), from **Account → Access Tokens**. The app never reads it. Add it for the one-off script, then remove it from `.env` and revoke it in the dashboard. Never put it in Vercel. |

### Google sign-in

From Google Cloud Console → **APIs & Services → Credentials →** your OAuth client (see `docs/supabase-setup.md`, "Auth: Google").

| Variable | Needed | Secret? | What it is |
|---|---|---|---|
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Optional | No | The OAuth Client ID (ends in `.apps.googleusercontent.com`). When set together with the secret, Google sign-in runs on your own domain (`/auth/google`), so Google's screen shows your domain instead of `<ref>.supabase.co`. Leave both blank to use Supabase's hosted Google flow. |
| `GOOGLE_CLIENT_SECRET` | With the Client ID | **Yes** | The OAuth client secret. Server only: the callback route uses it to exchange Google's code for an ID token. Never put it in a `NEXT_PUBLIC_` variable. |

### KHQR payments

| Variable | Needed | Secret? | What it is |
|---|---|---|---|
| `PAYMENT_PROVIDER` | Optional | No | `bakong` (the default and the only real provider for now). Set `sandbox` on your own machine to test without money: the payment completes by itself after 3 seconds. Production always refuses the sandbox. ABA PayWay is not supported yet. |
| `PAYMENT_WEBHOOK_SECRET` | With a real provider | **Yes** | Shared secret used to check that payment webhooks really come from your provider (HMAC signature). Use the value your provider gives you, or generate a long random string if you set the secret yourself. |
| `PAYMENT_WEBHOOK_SIGNATURE_HEADER` | Optional | No | The HTTP header that carries the webhook signature. Defaults to `x-signature`; change it if your provider uses a different header. |
| `PAYMENT_CONFIRM_WEBHOOKS` | Optional | No | `true` makes the server double-check every payment webhook with the provider's status API before publishing. Turn it on if your provider doesn't sign its webhooks with a shared secret (see `docs/supabase-setup.md`). |

**Bakong KHQR** (from the National Bank of Cambodia's Bakong developer portal):

| Variable | Secret? | What it is |
|---|---|---|
| `BAKONG_ACCOUNT_ID` | No | Your Bakong account ID, such as `theabka@aclb`. |
| `BAKONG_API_TOKEN` | **Yes** | Your API token. It expires, so renew it in the Bakong developer portal before it does, or payments stay "waiting". |
| `BAKONG_API_URL` | No | The Bakong API base URL: `https://api-bakong.nbc.gov.kh`. |
| `BAKONG_MERCHANT_NAME` | No | Name shown on the customer's KHQR scan and on the pay sheet, such as `TheabKa`. Latin letters only, up to 25 characters. |
| `BAKONG_MERCHANT_CITY` | No | City shown on the KHQR, such as `Phnom Penh`. Up to 15 characters. |
| `BAKONG_MERCHANT_ID` | No | Only for a Bakong **merchant** account: your merchant ID. Leave it empty for an individual account. |
| `BAKONG_ACQUIRING_BANK` | No | Only for a merchant account: the bank that holds it, such as `ACLEDA Bank`. |

The KHQR code is built by the app; payment is confirmed by asking the Bakong API about that code every few seconds while the pay sheet is open. The Bakong API may refuse requests from servers outside Cambodia; if payments never confirm and the server log shows `check refused: HTTP 403`, run the status check from a host in Cambodia or through a relay there.

You only need the variables for the provider you choose.

### Set automatically (don't add these)

| Variable | Set by |
|---|---|
| `NODE_ENV` | Next.js (`development` or `production`). |
| `VERCEL_ENV` | Vercel (`development`, `preview` or `production`). |

## Rules for keeping keys safe

- Anything starting with `NEXT_PUBLIC_` is sent to every visitor's browser. Only public values go there.
- **Secret values:** `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_CLIENT_SECRET`, `PAYMENT_WEBHOOK_SECRET` and `BAKONG_API_TOKEN`. Keep them server-side only.
- If a secret leaks (committed, pasted, screenshotted), rotate it in the Supabase or provider dashboard right away.
- **Each environment gets its own keys.** Use test keys locally and production keys only in Vercel's production environment.

## On Vercel

`.env` is not uploaded. In the Vercel dashboard, go to **Project → Settings → Environment Variables** and add each variable:

- Set `NEXT_PUBLIC_SITE_URL` to your production domain.
- Use production keys for **Production**, and test keys for **Preview**.
- Redeploy after changing a variable.
