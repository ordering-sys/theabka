/**
 * What an invitation must have before it can be paid for and published: every
 * field in the editor except the parents' names, which are optional (a parent
 * may have passed away, or the couple may leave them out). Guests always see
 * both languages, so text is needed in Khmer and English.
 *
 * Shared by the editor (stepper warnings, Publish lock), the pay screen (to
 * explain what's missing) and the payment API (so an incomplete invitation
 * can't be charged). Pure, safe on client and server.
 */
export type MissingDetail =
  | "names"
  | "date"
  | "time"
  | "venue"
  | "address"
  | "schedule"
  | "photos"
  | "music"
  | "gift"
  | "giftNote";

/** Editor step (0-based, see SECTIONS in modules/editor/components/Editor.tsx) where each detail is filled in. */
export const DETAIL_STEP: Record<MissingDetail, number> = {
  names: 0,
  date: 1,
  time: 1,
  venue: 2,
  address: 2,
  schedule: 3,
  photos: 4,
  music: 5,
  gift: 6,
  giftNote: 6,
};

export type Checkable = {
  groomKm: string;
  groomEn: string;
  brideKm: string;
  brideEn: string;
  eventDate: string | null;
  startTime: string | null;
  venueNameKm: string;
  venueNameEn: string;
  venueAddressKm: string;
  venueAddressEn: string;
  schedule: { time: string; titleKm: string; titleEn: string }[];
  photoCount: number;
  musicUrl: string | null;
  giftQrUrl: string | null;
  giftNoteKm: string | null;
  giftNoteEn: string | null;
};

const filled = (s: string | null | undefined) => Boolean(s?.trim());
const allFilled = (...values: (string | null | undefined)[]) => values.every(filled);

/** In editor order, so the first item is the earliest step to fix. */
export function missingDetails(inv: Checkable): MissingDetail[] {
  const missing: MissingDetail[] = [];
  if (!allFilled(inv.groomKm, inv.groomEn, inv.brideKm, inv.brideEn)) missing.push("names");
  if (!filled(inv.eventDate)) missing.push("date");
  if (!filled(inv.startTime)) missing.push("time");
  if (!allFilled(inv.venueNameKm, inv.venueNameEn)) missing.push("venue");
  if (!allFilled(inv.venueAddressKm, inv.venueAddressEn)) missing.push("address");
  if (!inv.schedule.length || !inv.schedule.every((ev) => allFilled(ev.time, ev.titleKm, ev.titleEn))) missing.push("schedule");
  if (inv.photoCount < 1) missing.push("photos");
  if (!filled(inv.musicUrl)) missing.push("music");
  if (!filled(inv.giftQrUrl)) missing.push("gift");
  if (!allFilled(inv.giftNoteKm, inv.giftNoteEn)) missing.push("giftNote");
  return missing;
}

/** The checkable view of a client-side draft (photos are loaded with it). */
export function draftCheckable<T extends Omit<Checkable, "photoCount"> & { photos: unknown[] }>(draft: T): Checkable {
  return { ...draft, photoCount: draft.photos.length };
}
