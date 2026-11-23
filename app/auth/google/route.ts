import { NextResponse, type NextRequest } from "next/server";
import {
  FLOW_COOKIE,
  FLOW_COOKIE_PATH,
  FLOW_MAX_AGE,
  GOOGLE_AUTH_URL,
  encodeFlow,
  getGoogleOAuthConfig,
  googleRedirectUri,
  hashNonce,
  randomToken,
  safeNextPath,
} from "@/lib/auth/google-oauth";

/**
 * Starts Google sign-in on our own domain. Sets a short-lived cookie with the
 * CSRF state and nonce, then sends the browser to Google's account picker.
 */
export async function GET(request: NextRequest) {
  const { origin, searchParams } = request.nextUrl;
  const config = getGoogleOAuthConfig();
  if (!config) {
    const failed = new URL("/signin", origin);
    failed.searchParams.set("error", "oauth_failed");
    return NextResponse.redirect(failed);
  }

  const flow = { state: randomToken(), nonce: randomToken(), next: safeNextPath(searchParams.get("next")) };

  const google = new URL(GOOGLE_AUTH_URL);
  google.searchParams.set("client_id", config.clientId);
  google.searchParams.set("redirect_uri", googleRedirectUri(origin));
  google.searchParams.set("response_type", "code");
  google.searchParams.set("scope", "openid email profile");
  google.searchParams.set("state", flow.state);
  google.searchParams.set("nonce", hashNonce(flow.nonce));
  google.searchParams.set("prompt", "select_account");

  const response = NextResponse.redirect(google);
  response.cookies.set(FLOW_COOKIE, encodeFlow(flow), {
    httpOnly: true,
    secure: origin.startsWith("https://"),
    sameSite: "lax", // sent on Google's top-level redirect back to us
    path: FLOW_COOKIE_PATH,
    maxAge: FLOW_MAX_AGE,
  });
  return response;
}
