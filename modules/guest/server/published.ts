import { getInvitedGuest, getPublishedBySlug, listLiveSlugs, type EndedInvitation } from "@/lib/data/server";
import type { InvitedGuest } from "@/modules/guest/lib/greeting";
import { sampleInvitation, type Invitation, type Photo, type Tier } from "@/lib/mock-data";

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

export type FoundInvitation =
  | { ended: false; invitation: Invitation; photos: Photo[]; demo: boolean; tier: Tier; rsvpsOpen: boolean }
  | { ended: true; invitation: EndedInvitation };

/**
 * Server-side lookup of a published invitation in Supabase. `demo` is true for the built-in
 * sample, which the guest page shows without saving RSVPs or counting views.
 * `ended` is true once the invitation's online period is over (data retention): only the
 * names and date are left. A real invitation with the same slug would take precedence.
 */
export async function findPublished(slug: string): Promise<FoundInvitation | undefined> {
  const found = await getPublishedBySlug(slug).catch(() => undefined);
  if (found?.ended) return found;
  if (found) {
    return { ended: false, invitation: found.draft, photos: found.draft.photos, demo: false, tier: found.tier, rsvpsOpen: found.rsvpsOpen };
  }
  // The sample shows everything Premium has.
  if (slug === sampleInvitation.slug) return { ended: false, ...SAMPLE, demo: true, tier: "premium", rsvpsOpen: true };
  return undefined;
}

/** The sample's personal link, /i/dara-sophea/sample, so the landing page can show the feature. */
export const SAMPLE_GUEST_CODE = "sample";
const SAMPLE_GUEST: InvitedGuest = { id: "guest_sample", title: "mr", nameKm: "សុខ វណ្ណា", nameEn: "Sok Vanna", companion: "family" };

/** The named guest behind /i/<slug>/<code>, or undefined to show the general invitation. */
export async function findInvitedGuest(slug: string, code: string, demo: boolean): Promise<InvitedGuest | undefined> {
  if (demo) return code === SAMPLE_GUEST_CODE ? SAMPLE_GUEST : undefined;
  return getInvitedGuest(slug, code).catch(() => undefined);
}

/**
 * Slugs to prerender. cacheComponents requires at least one entry; the built-in
 * sample is always there.
 */
export async function publishedSlugs(): Promise<{ slug: string }[]> {
  const slugs = await listLiveSlugs().catch(() => []);
  return [...new Set([sampleInvitation.slug, ...slugs])].map((slug) => ({ slug }));
}
