"use client";

/**
 * Browser-only mock backend for the prototype phase. Supabase replaces this
 * in Phase 7; keep the function signatures close to what real calls will need.
 */
import { getPhotos, invitations, sampleInvitation, type Invitation, type Photo, type Rsvp } from "./mock-data";

const SESSION_KEY = "theabka.session";
const DRAFTS_KEY = "theabka.drafts";

export type MockSession = { userId: string; email?: string; provider: "email" | "google" };

export function signInMock(session: MockSession) {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  window.dispatchEvent(new Event("theabka:session"));
}

export function signOutMock() {
  window.localStorage.removeItem(SESSION_KEY);
}

export function getSessionMock(): MockSession | null {
  try {
    return JSON.parse(window.localStorage.getItem(SESSION_KEY) ?? "null");
  } catch {
    return null;
  }
}

/**
 * What the editor works on: the invitation row plus its photos and the
 * uploaded song's file name (the real app stores the file in Supabase Storage).
 */
export type Draft = Invitation & { photos: Photo[]; customMusicName: string | null };

function readDrafts(): Draft[] {
  try {
    return JSON.parse(window.localStorage.getItem(DRAFTS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function toDraft(inv: Invitation): Draft {
  return { ...inv, photos: getPhotos(inv.id), customMusicName: null };
}

/** A saved draft, or one of the built-in sample invitations the first time it's edited. */
export function getDraftMock(id: string): Draft | undefined {
  const saved = readDrafts().find((d) => d.id === id);
  if (saved) return saved;
  const sample = invitations.find((inv) => inv.id === id);
  return sample ? toDraft(sample) : undefined;
}

/** Upsert. Returns false if the browser refused (storage full). */
export function saveDraftMock(draft: Draft): boolean {
  const all = readDrafts();
  const stored = all.find((d) => d.id === draft.id) ?? invitations.find((inv) => inv.id === draft.id);
  const others = all.filter((d) => d.id !== draft.id);
  // Publishing only happens through payment: never let a save move live → draft.
  const keepLive = stored?.status === "live" ? { status: "live" as const, publishedAt: stored.publishedAt } : {};
  try {
    window.localStorage.setItem(DRAFTS_KEY, JSON.stringify([...others, { ...draft, ...keepLive, updatedAt: new Date().toISOString() }]));
    return true;
  } catch {
    return false;
  }
}

/** All of a user's invitations: built-in samples (with any local edits) plus their own drafts. */
export function listInvitationsMock(userId: string): Draft[] {
  const saved = readDrafts();
  const samples = invitations
    .filter((inv) => inv.userId === userId)
    .map((inv) => saved.find((d) => d.id === inv.id) ?? toDraft(inv));
  const own = saved.filter((d) => d.userId === userId && !invitations.some((inv) => inv.id === d.id));
  return [...samples, ...own].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** A published invitation by its public slug, from this browser's drafts (prototype only). */
export function getLocalPublishedBySlug(slug: string): Draft | undefined {
  return readDrafts().find((d) => d.slug === slug && d.status === "live");
}

/** What the KHQR webhook will do in Phase 7: record the payment and set the invitation live. */
export function publishMock(id: string): Draft | undefined {
  const draft = getDraftMock(id);
  if (!draft) return undefined;
  const live: Draft = { ...draft, status: "live", publishedAt: draft.publishedAt ?? new Date().toISOString() };
  saveDraftMock(live);
  return live;
}

const VIEWS_KEY = "theabka.views";

/** Count an invitation open (the dashboard's "Opened" tile). */
export function addViewMock(invitationId: string) {
  try {
    const views: Record<string, number> = JSON.parse(window.localStorage.getItem(VIEWS_KEY) ?? "{}");
    views[invitationId] = (views[invitationId] ?? 0) + 1;
    window.localStorage.setItem(VIEWS_KEY, JSON.stringify(views));
  } catch {
    // Not critical.
  }
}

export function getViewCountMock(invitationId: string): number {
  try {
    return JSON.parse(window.localStorage.getItem(VIEWS_KEY) ?? "{}")[invitationId] ?? 0;
  } catch {
    return 0;
  }
}

const RSVPS_KEY = "theabka.rsvps";

/** RSVPs guests sent from this browser (the sample list lives in mock-data). */
export function getRsvpsMock(invitationId: string): Rsvp[] {
  try {
    const all: Rsvp[] = JSON.parse(window.localStorage.getItem(RSVPS_KEY) ?? "[]");
    return all.filter((r) => r.invitationId === invitationId);
  } catch {
    return [];
  }
}

export function addRsvpMock(rsvp: Omit<Rsvp, "id" | "createdAt">): Rsvp {
  const saved: Rsvp = { ...rsvp, id: `rsvp_${Date.now().toString(36)}`, createdAt: new Date().toISOString().slice(0, 10) };
  try {
    const all: Rsvp[] = JSON.parse(window.localStorage.getItem(RSVPS_KEY) ?? "[]");
    window.localStorage.setItem(RSVPS_KEY, JSON.stringify([...all, saved]));
  } catch {
    // Storage full or blocked: the guest still sees the thank-you state.
  }
  return saved;
}

export function changeTemplateMock(id: string, templateId: string): Draft | undefined {
  const draft = getDraftMock(id);
  if (!draft) return undefined;
  const next = { ...draft, templateId };
  saveDraftMock(next);
  return next;
}

/** New draft from a template, pre-filled with the sample couple so the editor has content. */
export function createDraftMock(templateId: string): Draft {
  const now = new Date().toISOString();
  const id = `draft_${Date.now().toString(36)}`;
  const draft: Draft = {
    ...toDraft(sampleInvitation),
    id,
    userId: getSessionMock()?.userId ?? sampleInvitation.userId,
    templateId,
    slug: id,
    status: "draft",
    publishedAt: null,
    createdAt: now,
    updatedAt: now,
  };
  saveDraftMock(draft);
  return draft;
}
