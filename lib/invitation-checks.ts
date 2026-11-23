/**
 * What an invitation must have before it can be paid for and published.
 * Shared by the pay screen (to explain what's missing) and the payment API
 * (so an incomplete invitation can't be charged).
 */
export type MissingDetail = "names" | "date" | "venue";

/** Editor step (0-based, see SECTIONS in components/editor/Editor.tsx) where each detail is filled in. */
export const DETAIL_STEP: Record<MissingDetail, number> = { names: 0, date: 1, venue: 2 };

type Checkable = {
  groomKm: string;
  groomEn: string;
  brideKm: string;
  brideEn: string;
  eventDate: string | null;
  venueNameKm: string;
  venueNameEn: string;
};

const filled = (s: string | null | undefined) => Boolean(s?.trim());

export function missingDetails(inv: Checkable): MissingDetail[] {
  const missing: MissingDetail[] = [];
  // Guests always see both languages, so all four names are needed.
  if (![inv.groomKm, inv.groomEn, inv.brideKm, inv.brideEn].every(filled)) missing.push("names");
  if (!filled(inv.eventDate)) missing.push("date");
  if (!filled(inv.venueNameKm) && !filled(inv.venueNameEn)) missing.push("venue");
  return missing;
}
