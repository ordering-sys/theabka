#!/usr/bin/env node
/**
 * Make Supabase email a 6-digit sign-in CODE instead of a magic link.
 *
 * Updates only these Auth settings on your project (nothing else is touched):
 *   - "Magic Link" and "Confirm signup" email subject + body (supabase/templates/otp-code.html)
 *   - email OTP length (6) and expiry (600 s)
 *
 * Usage (PowerShell or bash), from the project root:
 *   node --env-file=.env scripts/push-email-templates.mjs           # apply
 *   node --env-file=.env scripts/push-email-templates.mjs --dry-run # show what would change
 *
 * Needs in .env (or the environment):
 *   NEXT_PUBLIC_SUPABASE_URL  (the project ref is read from it)
 *   SUPABASE_ACCESS_TOKEN     a personal access token from
 *                             https://supabase.com/dashboard/account/tokens
 *                             The account must be Owner or Administrator of the project's
 *                             organization, and a scoped token needs write access to
 *                             Auth config (auth_config_write, project_admin_write).
 *                             Account-level secret: keep it out of git, revoke it after use.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

class Stop extends Error {}

/** Print an error and stop. Uses exitCode (not process.exit) so Node can close network handles cleanly on Windows. */
function fail(msg) {
  console.error(`Error: ${msg}`);
  throw new Stop(msg);
}

async function main() {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const dryRun = process.argv.includes("--dry-run");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();
  const ref = url?.match(/^https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1];

  if (!ref) fail("NEXT_PUBLIC_SUPABASE_URL is missing or isn't a https://<ref>.supabase.co URL.");
  if (!token && !dryRun) fail("SUPABASE_ACCESS_TOKEN is missing. Create one at https://supabase.com/dashboard/account/tokens");
  if (token && !token.startsWith("sbp_")) {
    console.warn("Warning: SUPABASE_ACCESS_TOKEN doesn't start with \"sbp_\". It should be a personal access token,");
    console.warn("         not the anon or service_role key from Project Settings > API.");
  }

  const html = readFileSync(join(root, "supabase/templates/otp-code.html"), "utf8")
    // Drop the leading HTML comment: it's for developers, not recipients.
    .replace(/^<!--[\s\S]*?-->\s*/, "");

  if (!html.includes("{{ .Token }}")) fail("Template must contain {{ .Token }}.");
  if (html.includes("ConfirmationURL")) fail("Template must not contain {{ .ConfirmationURL }} (that sends a link).");

  const subject = "លេខកូដ TheabKa · Your TheabKa code";
  const body = {
    mailer_subjects_magic_link: subject,
    mailer_templates_magic_link_content: html,
    mailer_subjects_confirmation: subject,
    mailer_templates_confirmation_content: html,
    mailer_otp_length: 6,
    mailer_otp_exp: 600,
  };

  console.log(`Project: ${ref}`);
  console.log("Settings to update:", Object.keys(body).join(", "));
  if (dryRun) {
    console.log("Dry run: nothing sent.");
    return;
  }

  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/config/auth`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text().catch(() => "");

  if (res.status === 401) {
    fail("Supabase rejected the token (401). Check SUPABASE_ACCESS_TOKEN is a current personal access token (starts with sbp_).");
  }
  if (res.status === 403) {
    fail(
      [
        `Supabase returned 403: the token isn't allowed to change Auth settings.`,
        `  ${text.slice(0, 200)}`,
        `  Fix one of these, then run again:`,
        `  1. Your role: in the dashboard, open Organization settings > Members. You must be Owner or Administrator`,
        `     of the organization that owns project ${ref} (Developer or Read-only can't change Auth config).`,
        `  2. Your token: if you created a scoped / fine-grained token, create a new one with full access, or with`,
        `     Auth config write and Project admin write permissions, at https://supabase.com/dashboard/account/tokens`,
        `  3. Or skip the script: paste the template in Authentication > Emails > Templates (see docs/supabase-setup.md).`,
      ].join("\n"),
    );
  }
  if (!res.ok) fail(`Supabase returned ${res.status}. ${text.slice(0, 300)}`);

  let saved = {};
  try {
    saved = JSON.parse(text);
  } catch {
    // Older API versions may return no body; the update still succeeded.
  }
  const check = (k) => (saved[k] === undefined ? "saved" : saved[k] === body[k] ? "ok" : `got ${JSON.stringify(saved[k])?.slice(0, 40)}`);
  console.log("Result:");
  for (const k of ["mailer_subjects_magic_link", "mailer_subjects_confirmation", "mailer_otp_length", "mailer_otp_exp"]) {
    console.log(`  ${k}: ${check(k)}`);
  }
  for (const k of ["mailer_templates_magic_link_content", "mailer_templates_confirmation_content"]) {
    const v = saved[k];
    console.log(`  ${k}: ${v === undefined ? "saved" : String(v).includes("{{ .Token }}") ? "ok (sends a code)" : "NO {{ .Token }} found"}`);
  }
  console.log("Done. Request a NEW code on /signin to test (emails sent before this still contain links).");
  console.log("Then remove SUPABASE_ACCESS_TOKEN from .env and revoke it in the dashboard.");
}

main().catch((e) => {
  if (!(e instanceof Stop)) console.error(e);
  process.exitCode = 1;
});
