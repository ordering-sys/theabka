import { parseJson, toCurrency, toMinorUnits } from "./parse";
import { signatureHeaderName, verifyHmac } from "./signature";
import {
  ProviderNotConfiguredError,
  type CreateChargeInput,
  type CreateChargeResult,
  type PaymentAdapter,
  type ProviderPaymentState,
} from "./types";

/**
 * ABA PayWay adapter (KHQR).
 * Env: ABA_PAYWAY_MERCHANT_ID, ABA_PAYWAY_API_KEY, ABA_PAYWAY_API_URL, PAYMENT_WEBHOOK_SECRET.
 *
 * Everything provider-specific is marked TODO(ABA): confirm field names, hash
 * order and endpoints against the PayWay documentation you receive when
 * onboarding. Do not go live until those TODOs are resolved and tested in the
 * PayWay sandbox.
 */
function config() {
  const merchantId = process.env.ABA_PAYWAY_MERCHANT_ID;
  const apiKey = process.env.ABA_PAYWAY_API_KEY;
  const apiUrl = process.env.ABA_PAYWAY_API_URL;
  if (!merchantId || !apiKey || !apiUrl) {
    throw new ProviderNotConfiguredError(
      "aba_payway",
      "set ABA_PAYWAY_MERCHANT_ID, ABA_PAYWAY_API_KEY and ABA_PAYWAY_API_URL",
    );
  }
  return { merchantId, apiKey, apiUrl };
}

export const abaPaywayAdapter: PaymentAdapter = {
  id: "aba_payway",

  async createCharge(input: CreateChargeInput): Promise<CreateChargeResult> {
    const cfg = config();
    void cfg;
    void input;
    // TODO(ABA): call PayWay's KHQR / QR purchase API here. Roughly:
    //   POST `${cfg.apiUrl}/<qr endpoint>` with merchant_id, req_time,
    //   tran_id = input.reference, amount = toMajorString(input.amount, input.currency),
    //   currency = input.currency, callback_url (base64 of input.callbackUrl),
    //   lifetime = 10 minutes, and
    //   hash = base64(HMAC-SHA512(<fields concatenated in the documented order>, cfg.apiKey)).
    //   Return { providerRef: tran_id, qrPayload: <KHQR string from the response>, expiresAt: input.expiresAt }.
    throw new ProviderNotConfiguredError(
      "aba_payway",
      "createCharge is not implemented yet (see TODO in lib/payments/aba-payway.ts)",
    );
  },

  async parseWebhook(rawBody: string, headers: Headers) {
    // TODO(ABA): confirm how PayWay authenticates pushback callbacks. If it does
    // not sign them with a shared secret, put a signing relay in front or rely on
    // checkStatus() with PAYMENT_CONFIRM_WEBHOOKS=true (the webhook route then re-confirms).
    verifyHmac(rawBody, headers.get(signatureHeaderName()), process.env.PAYMENT_WEBHOOK_SECRET, "sha512");
    const body = parseJson(rawBody);
    const currency = toCurrency(body.currency ?? "USD");
    // TODO(ABA): confirm field names and the success status code.
    const status = String(body.status ?? "").toLowerCase();
    const state: ProviderPaymentState = status === "0" || status === "00" || status === "approved" ? "paid" : "pending";
    return {
      providerRef: String(body.tran_id ?? ""),
      state,
      amount: toMinorUnits(body.amount, currency),
      currency,
      raw: body,
    };
  },

  async checkStatus(providerRef: string): Promise<ProviderPaymentState> {
    const cfg = config();
    void cfg;
    void providerRef;
    // TODO(ABA): call PayWay's check-transaction API for tran_id = providerRef
    // (same hash scheme as above) and map its status to "paid" | "pending" | "failed".
    return "pending";
  },
};
