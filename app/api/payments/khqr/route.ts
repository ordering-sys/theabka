import { NextResponse, type NextRequest } from "next/server";
import type { KhqrCharge } from "@/lib/data/types";
import { getPaymentAdapter, KHQR_TTL_MS, newPaymentReference, ProviderNotConfiguredError } from "@/lib/payments";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * POST /api/payments/khqr  { invitationId: string, currency?: "USD" | "KHR" }
 *
 * Creates a KHQR charge to publish a draft. The amount is computed here from
 * the invitation's template tier (plans table), never taken from the client.
 * Responds with KhqrCharge (QR payload, both amounts, 10-minute expiry).
 */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { invitationId?: unknown; currency?: unknown } | null;
  const invitationId = typeof body?.invitationId === "string" ? body.invitationId : null;
  const currency = body?.currency === "KHR" ? "KHR" : "USD";
  if (!invitationId) return error(400, "invalid_request");

  const supabase = await getSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return error(401, "not_signed_in");

  // RLS: only the owner can see the invitation.
  const { data: inv } = await supabase
    .from("invitations")
    .select("id, user_id, status, template_id, music_url")
    .eq("id", invitationId)
    .maybeSingle();
  if (!inv || inv.user_id !== auth.user.id) return error(404, "not_found");
  if (inv.status === "live") return error(409, "already_live");

  const admin = getSupabaseAdminClient();
  const { data: template } = await admin.from("templates").select("tier").eq("id", inv.template_id).single();
  if (!template) return error(422, "invalid_template");
  const { data: plan } = await admin.from("plans").select("*").eq("tier", template.tier).single();
  if (!plan) return error(500, "plan_missing");

  // Plan limits (also enforced by triggers; re-checked here because the template may have changed).
  const { count: photoCount } = await admin
    .from("photos")
    .select("id", { count: "exact", head: true })
    .eq("invitation_id", inv.id);
  if ((photoCount ?? 0) > plan.max_photos) return error(422, "too_many_photos", { maxPhotos: plan.max_photos });
  if (inv.music_url?.startsWith("storage://") && !plan.custom_music) return error(422, "custom_music_requires_premium");

  let adapter;
  try {
    adapter = getPaymentAdapter();
  } catch (e) {
    console.error("[payments] provider config", e);
    return error(503, "provider_unavailable");
  }

  const amount = currency === "USD" ? plan.price_usd_cents : plan.price_khr;
  const expiresAt = new Date(Date.now() + KHQR_TTL_MS);
  const reference = newPaymentReference();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? request.nextUrl.origin;

  let charge;
  try {
    charge = await adapter.createCharge({
      reference,
      amount,
      currency,
      description: `TheabKa ${plan.tier} invitation`,
      expiresAt,
      callbackUrl: `${siteUrl}/api/payments/webhook`,
    });
  } catch (e) {
    console.error("[payments] createCharge failed", e);
    return error(e instanceof ProviderNotConfiguredError ? 503 : 502, "provider_error");
  }

  // Older unpaid QRs for this invitation are superseded (a late payment on one is still honoured).
  await admin.from("payments").update({ status: "expired" }).eq("invitation_id", inv.id).eq("status", "pending");

  const { data: payment, error: insertError } = await admin
    .from("payments")
    .insert({
      invitation_id: inv.id,
      user_id: auth.user.id,
      plan: plan.tier,
      amount_usd_cents: plan.price_usd_cents,
      amount_khr: plan.price_khr,
      currency,
      provider: adapter.id,
      provider_ref: charge.providerRef,
      qr_payload: charge.qrPayload,
      expires_at: charge.expiresAt.toISOString(),
    })
    .select("id")
    .single();
  if (insertError || !payment) {
    console.error("[payments] insert failed", insertError);
    return error(500, "payment_insert_failed");
  }

  const result: KhqrCharge = {
    paymentId: payment.id,
    qrPayload: charge.qrPayload,
    currency,
    amountUsdCents: plan.price_usd_cents,
    amountKhr: plan.price_khr,
    expiresAt: charge.expiresAt.toISOString(),
    sandbox: adapter.id === "sandbox",
  };
  return NextResponse.json(result, { status: 201, headers: { "cache-control": "no-store" } });
}

function error(status: number, code: string, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ error: code, ...extra }, { status, headers: { "cache-control": "no-store" } });
}
