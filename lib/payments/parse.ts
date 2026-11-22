import type { PaymentCurrency, ProviderPaymentState } from "./types";

export function parseJson(raw: string): Record<string, unknown> {
  try {
    const v = JSON.parse(raw);
    return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
  } catch {
    // Some providers post application/x-www-form-urlencoded.
    return Object.fromEntries(new URLSearchParams(raw));
  }
}

export function toCurrency(v: unknown): PaymentCurrency {
  return String(v).toUpperCase() === "KHR" ? "KHR" : "USD";
}

/** "5.00" USD -> 500 cents; "20000" KHR -> 20000 riel. */
export function toMinorUnits(v: unknown, currency: PaymentCurrency): number {
  const n = typeof v === "number" ? v : Number.parseFloat(String(v));
  if (!Number.isFinite(n)) return Number.NaN;
  return currency === "USD" ? Math.round(n * 100) : Math.round(n);
}

/** 500 cents -> "5.00"; 20000 riel -> "20000". */
export function toMajorString(amount: number, currency: PaymentCurrency): string {
  return currency === "USD" ? (amount / 100).toFixed(2) : String(Math.round(amount));
}

export function toState(v: unknown): ProviderPaymentState {
  const s = String(v).toLowerCase();
  if (["paid", "success", "succeeded", "approved", "completed"].includes(s)) return "paid";
  if (["failed", "declined", "cancelled", "canceled", "expired"].includes(s)) return "failed";
  return "pending";
}
