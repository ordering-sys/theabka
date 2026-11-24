/**
 * Shapes the UI uses (base types from lib/mock-data), re-exported
 * here so components and the data layer share one definition.
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

/**
 * The invitation row plus its photos and the uploaded song's name.
 * `paidTier` and `purgedAt` drive retention (modules/retention/lib/policy.ts);
 * both are null on the guest page.
 */
export type Draft = Invitation & {
  photos: Photo[];
  customMusicName: string | null;
  paidTier: Tier | null;
  purgedAt: string | null;
};

/** A guest the host invited by name (Premium). Their link is /i/<slug>/<code>. */
export type InvitationGuest = {
  id: string;
  invitationId: string;
  title: "" | "mr" | "mrs" | "miss" | "he" | "lok_chumteav" | "teacher_m" | "teacher_f";
  nameKm: string;
  nameEn: string;
  companion: "" | "family" | "partner" | "wife" | "husband" | "friend";
  code: string;
  sentAt: string | null;
  openedAt: string | null;
};

export type NewInvitationGuest = Pick<InvitationGuest, "title" | "nameKm" | "nameEn" | "companion">;

/** `name` comes from the Google profile; email sign-ins have none. */
export type Session = { userId: string; email?: string; name?: string; provider: "email" | "google" };

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
  /** Who receives the money, as the payer's banking app will show it. */
  merchantName: string;
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
