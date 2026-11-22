import type { Lang } from "./dictionary";

const KHMER_DIGITS = "០១២៣៤៥៦៧៨៩";

const KHMER_WEEKDAYS = ["អាទិត្យ", "ចន្ទ", "អង្គារ", "ពុធ", "ព្រហស្បតិ៍", "សុក្រ", "សៅរ៍"];

const KHMER_MONTHS = [
  "មករា", "កុម្ភៈ", "មីនា", "មេសា", "ឧសភា", "មិថុនា",
  "កក្កដា", "សីហា", "កញ្ញា", "តុលា", "វិច្ឆិកា", "ធ្នូ",
];

/** Replace Western digits with Khmer digits: "2026" → "២០២៦". */
export function toKhmerNumerals(value: number | string): string {
  return String(value).replace(/[0-9]/g, (d) => KHMER_DIGITS[Number(d)]);
}

/** A number in the language's numerals, with thousands separators. */
export function formatNumber(value: number, lang: Lang): string {
  const s = value.toLocaleString("en-US");
  return lang === "km" ? toKhmerNumerals(s) : s;
}

/**
 * Parse "YYYY-MM-DD" as a calendar date (no timezone shift).
 * Event dates are stored as plain dates, so we never want UTC conversion.
 */
function parts(date: string | Date) {
  if (typeof date === "string") {
    const [y, m, d] = date.split("-").map(Number);
    const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    return { y, m: m - 1, d, weekday };
  }
  return { y: date.getFullYear(), m: date.getMonth(), d: date.getDate(), weekday: date.getDay() };
}

/** "ថ្ងៃអាទិត្យ ទី១៣ ខែធ្នូ ឆ្នាំ២០២៦" */
export function formatKhmerDate(date: string | Date): string {
  const { y, m, d, weekday } = parts(date);
  return `ថ្ងៃ${KHMER_WEEKDAYS[weekday]} ទី${toKhmerNumerals(d)} ខែ${KHMER_MONTHS[m]} ឆ្នាំ${toKhmerNumerals(y)}`;
}

/** "Sunday, 13 December 2026" */
export function formatEnglishDate(date: string | Date): string {
  const { y, m, d } = parts(date);
  return new Date(Date.UTC(y, m, d)).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Day and month only: km "ថ្ងៃទី៦ ខែធ្នូ" / en "6 December". */
export function formatDayMonth(date: string | Date, lang: Lang): string {
  const { m, d } = parts(date);
  if (lang === "km") return `ថ្ងៃទី${toKhmerNumerals(d)} ខែ${KHMER_MONTHS[m]}`;
  return `${d} ${new Date(Date.UTC(2000, m, 1)).toLocaleDateString("en-GB", { month: "long", timeZone: "UTC" })}`;
}

/** Compact date for tables: km "២០ វិច្ឆិកា" / en "20 Nov". */
export function formatShortDate(date: string | Date, lang: Lang): string {
  const { m, d } = parts(date);
  if (lang === "km") return `${toKhmerNumerals(d)} ${KHMER_MONTHS[m]}`;
  return `${d} ${new Date(Date.UTC(2000, m, 1)).toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" })}`;
}

/** "13.12.2026" (Khmer numerals in km), as on the dashboard cards. */
export function formatNumericDate(date: string, lang: Lang): string {
  const [y, m, d] = date.split("-");
  const s = `${d}.${m}.${y}`;
  return lang === "km" ? toKhmerNumerals(s) : s;
}

/** Shift a YYYY-MM-DD date by whole days. */
export function addDays(date: string, days: number): string {
  const { y, m, d } = parts(date);
  return new Date(Date.UTC(y, m, d + days)).toISOString().slice(0, 10);
}

/** Khmer time-of-day word for a 24-hour hour. */
function khmerPeriod(h: number): string {
  if (h < 12) return "ព្រឹក";
  if (h === 12) return "ថ្ងៃត្រង់";
  if (h < 17) return "រសៀល";
  if (h < 19) return "ល្ងាច";
  return "យប់";
}

/** "17:00" → km "ម៉ោង ៥:០០ ល្ងាច" / en "5:00 PM" (12-hour clock in both). */
export function formatTime(time: string, lang: Lang): string {
  const [h, min] = time.split(":").map(Number);
  const hm = `${h % 12 || 12}:${String(min).padStart(2, "0")}`;
  if (lang === "en") return `${hm} ${h < 12 ? "AM" : "PM"}`;
  return `ម៉ោង ${toKhmerNumerals(hm)} ${khmerPeriod(h)}`;
}

/** Fixed display rate. Prices in the spec use 4,000 ៛ per dollar. */
export const KHR_PER_USD = 4000;

/** "$15" */
export function formatUsd(usd: number): string {
  return Number.isInteger(usd) ? `$${usd}` : `$${usd.toFixed(2)}`;
}

/** km "៦០,០០០ ៛" / en "60,000 ៛" */
export function formatRiel(khr: number, lang: Lang = "km"): string {
  return `${formatNumber(khr, lang)} ៛`;
}

/** Both currencies, as every price must show: "$15 · ៦០,០០០ ៛" */
export function formatPrice(usd: number, lang: Lang = "km") {
  const u = formatUsd(usd);
  const r = formatRiel(Math.round(usd * KHR_PER_USD), lang);
  return { usd: u, riel: r, both: `${u} · ${r}` };
}
