import { getPublishedBySlug, listLiveSlugs } from "@/lib/data/server";
import { sampleInvitation, type Invitation, type Photo } from "@/lib/mock-data";

/**
 * The landing page's "see a sample" link (/i/dara-sophea). It isn't in the database,
 * so it's served from the static demo data. Audio files aren't in the repo yet, so the
 * sample has no music. Six placeholder photos live in public/sample/.
 */
const SAMPLE = {
  invitation: { ...sampleInvitation, musicUrl: null } satisfies Invitation,
  photos: [1, 2, 3, 4, 5, 6].map((n): Photo => ({
    id: `photo_s${n}`,
    invitationId: sampleInvitation.id,
    url: `/sample/photo-${n}.svg`,
    position: n - 1,
  })),
};

/**
 * Server-side lookup of a live invitation in Supabase. `demo` is true for the built-in
 * sample, which the guest page shows without saving RSVPs or counting views.
 * A real invitation with the same slug would take precedence.
 */
export async function findPublished(
  slug: string,
): Promise<{ invitation: Invitation; photos: Photo[]; demo: boolean } | undefined> {
  const draft = await getPublishedBySlug(slug).catch(() => undefined);
  if (draft) return { invitation: draft, photos: draft.photos, demo: false };
  if (slug === sampleInvitation.slug) return { ...SAMPLE, demo: true };
  return undefined;
}

/**
 * Slugs to prerender. cacheComponents requires at least one entry; the built-in
 * sample is always there.
 */
export async function publishedSlugs(): Promise<{ slug: string }[]> {
  const slugs = await listLiveSlugs().catch(() => []);
  return [...new Set([sampleInvitation.slug, ...slugs])].map((slug) => ({ slug }));
}
