/**
 * Shapes the UI already uses (from lib/mock-data and lib/mock-store), re-declared
 * here so the real data layer doesn't depend on the mock store module.
 */
import type {
  Invitation,
  MusicTrack,
  Photo,
  Rsvp,
  ScheduleItem,
  Template,
  Tier,
} from "@/lib/mock-data";

export type { Invitation, MusicTrack, Photo, Rsvp, ScheduleItem, Template, Tier };

/** Same as mock-store's Draft: the invitation row plus its photos and the uploaded song's name. */
export type Draft = Invitation & { photos: Photo[]; customMusicName: string | null };

/** Same shape as mock-store's MockSession. */
export type Session = { userId: string; email?: string; provider: "email" | "google" };

export type UploadError = "type" | "size" | "read" | "limit" | "premium" | "auth" | "network";
export type UploadResult<T> = ({ ok: true } & T) | { ok: false; error: UploadError };

export type PaymentCurrency = "USD" | "KHR";
export type PaymentStatus = "pending" | "paid" | "expired" | "refunded";

/** Returned by POST /api/payments/khqr and startKhqrPayment(). */
export type KhqrCharge = {
  paymentId: string;
  qrPayload: string;
  currency: PaymentCurrency;
  amountUsdCents: number;
  amountKhr: number;
  expiresAt: string; // ISO
  sandbox: boolean;
};

/** Returned by GET /api/payments/status and getPaymentStatus(). */
export type PaymentStatusResult = {
  paymentId: string;
  status: PaymentStatus;
  invitationId: string | null;
  slug: string | null;
  live: boolean;
  expiresAt: string;
};
