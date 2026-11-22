import { getPublishedBySlug, listLiveSlugs } from "@/lib/data/server";
import { getPhotos, invitations, type Invitation, type Photo } from "@/lib/mock-data";
import { isSupabaseConfigured } from "@/lib/supabase/env";

/** Server-side lookup of a published invitation: Supabase when configured, else the sample data. */
export async function findPublished(slug: string): Promise<{ invitation: Invitation; photos: Photo[] } | undefined> {
  if (isSupabaseConfigured()) {
    const draft = await getPublishedBySlug(slug);
    return draft && { invitation: draft, photos: draft.photos };
  }
  const inv = invitations.find((i) => i.slug === slug && i.status === "live");
  return inv && { invitation: inv, photos: getPhotos(inv.id) };
}

/**
 * Slugs to prerender. cacheComponents requires at least one entry, so a
 * placeholder is returned when there are none yet (it renders as a 404).
 */
export async function publishedSlugs(): Promise<{ slug: string }[]> {
  const slugs = isSupabaseConfigured()
    ? await listLiveSlugs().catch(() => [])
    : invitations.filter((i) => i.status === "live").map((i) => i.slug);
  return (slugs.length ? slugs : ["__none__"]).map((slug) => ({ slug }));
}
