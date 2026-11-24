/**
 * Data retention rules. Pure, safe on client and server.
 * The database enforces the same rules (supabase/migrations/20261124090000_data_retention.sql);
 * keep the two in sync, and keep the privacy policy (modules/legal/content.ts) in sync with both.
 */
import { PLANS, type Tier } from "@/lib/mock-data";

/** Days between an invitation going offline and its content being deleted. */
export const PURGE_GRACE_DAYS = 30;
/** Unpaid drafts not edited for this many months are deleted. */
export const DRAFT_IDLE_MONTHS = 3;
/** Expired/pending payments are deleted, and raw provider data cleared, after this many days. */
export const PAYMENT_DETAIL_DAYS = 30;
/** The online period counts from the event date, but never from later than this many months after publishing. */
const MAX_EVENT_OFFSET_MONTHS = 12;

const TZ = "Asia/Phnom_Penh";

/** Today in Cambodia as YYYY-MM-DD. */
export function khmerToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** Add calendar months to a YYYY-MM-DD date, clamping to the month's last day (like Postgres). */
export function addMonths(isoDate: string, months: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  first.setUTCDate(Math.min(d, lastDay));
  return first.toISOString().slice(0, 10);
}

/** Add days to a YYYY-MM-DD date. */
export function addDays(isoDate: string, days: number): string {
  const t = new Date(`${isoDate}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + days);
  return t.toISOString().slice(0, 10);
}

/**
 * Last day (inclusive, YYYY-MM-DD) a live invitation is online, or null for drafts.
 * Mirrors public.online_until() in SQL.
 */
export function onlineUntil(inv: { eventDate: string; publishedAt: string | null; paidTier: Tier | null }): string | null {
  if (!inv.publishedAt || !inv.paidTier) return null;
  const published = khmerToday(new Date(inv.publishedAt));
  const cap = addMonths(published, MAX_EVENT_OFFSET_MONTHS);
  const base = inv.eventDate ? (inv.eventDate < cap ? inv.eventDate : cap) : published;
  return addMonths(base, PLANS[inv.paidTier].onlineMonths);
}

/** Day the content of an ended invitation is deleted. */
export function purgeOn(until: string): string {
  return addDays(until, PURGE_GRACE_DAYS + 1);
}

/** Day an untouched draft is deleted. */
export function draftDeleteOn(updatedAt: string): string {
  return addMonths(khmerToday(new Date(updatedAt)), DRAFT_IDLE_MONTHS);
}

export type RetentionState =
  | { kind: "draft"; deleteOn: string }
  | { kind: "online"; until: string }
  | { kind: "ended"; until: string; purgeOn: string }
  | { kind: "purged" };

export function retentionState(
  inv: { status: "draft" | "live"; eventDate: string; publishedAt: string | null; paidTier: Tier | null; updatedAt: string; purgedAt: string | null },
  today = khmerToday(),
): RetentionState {
  if (inv.purgedAt) return { kind: "purged" };
  if (inv.status === "draft") return { kind: "draft", deleteOn: draftDeleteOn(inv.updatedAt) };
  const until = onlineUntil(inv);
  if (!until) return { kind: "draft", deleteOn: draftDeleteOn(inv.updatedAt) };
  return today <= until ? { kind: "online", until } : { kind: "ended", until, purgeOn: purgeOn(until) };
}
