import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { getSupabasePublicEnv } from "./env";

export type TypedSupabaseClient = SupabaseClient<Database>;

let browserClient: TypedSupabaseClient | undefined;

/**
 * Supabase client for Client Components. Uses the anon key only; RLS decides
 * what the signed-in user (or an anonymous guest) can read and write.
 * The session is kept in cookies so server code can read it too.
 */
export function getSupabaseBrowserClient(): TypedSupabaseClient {
  if (typeof window === "undefined") {
    throw new Error("getSupabaseBrowserClient() is for the browser. Use lib/supabase/server on the server.");
  }
  if (!browserClient) {
    const { url, anonKey } = getSupabasePublicEnv();
    browserClient = createBrowserClient<Database>(url, anonKey);
  }
  return browserClient;
}
