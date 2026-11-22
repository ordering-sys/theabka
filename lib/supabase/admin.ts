import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { assertServer, getSupabasePublicEnv } from "./env";

assertServer("lib/supabase/admin");

let adminClient: SupabaseClient<Database> | undefined;

/**
 * Service-role client: BYPASSES RLS. Server only (payment routes, webhook,
 * build-time slug listing). Never import this from a Client Component.
 */
export function getSupabaseAdminClient(): SupabaseClient<Database> {
  if (!adminClient) {
    const { url } = getSupabasePublicEnv();
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set (server env only, see .env.example).");
    adminClient = createClient<Database>(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }
  return adminClient;
}
