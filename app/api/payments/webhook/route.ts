import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { invitationTag, publish } from "@/lib/data/server";
import { getPaymentAdapter, InvalidSignatureError } from "@/lib/payments";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/payments/webhook — provider callback (register this URL with the provider).
 *
 * 1. Verifies the HMAC signature over the raw body (PAYMENT_WEBHOOK_SECRET).
 * 2. Optionally re-confirms with the provider's status API (PAYMENT_CONFIRM_WEBHOOKS=true).
 * 3. mark_payment_paid(): marks the payment paid and sets the invitation live
 *    (status, paid_tier, published_at) in one transaction, idempotent on provider_ref.
 * Replays of an already-paid event return 200 without changing anything.
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  let adapter;
  try {
    adapter = getPaymentAdapter();
  } catch (e) {
    console.error("[webhook] provider config", e);
    return NextResponse.json({ error: "provider_unavailable" }, { status: 503 });
  }

  let event;
  try {
    event = await adapter.parseWebhook(rawBody, request.headers);
  } catch (e) {
    if (e instanceof InvalidSignatureError) {
      console.warn("[webhook] rejected:", e.message);
      return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
    }
    console.error("[webhook] parse failed", e);
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  if (!event.providerRef || !Number.isFinite(event.amount)) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  if (event.state !== "paid") {
    // Failed/pending notifications: nothing to do; the QR simply expires.
    return NextResponse.json({ ok: true, ignored: event.state });
  }

  if (process.env.PAYMENT_CONFIRM_WEBHOOKS === "true" && adapter.checkStatus) {
    const { data: payment } = await getSupabaseAdminClient()
      .from("payments")
      .select("created_at, amount_usd_cents, amount_khr, currency")
      .eq("provider_ref", event.providerRef)
      .maybeSingle();
    if (!payment) return NextResponse.json({ error: "payment_not_found" }, { status: 404 });
    const confirmed = await adapter.checkStatus(event.providerRef, {
      amount: payment.currency === "USD" ? payment.amount_usd_cents : payment.amount_khr,
      currency: payment.currency,
      createdAt: new Date(payment.created_at),
    });
    if (confirmed !== "paid") {
      // Ask the provider to retry later.
      return NextResponse.json({ error: "not_confirmed" }, { status: 409 });
    }
  }

  try {
    const result = await publish(event.providerRef, { amount: event.amount, currency: event.currency, raw: event.raw });
    if (result.slug && !result.alreadyPaid) revalidateTag(invitationTag(result.slug), { expire: 0 });
    return NextResponse.json({ ok: true, alreadyPaid: result.alreadyPaid });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (message.includes("payment_not_found")) return NextResponse.json({ error: "payment_not_found" }, { status: 404 });
    if (message.includes("amount_mismatch") || message.includes("payment_refunded")) {
      console.error("[webhook] rejected payment", event.providerRef, message);
      return NextResponse.json({ error: "rejected" }, { status: 400 });
    }
    console.error("[webhook] publish failed", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
