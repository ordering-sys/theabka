/**
 * Server only: builds a dynamic KHQR (NBC's EMVCo-based QR standard) string,
 * the same format the official "bakong-khqr" SDK produces. Any KHQR app
 * (ABA, ACLEDA, Wing, Bakong, ...) can scan it and pay the exact amount.
 *
 * Layout: each field is <2-digit tag><2-digit length><value>; the string ends
 * with tag 63, a CRC-16/CCITT-FALSE checksum over everything before it
 * (including "6304").
 */
import { createHash } from "node:crypto";
import { toMajorString } from "./parse";
import type { PaymentCurrency } from "./types";

export type KhqrInput = {
  /** Bakong account ID, e.g. "theabka@aclb". */
  accountId: string;
  /** Set for a merchant account (KHQR tag 30); omit for an individual account (tag 29). */
  merchantId?: string;
  acquiringBank?: string;
  merchantName: string;
  merchantCity: string;
  /** Minor units: USD cents or whole riel. */
  amount: number;
  currency: PaymentCurrency;
  /** Bill number shown in the payer's banking app (our payment reference). */
  billNumber: string;
  expiresAt: Date;
  createdAt?: Date;
};

const CURRENCY_CODE: Record<PaymentCurrency, string> = { USD: "840", KHR: "116" };

function field(tag: string, value: string): string {
  if (value.length > 99) throw new Error(`KHQR tag ${tag} is too long`);
  return `${tag}${String(value.length).padStart(2, "0")}${value}`;
}

/** KHQR text fields must be plain ASCII; trim to the spec's maximum length. */
function ascii(value: string, max: number): string {
  return value.normalize("NFKD").replace(/[^\x20-\x7E]/g, "").trim().slice(0, max);
}

/** CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF), as 4 upper-case hex digits. */
export function crc16(data: string): string {
  let crc = 0xffff;
  for (const byte of Buffer.from(data, "utf8")) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function buildKhqr(input: KhqrInput): string {
  const bank = input.acquiringBank ? field("02", ascii(input.acquiringBank, 32)) : "";
  const account = input.merchantId
    ? field("30", field("00", input.accountId) + field("01", ascii(input.merchantId, 32)) + bank)
    : field("29", field("00", input.accountId) + bank);
  const created = (input.createdAt ?? new Date()).getTime();

  const body = [
    field("00", "01"), // payload format indicator
    field("01", "12"), // dynamic QR: one payment of a fixed amount
    account,
    field("52", "5999"), // merchant category code
    field("53", CURRENCY_CODE[input.currency]),
    field("54", toMajorString(input.amount, input.currency)),
    field("58", "KH"),
    field("59", ascii(input.merchantName, 25) || "TheabKa"),
    field("60", ascii(input.merchantCity, 15) || "Phnom Penh"),
    field("62", field("01", ascii(input.billNumber, 25))),
    // Creation and expiry (ms since epoch); KHQR apps refuse a dynamic code after it expires.
    field("99", field("00", String(created)) + field("01", String(input.expiresAt.getTime()))),
  ].join("");

  const withCrcTag = `${body}6304`;
  return withCrcTag + crc16(withCrcTag);
}

/** Bakong identifies a KHQR by the md5 of its full string (used to check payment). */
export function khqrMd5(qr: string): string {
  return createHash("md5").update(qr, "utf8").digest("hex");
}
