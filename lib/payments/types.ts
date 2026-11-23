export type PaymentCurrency = "USD" | "KHR";
/** Providers the app can use. The database enum also has "aba_payway", reserved for later. */
export type ProviderId = "bakong" | "sandbox";

/**
 * Amounts are integers in the smallest unit we store: USD cents, whole riel.
 * Adapters convert to whatever the provider expects (e.g. "5.00").
 */
export type CreateChargeInput = {
  /** Our merchant reference (<= 20 chars, [A-Z0-9]). Used as provider_ref unless the provider issues its own. */
  reference: string;
  amount: number;
  currency: PaymentCurrency;
  description: string;
  expiresAt: Date;
  /** Absolute URL of app/api/payments/webhook. */
  callbackUrl: string;
};

export type CreateChargeResult = {
  /** Stored in payments.provider_ref (unique); webhooks are matched and de-duplicated on it. */
  providerRef: string;
  /** The KHQR (EMVCo) string to render as a QR code. */
  qrPayload: string;
  expiresAt: Date;
  /** Name encoded in the QR, which the payer's banking app shows; the pay sheet shows the same. */
  merchantName?: string;
};

export type ProviderPaymentState = "paid" | "pending" | "failed";

export type WebhookEvent = {
  providerRef: string;
  state: ProviderPaymentState;
  amount: number;
  currency: PaymentCurrency;
  raw: unknown;
};

export type StatusCheckContext = { amount: number; currency: PaymentCurrency; createdAt: Date };

export interface PaymentAdapter {
  readonly id: ProviderId;
  createCharge(input: CreateChargeInput): Promise<CreateChargeResult>;
  /** Verify the signature and parse the body. Throws InvalidSignatureError if it doesn't verify. */
  parseWebhook(rawBody: string, headers: Headers): Promise<WebhookEvent>;
  /** Optional server-to-server status check (used by the status poller, and to confirm webhooks). */
  checkStatus?(providerRef: string, ctx: StatusCheckContext): Promise<ProviderPaymentState>;
}

export class InvalidSignatureError extends Error {
  constructor(message = "invalid_signature") {
    super(message);
    this.name = "InvalidSignatureError";
  }
}

export class ProviderNotConfiguredError extends Error {
  constructor(provider: ProviderId, detail: string) {
    super(`${provider}: ${detail}`);
    this.name = "ProviderNotConfiguredError";
  }
}
