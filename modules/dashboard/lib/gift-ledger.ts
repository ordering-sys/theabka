/**
 * Gift ledger helpers (Premium). Pure, safe on client and server.
 * Shown as a gift book (សៀវភៅចំណងដៃ) at /app/[id]/gifts; the dashboard's Gifts tab is a summary.
 * Amounts: riel for KHR, US cents for USD. Riel and dollars are never converted or added together.
 */
import type { Lang } from "@/lib/dictionary";
import { formatNumber } from "@/lib/khmer";
import { PLANS } from "@/lib/mock-data";
import type { Draft, GiftEntry } from "@/lib/store";
import { guestNameEn, guestNameKm } from "@/modules/guest/lib/greeting";
import { purgeOn, retentionState } from "@/modules/retention/lib/policy";

export type GiftLedgerAccess = {
  /** Premium and live (online or ended, not purged): the ledger can be read. */
  enabled: boolean;
  /** Ended: read and download only (the database refuses changes too). */
  readOnly: boolean;
  /** Basic and online: show the feature with an upgrade button instead. */
  canUpgrade: boolean;
  /** Day the ledger is deleted with the invitation (YYYY-MM-DD), for the reminder. */
  purgeOn: string | null;
};

/** Who may see and change an invitation's gift ledger. Mirrors gift_entries_guard() in SQL. */
export function giftLedgerAccess(inv: Draft): GiftLedgerAccess {
  const retention = retentionState(inv);
  const live = inv.status === "live";
  const readOnly = retention.kind === "ended";
  const enabled = live && !!inv.paidTier && PLANS[inv.paidTier].giftLedger && (retention.kind === "online" || readOnly);
  return {
    enabled,
    readOnly: enabled && readOnly,
    canUpgrade: live && inv.paidTier === "basic" && retention.kind === "online",
    purgeOn: retention.kind === "online" ? purgeOn(retention.until) : retention.kind === "ended" ? retention.purgeOn : null,
  };
}

export type GiftKind = GiftEntry["kind"];
export type GiftSide = GiftEntry["side"];
export type GiftCurrency = "KHR" | "USD";

export const GIFT_KINDS: GiftKind[] = ["cash", "transfer", "gold", "other"];

/** Cash and transfers always have an amount; gold and other may have only a description. */
export function kindNeedsAmount(kind: GiftKind): boolean {
  return kind === "cash" || kind === "transfer";
}

/** "លោក សុខ ដារ៉ា" (no companion: the ledger records who gave, not who came). */
export function giftNameKm(e: Pick<GiftEntry, "title" | "nameKm">): string {
  return guestNameKm({ ...e, companion: "" });
}

/** "Mr. Sok Dara", or the Khmer name when there's no English one. */
export function giftNameEn(e: Pick<GiftEntry, "title" | "nameKm" | "nameEn">): string {
  return guestNameEn({ ...e, companion: "" });
}

/** "៥០,០០០ ៛" / "$50" (Khmer numerals in Khmer mode). Empty when there's no amount. */
export function formatGiftAmount(e: Pick<GiftEntry, "amount" | "currency">, lang: Lang): string {
  if (e.amount === null || !e.currency) return "";
  return e.currency === "KHR" ? formatKhr(e.amount, lang) : formatUsdCents(e.amount, lang);
}

export function formatKhr(riel: number, lang: Lang): string {
  return `${formatNumber(riel, lang)} ៛`;
}

export function formatUsdCents(cents: number, lang: Lang): string {
  const dollars = cents / 100;
  const text = Number.isInteger(dollars)
    ? formatNumber(dollars, lang)
    : formatNumber(Math.floor(dollars), lang) + "." + formatNumber(cents % 100, lang).padStart(2, lang === "km" ? "០" : "0");
  return `$${text}`;
}

export type GiftTotals = {
  /** Sum of riel amounts. */
  khr: number;
  /** Sum of US dollar amounts, in cents. */
  usdCents: number;
  /** Distinct givers: the same invited guest, or the same typed name, counts once. */
  givers: number;
  /** Gold and other gifts (with or without a value). */
  items: number;
};

export function giftTotals(entries: GiftEntry[]): GiftTotals {
  let khr = 0;
  let usdCents = 0;
  let items = 0;
  const givers = new Set<string>();
  for (const e of entries) {
    if (e.amount !== null && e.currency === "KHR") khr += e.amount;
    if (e.amount !== null && e.currency === "USD") usdCents += e.amount;
    if (!kindNeedsAmount(e.kind)) items++;
    givers.add(e.invitedGuestId ?? `name:${e.title}:${normalize(e.nameKm)}`);
  }
  return { khr, usdCents, givers: givers.size, items };
}

/** Search by Khmer or English name, the description or the note. */
export function giftMatches(e: GiftEntry, query: string): boolean {
  const q = normalize(query);
  if (!q) return true;
  return [e.nameKm, e.nameEn, giftNameKm(e), e.description, e.note].some((s) => normalize(s).includes(q));
}

function normalize(s: string): string {
  return s.normalize("NFC").replace(/\s+/g, " ").trim().toLowerCase();
}

const KHMER_DIGITS = "០១២៣៤៥៦៧៨៩";

/**
 * What the host typed in the amount field, in the currency's unit (riel, or whole dollars),
 * or null. Accepts Khmer digits and thousands separators: "៥០,០០០" → 50000.
 */
export function parseAmountInput(text: string): number | null {
  const ascii = Array.from(text)
    .map((ch) => {
      const i = KHMER_DIGITS.indexOf(ch);
      return i >= 0 ? String(i) : ch;
    })
    .join("")
    .replace(/[\s,]/g, "");
  if (!/^\d{1,11}$/.test(ascii)) return null;
  const n = Number(ascii);
  return n > 0 ? n : null;
}

/** The stored amount for a typed value: riel as-is, dollars to cents. */
export function toStoredAmount(value: number, currency: GiftCurrency): number {
  return currency === "USD" ? value * 100 : value;
}

/** The value to show in the amount field when editing: riel, or whole dollars. */
export function toInputAmount(e: Pick<GiftEntry, "amount" | "currency">): string {
  if (e.amount === null || !e.currency) return "";
  return String(e.currency === "USD" ? e.amount / 100 : e.amount);
}
