import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * OAuth (Google) return URL. Exchanges the ?code for a session cookie and
 * redirects to ?next (a same-site path only, to avoid open redirects).
 * Register <site>/auth/callback in Supabase Auth > URL Configuration.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") ?? "/app";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") && !nextParam.startsWith("/\\") ? nextParam : "/app";

  if (code) {
    const supabase = await getSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, origin));
  }

  const failed = new URL("/signin", origin);
  failed.searchParams.set("error", searchParams.get("error_description") ? "oauth_denied" : "oauth_failed");
  return NextResponse.redirect(failed);
}
