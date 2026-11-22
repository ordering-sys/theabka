import { parseJson, toCurrency, toMinorUnits, toState } from "./parse";
import { signatureHeaderName, verifyHmac } from "./signature";
import {
  ProviderNotConfiguredError,
  type CreateChargeInput,
  type CreateChargeResult,
  type PaymentAdapter,
  type ProviderPaymentState,
} from "./types";

/**
 * Bakong (NBC) KHQR adapter.
 * Env: BAKONG_ACCOUNT_ID (e.g. name@bank), BAKONG_MERCHANT_NAME, BAKONG_MERCHANT_CITY,
 *      BAKONG_API_TOKEN, BAKONG_API_URL.
 *
 * A Bakong KHQR is generated locally (EMVCo string) and payment is confirmed by
 * asking the Bakong Open API about the QR's md5. So checkStatus() is the main
 * confirmation path: the status endpoint calls it while the pay sheet polls.
 */
function config() {
  const accountId = process.env.BAKONG_ACCOUNT_ID;
  const token = process.env.BAKONG_API_TOKEN;
  const apiUrl = process.env.BAKONG_API_URL;
  if (!accountId || !token || !apiUrl) {
    throw new ProviderNotConfiguredError("bakong", "set BAKONG_ACCOUNT_ID, BAKONG_API_TOKEN and BAKONG_API_URL");
  }
  return {
    accountId,
    token,
    apiUrl: apiUrl.replace(/\/$/, ""),
    merchantName: process.env.BAKONG_MERCHANT_NAME ?? "TheabKa",
    merchantCity: process.env.BAKONG_MERCHANT_CITY ?? "Phnom Penh",
  };
}

export const bakongAdapter: PaymentAdapter = {
  id: "bakong",

  async createCharge(input: CreateChargeInput): Promise<CreateChargeResult> {
    const cfg = config();
    void cfg;
    void input;
    // TODO(Bakong): build the dynamic KHQR string here, e.g. with NBC's official
    // "bakong-khqr" SDK: account/merchant info from cfg,
    // amount = toMajorString(input.amount, input.currency), currency = input.currency,
    // bill number = input.reference, expiry = input.expiresAt.
    // Return { qrPayload: <KHQR string>, providerRef: <md5 of the KHQR string>, expiresAt: input.expiresAt }.
    throw new ProviderNotConfiguredError(
      "bakong",
      "createCharge is not implemented yet (see TODO in lib/payments/bakong.ts)",
    );
  },

  async parseWebhook(rawBody: string, headers: Headers) {
    // Bakong has no merchant webhook of its own. This accepts events from your
    // own relay/worker signed with PAYMENT_WEBHOOK_SECRET:
    //   {"provider_ref": "<md5>", "status": "paid", "amount": "5.00", "currency": "USD"}
    verifyHmac(rawBody, headers.get(signatureHeaderName()), process.env.PAYMENT_WEBHOOK_SECRET);
    const body = parseJson(rawBody);
    const currency = toCurrency(body.currency);
    return {
      providerRef: String(body.provider_ref ?? ""),
      state: toState(body.status),
      amount: toMinorUnits(body.amount, currency),
      currency,
      raw: body,
    };
  },

  async checkStatus(providerRef: string): Promise<ProviderPaymentState> {
    const cfg = config();
    // TODO(Bakong): confirm the endpoint and response shape against the Bakong Open API docs.
    const res = await fetch(`${cfg.apiUrl}/v1/check_transaction_by_md5`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${cfg.token}` },
      body: JSON.stringify({ md5: providerRef }),
      cache: "no-store",
    });
    if (!res.ok) return "pending";
    const body = (await res.json().catch(() => ({}))) as { responseCode?: number };
    return body.responseCode === 0 ? "paid" : "pending";
  },
};
