import type { Invitation } from "@/lib/mock-data";

/** Cambodia is UTC+7 all year (no daylight saving). */
const PHNOM_PENH_OFFSET_H = 7;

function toUtcStamp(date: string, time: string) {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = (time || "00:00").split(":").map(Number);
  return new Date(Date.UTC(y, mo - 1, d, h - PHNOM_PENH_OFFSET_H, mi));
}

const icsDate = (dt: Date) => dt.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const escape = (s: string) => s.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\r?\n|\r/g, "\\n");

/** RFC 5545: lines longer than 75 octets continue on the next line after CRLF + space. */
function fold(line: string) {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const out: string[] = [];
  let current = "";
  let size = 0;
  for (const ch of line) {
    const n = new TextEncoder().encode(ch).length;
    if (size + n > (out.length ? 74 : 75)) {
      out.push(current);
      current = "";
      size = 0;
    }
    current += ch;
    size += n;
  }
  out.push(current);
  return out.join("\r\n ");
}

/** iCalendar file for the event: from the start time to 3 hours after the last schedule item. */
export function buildIcs(inv: Invitation, url: string) {
  const start = toUtcStamp(inv.eventDate, inv.startTime);
  const lastTime = [...inv.schedule.map((s) => s.time).filter(Boolean)].sort().at(-1) ?? inv.startTime;
  const end = new Date(toUtcStamp(inv.eventDate, lastTime).getTime() + 3 * 3600_000);
  const title = `${inv.groomKm} & ${inv.brideKm} · ${inv.groomEn} & ${inv.brideEn}`;
  const location = [inv.venueNameEn, inv.venueAddressEn].filter(Boolean).join(", ");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TheabKa//Invitation//EN",
    "BEGIN:VEVENT",
    `UID:${inv.id}@theabka`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(start)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${escape(title)}`,
    `LOCATION:${escape(location)}`,
    `GEO:${inv.lat};${inv.lng}`,
    `DESCRIPTION:${escape(url)}`,
    `URL:${url}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .map(fold)
    .join("\r\n") + "\r\n";
}

export function directionsUrl(inv: Pick<Invitation, "lat" | "lng">) {
  return `https://www.google.com/maps/dir/?api=1&destination=${inv.lat},${inv.lng}`;
}
