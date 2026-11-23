import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import {
  FLOW_COOKIE,
  FLOW_COOKIE_PATH,
  GOOGLE_TOKEN_URL,
  decodeFlow,
  getGoogleOAuthConfig,
  googleRedirectUri,
  sameToken,
} from "@/lib/auth/google-oauth";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Google returns here (register <site>/auth/google/callback in Google Cloud).
 * Checks the state, swaps the code for an ID token, and hands the token to
 * Supabase, which verifies it and sets the usual session cookie.
 */
export async function GET(request: NextRequest) {
  const { origin, searchParams } = request.nextUrl;
  const cookieStore = await cookies();
  const flow = decodeFlow(cookieStore.get(FLOW_COOKIE)?.value);
  cookieStore.delete({ name: FLOW_COOKIE, path: FLOW_COOKIE_PATH });

  const fail = (reason: "oauth_denied" | "oauth_failed") => {
    const url = new URL("/signin", origin);
    url.searchParams.set("error", reason);
    return NextResponse.redirect(url);
  };

  // The user pressed Cancel on Google's screen.
  if (searchParams.get("error")) return fail("oauth_denied");

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const config = getGoogleOAuthConfig();
  if (!code || !state || !flow || !config || !sameToken(state, flow.state)) return fail("oauth_failed");

  const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: googleRedirectUri(origin),
      grant_type: "authorization_code",
    }),
    cache: "no-store",
  }).catch(() => null);
  if (!tokenResponse?.ok) return fail("oauth_failed");

  const tokens = (await tokenResponse.json().catch(() => null)) as { id_token?: string; access_token?: string } | null;
  if (!tokens?.id_token) return fail("oauth_failed");

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.auth.signInWithIdToken({
    provider: "google",
    token: tokens.id_token,
    access_token: tokens.access_token,
    nonce: flow.nonce,
  });
  if (error) return fail("oauth_failed");

  return NextResponse.redirect(new URL(flow.next, origin));
}
