import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { assertServer } from "@/lib/supabase/env";

assertServer("lib/auth/google-oauth");

/**
 * Google sign-in on our own domain (instead of Supabase's hosted callback), so
 * Google's account picker says "to continue to <your domain>".
 *
 * Flow: /auth/google → Google → /auth/google/callback → exchange the code for an
 * ID token → supabase.auth.signInWithIdToken() sets the normal Supabase session.
 * See docs/supabase-setup.md, "Auth: Google".
 */

export const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

/** Short-lived cookie holding state, nonce and the return path between the two routes. */
export const FLOW_COOKIE = "theabka_google_oauth";
export const FLOW_COOKIE_PATH = "/auth/google";
export const FLOW_MAX_AGE = 600; // seconds

export type GoogleOAuthConfig = { clientId: string; clientSecret: string };

/** Null when the env vars are missing (the client then falls back to Supabase's hosted flow). */
export function getGoogleOAuthConfig(): GoogleOAuthConfig | null {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

/**
 * Must be identical in the authorize request and the token exchange, and listed
 * under "Authorized redirect URIs" in Google Cloud for every origin you use.
 */
export function googleRedirectUri(origin: string) {
  return `${origin}/auth/google/callback`;
}

/** Same-site path only, to avoid open redirects. */
export function safeNextPath(next: string | null | undefined, fallback = "/app") {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : fallback;
}

export function randomToken() {
  return randomBytes(32).toString("base64url");
}

/** Google gets the SHA-256 (hex) of the nonce; Supabase gets the raw nonce and hashes it to compare. */
export function hashNonce(nonce: string) {
  return createHash("sha256").update(nonce).digest("hex");
}

export type FlowState = { state: string; nonce: string; next: string };

export function encodeFlow(flow: FlowState) {
  return Buffer.from(JSON.stringify(flow)).toString("base64url");
}

export function decodeFlow(value: string | undefined): FlowState | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Partial<FlowState>;
    if (typeof parsed.state !== "string" || typeof parsed.nonce !== "string" || typeof parsed.next !== "string") return null;
    return { state: parsed.state, nonce: parsed.nonce, next: safeNextPath(parsed.next) };
  } catch {
    return null;
  }
}

export function sameToken(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
