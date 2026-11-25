"use client";

/**
 * The one data API the UI uses, backed by Supabase (`lib/data`, `lib/auth`,
 * `app/api/payments`). Components import from here, never from `lib/data`
 * directly. NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be
 * set; without them the Supabase client throws a clear configuration error.
 */
import * as real from "@/lib/data";
import * as auth from "@/lib/auth/client";
import type {
  Draft,
  GiftEntry,
  InvitationGuest,
  KhqrCharge,
  NewGiftEntry,
  NewInvitationGuest,
  Photo,
  PaymentStatusResult,
  Rsvp,
  Session,
  UploadResult,
} from "@/lib/data/types";

export type { Draft, GiftEntry, InvitationGuest, KhqrCharge, NewGiftEntry, NewInvitationGuest, PaymentStatusResult, Rsvp, Session };
export type { UploadError } from "@/lib/data/types";

// ── Session ──────────────────────────────────────────────────────────────

export async function getSession(): Promise<Session | null> {
  return real.getSession();
}

/** Call `cb` whenever the user signs in or out. Returns an unsubscribe function. */
export function onSessionChange(cb: () => void): () => void {
  return auth.onAuthChange(() => cb());
}

export async function signOut() {
  await auth.signOut();
}

// ── Invitations ──────────────────────────────────────────────────────────

export async function getDraft(id: string): Promise<Draft | undefined> {
  return real.getDraft(id);
}

export async function saveDraft(draft: Draft): Promise<boolean> {
  const ok = await real.saveDraft(draft);
  // Edits to a live invitation are free and should reach guests right away.
  if (ok && draft.status === "live") {
    const { refreshPublishedInvitation } = await import("@/lib/data/actions");
    void refreshPublishedInvitation(draft.id).catch(() => {});
  }
  return ok;
}

export async function createDraft(templateId: string): Promise<Draft> {
  return real.createDraft(templateId);
}

export async function changeTemplate(id: string, templateId: string): Promise<Draft | undefined> {
  const draft = await real.getDraft(id);
  if (!draft) return undefined;
  const next = { ...draft, templateId };
  return (await real.saveDraft(next)) ? next : undefined;
}

export async function listInvitations(userId: string): Promise<Draft[]> {
  return real.listInvitations(userId);
}

// ── Guests ───────────────────────────────────────────────────────────────

export async function getRsvps(invitationId: string): Promise<Rsvp[]> {
  return real.getRsvps(invitationId);
}

/** Throws if the reply couldn't be saved. */
export async function addRsvp(rsvp: Omit<Rsvp, "id" | "createdAt">): Promise<Rsvp> {
  return real.addRsvp(rsvp);
}

export async function addView(invitationId: string): Promise<void> {
  return real.addView(invitationId).catch(() => {});
}

export async function getViewCount(invitationId: string): Promise<number> {
  return real.getViewCount(invitationId);
}

// ── Personal invitation guests (Premium) ─────────────────────────────────

export async function listGuests(invitationId: string): Promise<InvitationGuest[]> {
  return real.listGuests(invitationId);
}

/** Throws "guests_require_premium", "guest_limit_reached" or "invitation_ended". */
export async function addGuests(invitationId: string, guests: NewInvitationGuest[]): Promise<InvitationGuest[]> {
  return real.addGuests(invitationId, guests);
}

/** Same link, new greeting: refresh the cached guest pages so it shows right away. */
export async function updateGuest(invitationId: string, guestId: string, fields: NewInvitationGuest): Promise<InvitationGuest> {
  const updated = await real.updateGuest(guestId, fields);
  const { refreshPublishedInvitation } = await import("@/lib/data/actions");
  void refreshPublishedInvitation(invitationId).catch(() => {});
  return updated;
}

/** Their link then shows the general invitation; refresh the cached guest pages. */
export async function deleteGuest(invitationId: string, guestId: string): Promise<boolean> {
  const ok = await real.deleteGuest(guestId);
  if (ok) {
    const { refreshPublishedInvitation } = await import("@/lib/data/actions");
    void refreshPublishedInvitation(invitationId).catch(() => {});
  }
  return ok;
}

export async function markGuestSent(guestId: string): Promise<void> {
  return real.markGuestSent(guestId).catch(() => {});
}

export async function markGuestOpened(slug: string, code: string): Promise<void> {
  return real.markGuestOpened(slug, code).catch(() => {});
}

// ── Gift ledger (Premium) ────────────────────────────────────────────────
// Host only and never shown to guests, so no guest cache to refresh.

/** Throws if the ledger couldn't be loaded, so the UI can tell "empty" from "failed". */
export async function listGiftEntries(invitationId: string): Promise<GiftEntry[]> {
  return real.listGiftEntries(invitationId);
}

/** Throws "gift_ledger_requires_premium", "invitation_ended", "gift_limit_reached" or "invalid_guest". */
export async function addGiftEntry(invitationId: string, entry: NewGiftEntry): Promise<GiftEntry> {
  return real.addGiftEntry(invitationId, entry);
}

export async function updateGiftEntry(entryId: string, entry: NewGiftEntry): Promise<GiftEntry> {
  return real.updateGiftEntry(entryId, entry);
}

export async function deleteGiftEntry(entryId: string): Promise<boolean> {
  return real.deleteGiftEntry(entryId);
}

// ── Uploads ──────────────────────────────────────────────────────────────

export async function uploadPhoto(invitationId: string, file: File, position: number): Promise<UploadResult<{ photo: Photo }>> {
  return real.uploadPhoto(invitationId, file, position);
}

export async function uploadGiftQr(invitationId: string, file: File): Promise<UploadResult<{ url: string }>> {
  return real.uploadGiftQr(invitationId, file);
}

export async function uploadMusic(invitationId: string, file: File): Promise<UploadResult<{ name: string; musicUrl: string }>> {
  return real.uploadMusic(invitationId, file);
}

// ── Payments ─────────────────────────────────────────────────────────────

/** The server computes the amount from the plan; the client never sends a price. */
/** `upgrade`: a live Basic invitation pays the difference to become Premium. */
export async function startPayment(invitationId: string, { upgrade = false } = {}): Promise<KhqrCharge> {
  return real.startKhqrPayment(invitationId, "USD", upgrade);
}

export async function getPaymentStatus(paymentId: string): Promise<PaymentStatusResult> {
  return real.getPaymentStatus(paymentId);
}
