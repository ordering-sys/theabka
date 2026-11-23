/**
 * Browser auth helpers (Supabase Auth): 6-digit email code and Google.
 * Replace signInMock() calls in app/signin with these.
 */
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Session } from "@/lib/data/types";
export type AuthResult = { ok: true } | { ok: false; error: "invalid_email" | "invalid_code" | "rate_limited" | "failed" };

function mapAuthError(message: string, status?: number): AuthResult {
  const m = message.toLowerCase();
  if (status === 429 || m.includes("rate") || m.includes("security purposes")) return { ok: false, error: "rate_limited" };
  if (m.includes("expired") || m.includes("invalid") || m.includes("token")) return { ok: false, error: "invalid_code" };
  return { ok: false, error: "failed" };
}

/** Rough shape check; Supabase does the real validation. */
export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

/**
 * Email a 6-digit sign-in code. Creates the account on first use, so this is
 * both "register" and "sign in". The Supabase email template must include
 * {{ .Token }} for the code (see docs/supabase-setup.md).
 */
export async function sendEmailOtp(email: string): Promise<AuthResult> {
  const address = email.trim().toLowerCase();
  if (!isValidEmail(address)) return { ok: false, error: "invalid_email" };
  const { error } = await getSupabaseBrowserClient().auth.signInWithOtp({
    email: address,
    options: { shouldCreateUser: true },
  });
  return error ? mapAuthError(error.message, error.status) : { ok: true };
}

/** Check the emailed code. On success the session cookie is set. */
export async function verifyEmailOtp(email: string, code: string): Promise<AuthResult & { session?: Session }> {
  const address = email.trim().toLowerCase();
  if (!isValidEmail(address)) return { ok: false, error: "invalid_email" };
  const token = code.replace(/\D/g, "");
  // Supabase sends 6 digits when configured as in docs/supabase-setup.md; accept up to 8 in case the project default is longer.
  if (token.length < 6 || token.length > 8) return { ok: false, error: "invalid_code" };
  const { data, error } = await getSupabaseBrowserClient().auth.verifyOtp({ email: address, token, type: "email" });
  if (error || !data.user) return mapAuthError(error?.message ?? "invalid", error?.status);
  return { ok: true, session: { userId: data.user.id, email: data.user.email ?? address, provider: "email" } };
}

/**
 * Redirects to Google.
 *
 * With NEXT_PUBLIC_GOOGLE_CLIENT_ID set, the flow runs on our own domain
 * (/auth/google → Google → /auth/google/callback), so Google's screen shows our
 * domain instead of <ref>.supabase.co. Without it, Supabase's hosted flow is
 * used and Google returns via /auth/callback. Both end with a Supabase session
 * and a redirect to `next` (default /app).
 */
export async function signInWithGoogle(next = "/app"): Promise<AuthResult> {
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/app";
  if (process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
    // A full page load on purpose: /auth/google is a Route Handler that redirects to Google, not a page.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign(`/auth/google?next=${encodeURIComponent(safeNext)}`);
    return { ok: true };
  }
  const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext)}`;
  const { error } = await getSupabaseBrowserClient().auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo, queryParams: { prompt: "select_account" } },
  });
  return error ? mapAuthError(error.message, error.status) : { ok: true };
}

export async function signOut(): Promise<void> {
  await getSupabaseBrowserClient().auth.signOut();
}

/** Subscribe to sign-in/sign-out. Returns an unsubscribe function. */
export function onAuthChange(callback: (signedIn: boolean) => void): () => void {
  const { data } = getSupabaseBrowserClient().auth.onAuthStateChange((_event, session) => callback(!!session));
  return () => data.subscription.unsubscribe();
}

export { getSession } from "@/lib/data";
