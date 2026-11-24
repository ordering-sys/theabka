/**
 * Server-side data access. Import only from Server Components, Route
 * Handlers and Server Functions.
 */
import { cacheLife, cacheTag } from "next/cache";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { InvitationRow, PhotoRow } from "@/lib/supabase/database.types";
import { assertServer } from "@/lib/supabase/env";
import { getSupabasePublicServerClient, getSupabaseServerClient } from "@/lib/supabase/server";
import { GUEST_URL_TTL } from "./limits";
import { refsFor, rowToDraft } from "./mappers";
import { signRefs } from "./storage-refs";
import type { Draft, Invitation, InvitationGuest, PaymentCurrency, Session, Tier } from "./types";

assertServer("lib/data/server");

/** Cache tag for a public invitation page; the webhook revalidates it on go-live. */
export const invitationTag = (slug: string) => `invitation:${slug}`;

/**
 * The signed-in user, validated with Supabase Auth. Reads cookies, so under
 * cacheComponents the calling component must render inside <Suspense>.
 */
export async function getSession(): Promise<Session | null> {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  const user = data.user;
  if (error || !user) return null;
  const name = String(user.user_metadata?.full_name ?? user.user_metadata?.name ?? "").trim();
  return {
    userId: user.id,
    ...(user.email ? { email: user.email } : {}),
    ...(name ? { name } : {}),
    provider: user.app_metadata?.provider === "google" ? "google" : "email",
  };
}

/** What's left to show for an invitation whose online period is over (see data retention). */
export type EndedInvitation = Pick<
  Invitation,
  "slug" | "templateId" | "eventDate" | "brideKm" | "brideEn" | "groomKm" | "groomEn"
>;

export type PublishedLookup =
  | { ended: false; draft: Draft; onlineUntil: string; tier: Tier; rsvpsOpen: boolean }
  | { ended: true; invitation: EndedInvitation };

/**
 * A published invitation by its public slug, for /i/[slug] and its OG image.
 * Returns undefined for unknown slugs and drafts (call notFound()), and
 * `ended: true` with only names and date once its online period is over.
 * Photos are capped at the paid plan's limit and custom music is dropped if
 * the plan doesn't allow it (done in SQL). Media URLs are signed for 7 days.
 *
 * Cached ("use cache", no cookies) for up to an hour; tagged with
 * invitationTag(slug) so go-live, host edits and retention can refresh it.
 */
export async function getPublishedBySlug(slug: string): Promise<PublishedLookup | undefined> {
  "use cache";
  cacheTag(invitationTag(slug));

  if (!/^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/.test(slug)) {
    cacheLife("hours");
    return undefined;
  }
  const supabase = getSupabasePublicServerClient();
  const { data, error } = await supabase.rpc("get_published_invitation", { p_slug: slug });
  if (error || !data || typeof data !== "object") {
    cacheLife("hours");
    return undefined;
  }

  if ((data as { ended?: boolean }).ended) {
    cacheLife("hours");
    const t = (data as unknown as { invitation: Pick<InvitationRow, "slug" | "template_id" | "event_date" | "bride_km" | "bride_en" | "groom_km" | "groom_en"> }).invitation;
    return {
      ended: true,
      invitation: {
        slug: t.slug,
        templateId: t.template_id,
        eventDate: t.event_date ?? "",
        brideKm: t.bride_km,
        brideEn: t.bride_en,
        groomKm: t.groom_km,
        groomEn: t.groom_en,
      },
    };
  }

  const payload = data as unknown as {
    invitation: InvitationRow;
    online_until: string;
    /** The paid plan; decides Premium-only guest features such as the opening animation. */
    tier: Tier;
    /** False once the plan's RSVP limit is reached (missing before migration 20261124110000). */
    rsvps_open?: boolean;
    photos: Pick<PhotoRow, "id" | "invitation_id" | "storage_path" | "position">[];
  };

  // Never serve a cached "online" page past the end of its last online day (Cambodia time, UTC+7).
  if (payload.online_until) {
    const endsAt = Date.parse(`${payload.online_until}T00:00:00+07:00`) + 24 * 60 * 60 * 1000;
    const left = Math.max(60, Math.floor((endsAt - Date.now()) / 1000));
    cacheLife({ stale: Math.min(300, left), revalidate: Math.min(3600, left), expire: Math.min(86400, left) });
  } else {
    console.warn("[guest] get_published_invitation returned no online_until: apply migration 20261124090000_data_retention.sql");
    cacheLife("hours");
  }

  const row: InvitationRow = {
    ...payload.invitation,
    custom_music_ref: payload.invitation.music_url,
    paid_tier: null,
    purged_at: null,
  };
  const urls = await signRefs(supabase, refsFor([row], payload.photos, "url"), GUEST_URL_TTL);
  return {
    ended: false,
    draft: rowToDraft(row, payload.photos, urls, "url"),
    onlineUntil: payload.online_until,
    tier: payload.tier === "premium" ? "premium" : "basic",
    rsvpsOpen: payload.rsvps_open !== false,
  };
}

