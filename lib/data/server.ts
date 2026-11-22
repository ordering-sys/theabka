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
import type { Draft, PaymentCurrency, Session } from "./types";

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
  return {
    userId: user.id,
    ...(user.email ? { email: user.email } : {}),
    provider: user.app_metadata?.provider === "google" ? "google" : "email",
  };
}

/**
 * A live invitation by its public slug, for /i/[slug] and its OG image.
 * Returns undefined for unknown slugs and drafts (call notFound()).
 * Photos are capped at the paid plan's limit and custom music is dropped if
 * the plan doesn't allow it (done in SQL). Media URLs are signed for 7 days.
 *
 * Cached ("use cache", no cookies) for up to an hour; tagged with
 * invitationTag(slug) so go-live and host edits can refresh it.
 */
export async function getPublishedBySlug(slug: string): Promise<Draft | undefined> {
  "use cache";
  cacheLife("hours");
  cacheTag(invitationTag(slug));

  if (!/^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/.test(slug)) return undefined;
  const supabase = getSupabasePublicServerClient();
  const { data, error } = await supabase.rpc("get_published_invitation", { p_slug: slug });
  if (error || !data || typeof data !== "object") return undefined;

  const payload = data as unknown as {
    invitation: InvitationRow;
    photos: Pick<PhotoRow, "id" | "invitation_id" | "storage_path" | "position">[];
  };
  const row: InvitationRow = { ...payload.invitation, custom_music_ref: payload.invitation.music_url, paid_tier: null };
  const urls = await signRefs(supabase, refsFor([row], payload.photos, "url"), GUEST_URL_TTL);
  return rowToDraft(row, payload.photos, urls, "url");
}

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
