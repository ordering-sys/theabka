import { buildKhqr, khqrMd5 } from "./khqr";
import { parseJson, toCurrency, toMajorString, toMinorUnits, toState } from "./parse";
import { signatureHeaderName, verifyHmac } from "./signature";
import {
  ProviderNotConfiguredError,
  type CreateChargeInput,
  type CreateChargeResult,
  type PaymentAdapter,
  type ProviderPaymentState,
  type StatusCheckContext,
} from "./types";

/**
 * Bakong (NBC) KHQR adapter.
 * Env: BAKONG_ACCOUNT_ID (e.g. name@bank), BAKONG_API_TOKEN, BAKONG_API_URL
 *      (https://api-bakong.nbc.gov.kh), BAKONG_MERCHANT_NAME, BAKONG_MERCHANT_CITY,
 *      and for a merchant (not individual) account BAKONG_MERCHANT_ID and
 *      BAKONG_ACQUIRING_BANK.
 *
 * The KHQR is generated locally (lib/payments/khqr.ts) and payment is
 * confirmed by asking the Bakong Open API about the QR's md5, so checkStatus()
 * is the main confirmation path: the status endpoint calls it while the pay
 * sheet polls. The API token expires (renew it in the Bakong developer portal).
 */
function config() {
  const accountId = process.env.BAKONG_ACCOUNT_ID?.trim();
  const token = process.env.BAKONG_API_TOKEN?.trim();
  const apiUrl = process.env.BAKONG_API_URL?.trim();
  if (!accountId || !token || !apiUrl) {
    throw new ProviderNotConfiguredError("bakong", "set BAKONG_ACCOUNT_ID, BAKONG_API_TOKEN and BAKONG_API_URL");
  }
  return {
    accountId,
    token,
    apiUrl: apiUrl.replace(/\/$/, ""),
    merchantId: process.env.BAKONG_MERCHANT_ID?.trim() || undefined,
    acquiringBank: process.env.BAKONG_ACQUIRING_BANK?.trim() || undefined,
    merchantName: process.env.BAKONG_MERCHANT_NAME?.trim() || "TheabKa",
    merchantCity: process.env.BAKONG_MERCHANT_CITY?.trim() || "Phnom Penh",
  };
}

type BakongTransaction = { toAccountId?: string; currency?: string; amount?: number | string };

export const bakongAdapter: PaymentAdapter = {
  id: "bakong",

  async createCharge(input: CreateChargeInput): Promise<CreateChargeResult> {
    const cfg = config();
    const qrPayload = buildKhqr({
      accountId: cfg.accountId,
      merchantId: cfg.merchantId,
      acquiringBank: cfg.acquiringBank,
      merchantName: cfg.merchantName,
      merchantCity: cfg.merchantCity,
      amount: input.amount,
      currency: input.currency,
      billNumber: input.reference,
      expiresAt: input.expiresAt,
    });
    return { qrPayload, providerRef: khqrMd5(qrPayload), expiresAt: input.expiresAt, merchantName: cfg.merchantName };
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

  async checkStatus(providerRef: string, ctx: StatusCheckContext): Promise<ProviderPaymentState> {
    const cfg = config();
    const res = await fetch(`${cfg.apiUrl}/v1/check_transaction_by_md5`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${cfg.token}` },
      body: JSON.stringify({ md5: providerRef }),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (res.status === 401 || res.status === 403) {
      // Expired token, or the request came from outside Cambodia (the API is geo-restricted).
      console.error(`[payments/bakong] check refused: HTTP ${res.status}`);
      return "pending";
    }
    if (!res.ok) return "pending";
    // responseCode 0 = found; 1 = no transaction for this QR yet.
    const body = (await res.json().catch(() => ({}))) as { responseCode?: number; data?: BakongTransaction | null };
    if (body.responseCode !== 0 || !body.data) return "pending";

    // Only accept money that reached our account in the expected amount and currency.
    const tx = body.data;
    const toUs = !tx.toAccountId || tx.toAccountId.toLowerCase() === cfg.accountId.toLowerCase();
    const sameCurrency = !tx.currency || tx.currency.toUpperCase() === ctx.currency;
    const enough = tx.amount === undefined || toMinorUnits(tx.amount, ctx.currency) >= ctx.amount;
    if (!toUs || !sameCurrency || !enough) {
      console.error("[payments/bakong] transaction does not match the charge", {
        providerRef,
        expected: `${toMajorString(ctx.amount, ctx.currency)} ${ctx.currency}`,
        got: `${tx.amount} ${tx.currency} -> ${tx.toAccountId}`,
      });
      return "failed";
    }
    return "paid";
  },
};
