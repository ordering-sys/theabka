import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "./database.types";
import { assertServer, getSupabasePublicEnv } from "./env";

assertServer("lib/supabase/server");

/**
 * Supabase client bound to the request's auth cookies (Server Components,
 * Server Functions, Route Handlers). Acts as the signed-in user under RLS.
 *
 * cacheComponents: this reads cookies(), so a Server Component calling it must
 * render inside <Suspense>, and it must never be called inside "use cache".
 */
export async function getSupabaseServerClient(): Promise<SupabaseClient<Database>> {
  const { url, anonKey } = getSupabasePublicEnv();
  const cookieStore = await cookies();
  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // proxy.ts refreshes the session cookie on navigation instead.
        }
      },
    },
  });
}

/**
 * Cookie-less anon client for public reads (guest invitation page). Safe inside
 * "use cache" because it doesn't touch request data. Same rights as a guest.
 */
export function getSupabasePublicServerClient(): SupabaseClient<Database> {
  const { url, anonKey } = getSupabasePublicEnv();
  return createClient<Database>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
