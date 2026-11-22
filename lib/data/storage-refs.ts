import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Storage-backed columns hold refs ("storage://<bucket>/<path>") instead of
 * URLs, because buckets are private and URLs are signed per read.
 */
export type Bucket = "photos" | "music" | "gift-qr";
const BUCKETS: readonly Bucket[] = ["photos", "music", "gift-qr"];
const PREFIX = "storage://";

export function toRef(bucket: Bucket, path: string) {
  return `${PREFIX}${bucket}/${path}`;
}

export function parseRef(ref: string | null | undefined): { bucket: Bucket; path: string } | null {
  if (!ref?.startsWith(PREFIX)) return null;
  const rest = ref.slice(PREFIX.length);
  const slash = rest.indexOf("/");
  const bucket = rest.slice(0, slash) as Bucket;
  if (slash < 1 || !BUCKETS.includes(bucket)) return null;
  return { bucket, path: rest.slice(slash + 1) };
}

/**
 * Turn whatever the UI holds back into what the DB stores: a signed Supabase
 * Storage URL becomes a ref; refs, built-in paths ("/music/x.mp3") and null pass through.
 */
export function urlToRef(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith(PREFIX)) return url;
  const m = url.match(/\/storage\/v1\/object\/(?:sign|public|authenticated)\/([^/?]+)\/([^?#]+)/);
  if (m && BUCKETS.includes(m[1] as Bucket)) return toRef(m[1] as Bucket, decodeURIComponent(m[2]));
  return url;
}

/** Storage path for a new upload: <user_id>/<invitation_id>/<uuid>.<ext> */
export function newObjectPath(userId: string, invitationId: string, file: { name?: string; type: string }) {
  const fromName = file.name?.includes(".") ? file.name.split(".").pop() : undefined;
  const fromType = file.type.split("/")[1]?.replace("mpeg", "mp3").replace("x-m4a", "m4a").replace("jpeg", "jpg");
  const ext = (fromName ?? fromType ?? "bin").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "bin";
  return `${userId}/${invitationId}/${crypto.randomUUID()}.${ext}`;
}

/**
 * Sign many refs at once (one request per bucket). Non-ref values map to themselves.
 * Refs the caller may not read resolve to null.
 */
export async function signRefs(
  supabase: SupabaseClient<Database>,
  refs: (string | null | undefined)[],
  expiresIn: number,
): Promise<Map<string, string | null>> {
  const out = new Map<string, string | null>();
  const byBucket = new Map<Bucket, string[]>();
  for (const ref of refs) {
    if (!ref) continue;
    const parsed = parseRef(ref);
    if (!parsed) {
      out.set(ref, ref);
      continue;
    }
    byBucket.set(parsed.bucket, [...(byBucket.get(parsed.bucket) ?? []), parsed.path]);
  }
  await Promise.all(
    [...byBucket].map(async ([bucket, paths]) => {
      const unique = [...new Set(paths)];
      const { data } = await supabase.storage.from(bucket).createSignedUrls(unique, expiresIn);
      for (const path of unique) {
        const hit = data?.find((d) => d.path === path);
        out.set(toRef(bucket, path), hit && !hit.error ? hit.signedUrl : null);
      }
    }),
  );
  return out;
}