/**
 * The named guest behind a personal link /i/<slug>/<code> (Premium), or undefined
 * (unknown code, deleted guest, invitation not online or not Premium): the page then
 * shows the general invitation. Cached like the invitation, under the same tag.
 */
export async function getInvitedGuest(slug: string, code: string): Promise<InvitedGuestLookup | undefined> {
  "use cache";
  cacheLife("hours");
  cacheTag(invitationTag(slug));

  if (!/^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/.test(slug) || !/^[a-z0-9]{6,16}$/.test(code)) return undefined;
  const { data, error } = await getSupabasePublicServerClient().rpc("get_invited_guest", { p_slug: slug, p_code: code });
  if (error || !data || typeof data !== "object") return undefined;
  const g = data as { id: string; title: InvitedGuestLookup["title"]; name_km: string; name_en: string; companion?: InvitedGuestLookup["companion"] };
  return { id: g.id, title: g.title, nameKm: g.name_km, nameEn: g.name_en, companion: g.companion ?? "" };
}

export type InvitedGuestLookup = Pick<InvitationGuest, "id" | "title" | "nameKm" | "nameEn" | "companion">;

/**
 * Slugs of recently published invitations, for generateStaticParams at build
 * time. Uses the service role; returns [] if it isn't configured.
 */
export async function listLiveSlugs(limit = 50): Promise<string[]> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return [];
  const { data } = await getSupabaseAdminClient()
    .from("invitations")
    .select("slug")
    .eq("status", "live")
    .is("purged_at", null)
    .order("published_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((r) => r.slug);
}

export type PublishResult = { paymentId: string; invitationId: string | null; slug: string | null; alreadyPaid: boolean };

/**
 * What publishMock() simulated: mark a payment paid and set its invitation
 * live (status, paid_tier, published_at), atomically and idempotently on
 * provider_ref. SERVER ONLY, service role. Called by the payment webhook and
 * the sandbox/status poller after the provider has confirmed the money.
 * Throws "payment_not_found", "amount_mismatch" or "payment_refunded".
 */
export async function publish(
  providerRef: string,
  paid: { amount: number; currency: PaymentCurrency; raw?: unknown },
): Promise<PublishResult> {
  const { data, error } = await getSupabaseAdminClient().rpc("mark_payment_paid", {
    p_provider_ref: providerRef,
    p_amount: paid.amount,
    p_currency: paid.currency,
    p_raw: (paid.raw ?? null) as never,
  });
  if (error) throw new Error(error.message);
  const row = data?.[0];
  if (!row) throw new Error("payment_not_found");
  return { paymentId: row.payment_id, invitationId: row.invitation_id, slug: row.slug, alreadyPaid: row.already_paid };
}
