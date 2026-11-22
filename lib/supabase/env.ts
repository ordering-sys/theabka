/**
 * Public Supabase settings. NEXT_PUBLIC_* values are inlined into the client
 * bundle at build time, so they must be referenced literally here.
 * The service-role key is NOT read here; see ./admin.ts (server only).
 */
export function getSupabasePublicEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Supabase is not configured: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (see .env.example).",
    );
  }
  return { url, anonKey };
}

/** True when the public Supabase env vars are present (lets the prototype keep running without them). */
export function isSupabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

/** Throws if a server-only module is imported into the browser bundle. */
export function assertServer(moduleName: string) {
  if (typeof window !== "undefined") {
    throw new Error(`${moduleName} is server-only and must not be imported from client code.`);
  }
}
