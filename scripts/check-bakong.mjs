#!/usr/bin/env node
/**
 * Checks the Bakong KHQR setup with the same .env files Next.js loads.
 * Never prints secret values.
 *
 *   npm run bakong:check                 settings + token + network check
 *   npm run bakong:check -- --qr 0.01    also writes bakong-test-qr.png (a real KHQR
 *                                        for $0.01 to your account) and waits for payment
 *   npm run bakong:check -- --md5 <md5>  look up one QR's payment
 *
 * The QR is built by the app's own modules/payments/server/khqr.ts, so a successful scan
 * and payment here means the pay sheet's codes work too.
 */
import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(path.join(root, "package.json"));
const { loadEnvConfig } = require("@next/env");
loadEnvConfig(root, process.argv.includes("--dev"));
const env = process.env;

const args = process.argv.slice(2);
const argValue = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

let failures = 0;
const ok = (msg) => console.log(`  ✓ ${msg}`);
const bad = (msg, fix) => {
  failures++;
  console.log(`  ✗ ${msg}${fix ? `\n      → ${fix}` : ""}`);
};
const info = (msg) => console.log(`    ${msg}`);

// ── 1. Settings ─────────────────────────────────────────────────────────
console.log("\n1. Settings");
const provider = env.PAYMENT_PROVIDER?.trim() || "bakong";
if (provider === "bakong") ok(`PAYMENT_PROVIDER = bakong${env.PAYMENT_PROVIDER ? "" : " (default)"}`);
else bad(`PAYMENT_PROVIDER = "${provider}"`, "remove it or set PAYMENT_PROVIDER=bakong, or the pay sheet won't use Bakong");

