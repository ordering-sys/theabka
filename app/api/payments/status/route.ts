import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { invitationTag, publish } from "@/lib/data/server";
import type { PaymentStatusResult } from "@/lib/data/types";
import { getPaymentAdapter } from "@/lib/payments";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * GET /api/payments/status?id=<paymentId> — polled by the pay sheet.
 *
 * While a payment is pending it asks the provider (server to server) whether it
 * was paid, so providers without webhooks (Bakong) and the sandbox work too;
 * a "paid" answer goes through the same mark_payment_paid() as the webhook.
 */
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return error(400, "invalid_request");

  const supabase = await getSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return error(401, "not_signed_in");

  // RLS: hosts can only read their own payments.
  const { data: payment } = await supabase.from("payments").select("*").eq("id", id).maybeSingle();
  if (!payment) return error(404, "not_found");

  let status = payment.status;

  if (status === "pending") {
    const amount = payment.currency === "USD" ? payment.amount_usd_cents : payment.amount_khr;
    try {
      const adapter = getPaymentAdapter(payment.provider);
      const state = adapter.checkStatus
        ? await adapter.checkStatus(payment.provider_ref, {
            amount,
            currency: payment.currency,
            createdAt: new Date(payment.created_at),
          })
        : "pending";
      if (state === "paid") {
        const result = await publish(payment.provider_ref, {
          amount,
          currency: payment.currency,
          raw: { source: "status_poll", provider: payment.provider },
        });
        if (result.slug && !result.alreadyPaid) revalidateTag(invitationTag(result.slug), { expire: 0 });
        status = "paid";
      }
    } catch (e) {
      console.error("[payments/status] check failed", e);
    }

    if (status === "pending" && new Date(payment.expires_at).getTime() < Date.now()) {
      await getSupabaseAdminClient()
        .from("payments")
        .update({ status: "expired" })
        .eq("id", payment.id)
        .eq("status", "pending");
      status = "expired";
    }
  }

  const { data: inv } = payment.invitation_id
    ? await supabase.from("invitations").select("status, slug").eq("id", payment.invitation_id).maybeSingle()
    : { data: null };

  const result: PaymentStatusResult = {
    paymentId: payment.id,
    status,
    invitationId: payment.invitation_id,
    slug: inv?.slug ?? null,
    live: inv?.status === "live",
    expiresAt: payment.expires_at,
  };
  return NextResponse.json(result, { headers: { "cache-control": "no-store" } });
}

function error(status: number, code: string) {
  return NextResponse.json({ error: code }, { status, headers: { "cache-control": "no-store" } });
}
