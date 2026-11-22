/** Server only: payment provider registry. Never import from client code. */
import { abaPaywayAdapter } from "./aba-payway";
import { bakongAdapter } from "./bakong";
import { sandboxAdapter } from "./sandbox";
import type { PaymentAdapter, ProviderId } from "./types";

export * from "./types";

const adapters: Record<ProviderId, PaymentAdapter> = {
  aba_payway: abaPaywayAdapter,
  bakong: bakongAdapter,
  sandbox: sandboxAdapter,
};

function isProduction() {
  return process.env.VERCEL_ENV === "production" || (process.env.NODE_ENV === "production" && !process.env.VERCEL_ENV);
}

/**
 * The provider for new charges, from PAYMENT_PROVIDER (default "sandbox"), or
 * a specific one (e.g. the provider stored on an existing payment).
 * The sandbox is refused in production unless ALLOW_SANDBOX_PAYMENTS=true, so
 * a misconfigured deploy can't publish invitations for free.
 */
export function getPaymentAdapter(id?: ProviderId): PaymentAdapter {
  const chosen = id ?? ((process.env.PAYMENT_PROVIDER as ProviderId | undefined) || "sandbox");
  const adapter = adapters[chosen];
  if (!adapter) throw new Error(`Unknown PAYMENT_PROVIDER "${chosen}"`);
  if (adapter.id === "sandbox" && isProduction() && process.env.ALLOW_SANDBOX_PAYMENTS !== "true") {
    throw new Error("Sandbox payments are disabled in production. Set PAYMENT_PROVIDER to aba_payway or bakong.");
  }
  return adapter;
}

/** KHQR lifetime: 10 minutes. */
export const KHQR_TTL_MS = 10 * 60 * 1000;

/** Merchant reference: "TK" + base36 time + random, max 20 chars, [A-Z0-9]. */
export function newPaymentReference(): string {
  const time = Date.now().toString(36).toUpperCase();
  const rand = Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => (b % 36).toString(36))
    .join("")
    .toUpperCase();
  return `TK${time}${rand}`.slice(0, 20);
}