const accountId = env.BAKONG_ACCOUNT_ID?.trim();
const token = env.BAKONG_API_TOKEN?.trim();
const apiUrl = env.BAKONG_API_URL?.trim().replace(/\/$/, "");
if (accountId && /^[^@\s]+@[^@\s]+$/.test(accountId)) ok(`BAKONG_ACCOUNT_ID = ${accountId.replace(/^(.{2})[^@]*/, "$1***")}`);
else bad("BAKONG_ACCOUNT_ID is missing or not like name@bank", "copy it from your Bakong app profile, e.g. yourname@aclb");
if (token) ok(`BAKONG_API_TOKEN is set (${token.length} characters, hidden)`);
else bad("BAKONG_API_TOKEN is missing", "get it from the Bakong Open API portal (api-bakong.nbc.gov.kh)");
if (apiUrl && /^https:\/\//.test(apiUrl)) ok(`BAKONG_API_URL = ${apiUrl}`);
else bad("BAKONG_API_URL is missing or not https", "use https://api-bakong.nbc.gov.kh");

const merchantName = env.BAKONG_MERCHANT_NAME?.trim() || "TheabKa";
const merchantCity = env.BAKONG_MERCHANT_CITY?.trim() || "Phnom Penh";
info(`Merchant name on the QR: "${merchantName}", city: "${merchantCity}"`);
if (/[^\x20-\x7E]/.test(merchantName) || merchantName.length > 25) {
  bad("BAKONG_MERCHANT_NAME must be Latin letters, max 25 characters", "e.g. BAKONG_MERCHANT_NAME=TheabKa");
}
if (env.BAKONG_MERCHANT_ID?.trim()) info("Merchant account (BAKONG_MERCHANT_ID is set)");
else info("Individual account (no BAKONG_MERCHANT_ID)");

if (!accountId || !token || !apiUrl) finish();

// ── 2. Token and network ────────────────────────────────────────────────
console.log("\n2. Bakong API (token and network)");
async function checkMd5(md5) {
  const res = await fetch(`${apiUrl}/v1/check_transaction_by_md5`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({ md5 }),
    signal: AbortSignal.timeout(15000),
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

try {
  const probe = await checkMd5("0".repeat(32));
  if (probe.status === 200 && probe.body.responseCode === 1) {
    ok("Token accepted (a made-up QR correctly reports 'not found')");
  } else if (probe.status === 200 && probe.body.responseCode === 0) {
    ok("Token accepted");
  } else if (probe.status === 401) {
    bad("Bakong rejected the token (HTTP 401)", "the token is wrong or expired: renew it in the Bakong Open API portal");
  } else if (probe.status === 403) {
    bad("Bakong refused this machine (HTTP 403)", "the API only answers requests from Cambodia; your server must run there or go through a relay there");
  } else {
    bad(`Unexpected answer: HTTP ${probe.status} ${JSON.stringify(probe.body).slice(0, 200)}`);
  }
} catch (e) {
  bad(`Could not reach ${apiUrl}: ${e.message}`, "check the URL and this machine's internet connection");
}

// ── 3. Optional: real test QR ───────────────────────────────────────────
const md5Arg = argValue("--md5");
if (md5Arg) {
  console.log("\n3. Payment lookup");
  const r = await checkMd5(md5Arg);
  info(r.body.responseCode === 0 ? `Paid: ${JSON.stringify(r.body.data)}` : `Not paid yet (${r.body.responseMessage ?? `HTTP ${r.status}`})`);
}

const qrUsd = argValue("--qr");
if (qrUsd && failures === 0) {
  console.log("\n3. Test KHQR");
  const cents = Math.round(Number(qrUsd) * 100);
  if (!Number.isFinite(cents) || cents < 1 || cents > 1000) {
    bad("--qr needs a USD amount between 0.01 and 10", "e.g. --qr 0.01");
    finish();
  }
  const { buildKhqr, khqrMd5 } = await loadKhqr();
  const expiresAt = new Date(Date.now() + 10 * 60_000);
  const qr = buildKhqr({
    accountId,
    merchantId: env.BAKONG_MERCHANT_ID?.trim() || undefined,
    acquiringBank: env.BAKONG_ACQUIRING_BANK?.trim() || undefined,
    merchantName,
    merchantCity,
    amount: cents,
    currency: "USD",
    billNumber: `TKTEST${Date.now().toString(36).toUpperCase()}`.slice(0, 20),
    expiresAt,
  });
  const md5 = khqrMd5(qr);
  const out = path.join(root, "bakong-test-qr.png");
  await require("qrcode").toFile(out, qr, { width: 600, margin: 2, errorCorrectionLevel: "M" });
  ok(`Wrote ${path.relative(process.cwd(), out)} ($${(cents / 100).toFixed(2)}, expires in 10 minutes)`);
  info(`md5: ${md5}`);
  info("Open the image and scan it with ABA, ACLEDA, Wing or Bakong.");
  info("The app should show your merchant name and the amount. Pay to test confirmation, or cancel.");
  info("Waiting for payment (Ctrl+C to stop)...");
  while (Date.now() < expiresAt.getTime()) {
    await new Promise((r) => setTimeout(r, 3000));
    const r = await checkMd5(md5).catch(() => null);
    if (r?.body?.responseCode === 0) {
      ok(`Payment confirmed by Bakong: ${r.body.data?.amount} ${r.body.data?.currency}`);
      info("The pay sheet confirms real payments the same way.");
      fs.rmSync(out, { force: true });
      finish();
    }
  }
  bad("No payment within 10 minutes (the code has expired)");
  fs.rmSync(out, { force: true });
}

finish();

function finish() {
  console.log(failures ? `\n${failures} problem(s) found.\n` : "\nAll checks passed.\n");
  process.exit(failures ? 1 : 0);
}

/** Load the app's TypeScript KHQR builder (no build step needed). */
async function loadKhqr() {
  const ts = require("typescript");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "theabka-khqr-"));
  for (const f of ["khqr", "parse"]) {
    const src = fs.readFileSync(path.join(root, "modules/payments/server", `${f}.ts`), "utf8").replace(/from "\.\/(\w+)"/g, 'from "./$1.mjs"');
    const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
    fs.writeFileSync(path.join(dir, `${f}.mjs`), js);
  }
  fs.writeFileSync(path.join(dir, "types.mjs"), "export {};");
  return import(pathToFileURL(path.join(dir, "khqr.mjs")).href);
}
