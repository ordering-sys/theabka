import { parseJson, toCurrency, toState } from "./parse";
import { signatureHeaderName, verifyHmac } from "./signature";
import type { CreateChargeInput, CreateChargeResult, PaymentAdapter, StatusCheckContext } from "./types";

/** How long after creation the sandbox reports a charge as paid (matches the prototype's 3 s). */
const SANDBOX_PAY_AFTER_MS = 3000;

/**
 * Sandbox provider for development and previews. No money moves.
 * - createCharge returns a fake KHQR string (renders as a QR, pays nothing).
 * - checkStatus reports "paid" 3 s after creation, so the pay sheet's polling
 *   flips the invitation live through the same mark_payment_paid() path.
 * - parseWebhook accepts JSON {provider_ref, status, amount, currency} where
 *   amount is in minor units (cents / riel), signed with PAYMENT_WEBHOOK_SECRET
 *   (see docs/supabase-setup.md for a curl example).
 */
export const sandboxAdapter: PaymentAdapter = {
  id: "sandbox",

  async createCharge(input: CreateChargeInput): Promise<CreateChargeResult> {
    return {
      providerRef: input.reference,
      // Deliberately not a valid KHQR, so no banking app can send real money to it.
      qrPayload: `SANDBOX-KHQR|${input.reference}|${input.amount}|${input.currency}`,
      expiresAt: input.expiresAt,
      merchantName: "TheabKa (test)",
    };
  },

  async parseWebhook(rawBody: string, headers: Headers) {
    verifyHmac(rawBody, headers.get(signatureHeaderName()), process.env.PAYMENT_WEBHOOK_SECRET);
    const body = parseJson(rawBody);
    return {
      providerRef: String(body.provider_ref ?? ""),
      state: toState(body.status),
      amount: Number(body.amount),
      currency: toCurrency(body.currency),
      raw: body,
    };
  },

  async checkStatus(_providerRef: string, ctx: StatusCheckContext) {
    return Date.now() - ctx.createdAt.getTime() >= SANDBOX_PAY_AFTER_MS ? "paid" : "pending";
  },
};
