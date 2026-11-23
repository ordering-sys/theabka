/** Server only: payment provider registry. Never import from client code. */
import { bakongAdapter } from "./bakong";
import { sandboxAdapter } from "./sandbox";
import type { PaymentAdapter, ProviderId } from "./types";

export * from "./types";

/**
 * Bakong KHQR is the only real provider for now. The sandbox (fake payments)
 * exists for local development and is never used in production.
 */
const adapters: Record<ProviderId, PaymentAdapter> = {
  bakong: bakongAdapter,
  sandbox: sandboxAdapter,
};

function isProduction() {
  return process.env.VERCEL_ENV === "production" || (process.env.NODE_ENV === "production" && !process.env.VERCEL_ENV);
}

/**
 * The provider for new charges, or a specific one (e.g. the provider stored on
 * an existing payment). New charges use Bakong unless PAYMENT_PROVIDER=sandbox
 * outside production. The sandbox is always refused in production, so a
 * misconfigured deploy can't publish invitations for free.
 */
export function getPaymentAdapter(id?: string): PaymentAdapter {
  const chosen = id ?? (process.env.PAYMENT_PROVIDER?.trim() || "bakong");
  const adapter = adapters[chosen as ProviderId];
  if (!adapter) throw new Error(`Unsupported payment provider "${chosen}" (use bakong, or sandbox in development)`);
  if (adapter.id === "sandbox" && isProduction()) {
    throw new Error("Sandbox payments are disabled in production. Set PAYMENT_PROVIDER=bakong.");
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
