"use client";

/**
 * The one data API the UI uses. Supabase (`lib/data`) when its env vars are
 * set, otherwise the localStorage prototype (`lib/mock-store`). Every function
 * is async so both backends share call sites.
 */
import * as real from "@/lib/data";
import * as auth from "@/lib/auth/client";
import { prepareImage, MAX_UPLOAD_BYTES } from "@/lib/image";
import { rsvps as sampleRsvps, sampleInvitation, sampleViewCount } from "@/lib/mock-data";
import * as mock from "@/lib/mock-store";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { Draft, KhqrCharge, Photo, PaymentStatusResult, Rsvp, Session, UploadResult } from "@/lib/data/types";

export type { Draft, KhqrCharge, PaymentStatusResult, Rsvp, Session };
export type { UploadError } from "@/lib/data/types";

/** True when the app talks to Supabase. */
export const USE_SUPABASE = isSupabaseConfigured();

const newId = (p: string) => `${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

// ── Session ──────────────────────────────────────────────────────────────

export async function getSession(): Promise<Session | null> {
  return USE_SUPABASE ? real.getSession() : mock.getSessionMock();
}

/** Call `cb` whenever the user signs in or out. Returns an unsubscribe function. */
export function onSessionChange(cb: () => void): () => void {
  if (USE_SUPABASE) return auth.onAuthChange(() => cb());
  const handler = () => cb();
  window.addEventListener("storage", handler);
  window.addEventListener("theabka:session", handler);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener("theabka:session", handler);
  };
}

export async function signOut() {
  if (USE_SUPABASE) await auth.signOut();
  else mock.signOutMock();
}

// ── Invitations ──────────────────────────────────────────────────────────

export async function getDraft(id: string): Promise<Draft | undefined> {
  return USE_SUPABASE ? real.getDraft(id) : mock.getDraftMock(id);
}

export async function saveDraft(draft: Draft): Promise<boolean> {
  if (!USE_SUPABASE) return mock.saveDraftMock(draft);
  const ok = await real.saveDraft(draft);
  // Edits to a live invitation are free and should reach guests right away.
  if (ok && draft.status === "live") {
    const { refreshPublishedInvitation } = await import("@/lib/data/actions");
    void refreshPublishedInvitation(draft.id).catch(() => {});
  }
  return ok;
}

export async function createDraft(templateId: string): Promise<Draft> {
  return USE_SUPABASE ? real.createDraft(templateId) : mock.createDraftMock(templateId);
}

export async function changeTemplate(id: string, templateId: string): Promise<Draft | undefined> {
  if (!USE_SUPABASE) return mock.changeTemplateMock(id, templateId);
  const draft = await real.getDraft(id);
  if (!draft) return undefined;
  const next = { ...draft, templateId };
  return (await real.saveDraft(next)) ? next : undefined;
}

export async function listInvitations(userId: string): Promise<Draft[]> {
  return USE_SUPABASE ? real.listInvitations(userId) : mock.listInvitationsMock(userId);
}

// ── Guests ───────────────────────────────────────────────────────────────

export async function getRsvps(invitationId: string): Promise<Rsvp[]> {
  if (USE_SUPABASE) return real.getRsvps(invitationId);
  return [...sampleRsvps.filter((r) => r.invitationId === invitationId), ...mock.getRsvpsMock(invitationId)];
}

/** Throws if the reply couldn't be saved. */
export async function addRsvp(rsvp: Omit<Rsvp, "id" | "createdAt">): Promise<Rsvp> {
  return USE_SUPABASE ? real.addRsvp(rsvp) : mock.addRsvpMock(rsvp);
}

export async function addView(invitationId: string): Promise<void> {
  if (USE_SUPABASE) return real.addView(invitationId).catch(() => {});
  mock.addViewMock(invitationId);
}

export async function getViewCount(invitationId: string): Promise<number> {
  if (USE_SUPABASE) return real.getViewCount(invitationId);
  return (invitationId === sampleInvitation.id ? sampleViewCount : 0) + mock.getViewCountMock(invitationId);
}

// ── Uploads ──────────────────────────────────────────────────────────────

export async function uploadPhoto(invitationId: string, file: File, position: number): Promise<UploadResult<{ photo: Photo }>> {
  if (USE_SUPABASE) return real.uploadPhoto(invitationId, file, position);
  const r = await prepareImage(file);
  if ("error" in r) return { ok: false, error: r.error };
  return { ok: true, photo: { id: newId("photo"), invitationId, url: r.url, position } };
}

export async function uploadGiftQr(invitationId: string, file: File): Promise<UploadResult<{ url: string }>> {
  if (USE_SUPABASE) return real.uploadGiftQr(invitationId, file);
  const r = await prepareImage(file, 600);
  return "error" in r ? { ok: false, error: r.error } : { ok: true, url: r.url };
}

export async function uploadMusic(invitationId: string, file: File): Promise<UploadResult<{ name: string; musicUrl: string }>> {
  if (USE_SUPABASE) return real.uploadMusic(invitationId, file);
  if (!file.type.startsWith("audio/")) return { ok: false, error: "type" };
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, error: "size" };
  return { ok: true, name: file.name, musicUrl: `custom:${file.name}` };
}

// ── Payments ─────────────────────────────────────────────────────────────

const mockCharges = new Map<string, { invitationId: string; createdAt: number; expiresAt: number }>();

export async function startPayment(invitationId: string, amountUsdCents: number, amountKhr: number): Promise<KhqrCharge> {
  if (USE_SUPABASE) return real.startKhqrPayment(invitationId, "USD");
  const paymentId = newId("pay");
  const expiresAt = Date.now() + 10 * 60_000;
  mockCharges.set(paymentId, { invitationId, createdAt: Date.now(), expiresAt });
  return {
    paymentId,
    qrPayload: `SANDBOX-KHQR|${paymentId}|${amountUsdCents}|USD`,
    currency: "USD",
    amountUsdCents,
    amountKhr,
    expiresAt: new Date(expiresAt).toISOString(),
    sandbox: true,
  };
}

/** Prototype: a charge counts as paid 3 s after it starts (same as the server sandbox). */
export async function getPaymentStatus(paymentId: string): Promise<PaymentStatusResult> {
  if (USE_SUPABASE) return real.getPaymentStatus(paymentId);
  const charge = mockCharges.get(paymentId);
  const base = { paymentId, invitationId: charge?.invitationId ?? null, expiresAt: new Date(charge?.expiresAt ?? 0).toISOString() };
  if (!charge || Date.now() > charge.expiresAt) return { ...base, status: "expired", slug: null, live: false };
  if (Date.now() - charge.createdAt < 3000) return { ...base, status: "pending", slug: null, live: false };
  const live = mock.publishMock(charge.invitationId);
  return { ...base, status: "paid", slug: live?.slug ?? null, live: true };
}
