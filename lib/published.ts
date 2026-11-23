import { getPublishedBySlug, listLiveSlugs } from "@/lib/data/server";
import type { Invitation, Photo } from "@/lib/mock-data";

/** Server-side lookup of a live invitation in Supabase. */
export async function findPublished(slug: string): Promise<{ invitation: Invitation; photos: Photo[] } | undefined> {
  const draft = await getPublishedBySlug(slug);
  return draft && { invitation: draft, photos: draft.photos };
}

/**
 * Slugs to prerender. cacheComponents requires at least one entry, so a
 * placeholder is returned when there are none yet (it renders as a 404).
 */
export async function publishedSlugs(): Promise<{ slug: string }[]> {
  const slugs = await listLiveSlugs().catch(() => []);
  return (slugs.length ? slugs : ["__none__"]).map((slug) => ({ slug }));
}
