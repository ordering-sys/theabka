/**
 * RSVP report data shared by both exports, and the PDF builder (a pure string, no DOM).
 *
 * - Excel: see ./rsvp-xlsx.ts.
 * - PDF: a print-ready A4 HTML page. The browser's "Save as PDF" shapes Khmer text
 *   correctly, which JS PDF libraries don't.
 */
import type { Rsvp } from "@/lib/mock-data";

export type ReportLabels = {
  title: string;
  invitation: string;
  eventDate: string;
  venue: string;
  filter: string;
  exported: string;
  total: string;
  attending: string;
  notAttending: string;
  totalGuests: string;
  replies: string;
  cols: { no: string; name: string; status: string; people: string; message: string; date: string };
  empty: string;
  brand: string;
};

export type ReportInfo = {
  /** Used for the file name (Excel) and the document title (PDF's default file name). */
  fileBase: string;
  namesKm: string;
  namesEn: string;
  eventDate: string;
  venue: string;
  filter: string;
  /** Already formatted for display. */
  exportedAt: string;
  stats: { attending: number; notAttending: number; totalGuests: number };
  rows: Rsvp[];
  labels: ReportLabels;
};

/** "2026-11-20T09:14:00Z" or "2026-11-20" -> "2026-11-20". */
const isoDay = (s: string) => s.slice(0, 10);

const html = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * Print-ready report. Colours mirror the theme tokens in app/globals.css (maroon,
 * gold, jade, ivory, charcoal); this page is standalone, so they're written out here.
 */
export function buildRsvpReportHtml(
  info: ReportInfo,
  fmt: { number: (n: number) => string; date: (iso: string) => string; lang: "km" | "en" },
): string {
  const { labels: l, rows, stats } = info;
  const people = rows.reduce((n, r) => n + (r.attending ? r.partySize : 0), 0);
  const showEn = info.namesEn !== info.namesKm;

  const meta = [
    info.eventDate && `<span>${html(l.eventDate)}: <b>${html(info.eventDate)}</b></span>`,
    info.venue && `<span>${html(l.venue)}: <b>${html(info.venue)}</b></span>`,
    `<span>${html(l.filter)}: <b>${html(info.filter)}</b></span>`,
  ].filter(Boolean).join("");

  const statBox = (label: string, value: number, cls: string) =>
    `<div class="stat ${cls}"><div class="stat-l">${html(label)}</div><div class="stat-v">${fmt.number(value)}</div></div>`;

  const body = rows.length
    ? rows.map((r, i) => `
        <tr>
          <td class="num">${fmt.number(i + 1)}</td>
          <td class="name">${html(r.guestName)}</td>
          <td><span class="pill ${r.attending ? "yes" : "no"}">${html(r.attending ? l.attending : l.notAttending)}</span></td>
          <td class="num">${r.attending ? fmt.number(r.partySize) : "—"}</td>
          <td class="msg">${html(r.message ?? "")}</td>
          <td class="date">${html(fmt.date(isoDay(r.createdAt)))}</td>
        </tr>`).join("")
    : `<tr><td colspan="6" class="empty">${html(l.empty)}</td></tr>`;

  return `<!doctype html>
<html lang="${fmt.lang}">
<head>
<meta charset="utf-8">
<title>${html(info.fileBase)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Kantumruy+Pro:wght@400;600;700&family=Moul&family=Playfair+Display:ital@1&display=block" rel="stylesheet">
<style>
  @page { size: A4; margin: 16mm 14mm 18mm; @bottom-right { content: counter(page) " / " counter(pages); font: 9pt Inter, sans-serif; color: #8a8a8a; } }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { margin: 0; color: #2B2B2B; font: 10.5pt/1.6 "Kantumruy Pro", Inter, sans-serif; }
  .top { display: flex; justify-content: space-between; align-items: center; padding-bottom: 10px; border-bottom: 2px solid #7A1F2B; }
  .brand { font-family: Moul, serif; color: #7A1F2B; font-size: 12pt; line-height: 1.9; }
  .brand small { font-family: Inter, sans-serif; font-size: 7.5pt; letter-spacing: .14em; color: #5C5C5C; margin-left: 6px; }
  .exported { font-size: 8.5pt; color: #5C5C5C; text-align: right; }
  .kicker { margin-top: 18px; font-size: 9pt; font-weight: 600; letter-spacing: .04em; color: #8A6A1F; text-transform: uppercase; }
  h1 { margin: 2px 0 0; font-size: 20pt; line-height: 1.6; }
  .en { font-family: "Playfair Display", serif; font-style: italic; font-size: 13pt; color: #8A6A1F; margin-top: -2px; }
  .meta { display: flex; flex-wrap: wrap; gap: 4px 18px; margin-top: 8px; font-size: 9.5pt; color: #5C5C5C; }
  .meta b { color: #2B2B2B; font-weight: 600; }
  .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 16px 0 18px; }
  .stat { border: 1px solid #EADFCB; border-radius: 10px; padding: 8px 12px; border-top: 3px solid #C9A24B; }
  .stat.yes { border-top-color: #5E8C7A; } .stat.no { border-top-color: #7A1F2B; } .stat.all { border-top-color: #2B2B2B; }
  .stat-l { font-size: 8.5pt; color: #5C5C5C; font-weight: 600; }
  .stat-v { font-size: 17pt; font-weight: 700; line-height: 1.4; }
  table { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
  thead th { background: #7A1F2B; color: #fff; font-weight: 600; text-align: left; padding: 7px 8px; }
  thead th:first-child { border-radius: 6px 0 0 0; } thead th:last-child { border-radius: 0 6px 0 0; }
  td { padding: 7px 8px; border-bottom: 1px solid #F1E8D8; vertical-align: top; }
  tbody tr:nth-child(even) td { background: #FBF6EE; }
  tr { break-inside: avoid; }
  .num { text-align: center; white-space: nowrap; width: 1%; }
  th.num { text-align: center; }
  .name { font-weight: 600; }
  .msg { color: #4A4A4A; }
  .date { white-space: nowrap; color: #5C5C5C; width: 1%; }
  .pill { display: inline-block; padding: 0 8px; border-radius: 999px; font-size: 8.5pt; font-weight: 600; white-space: nowrap; }
  .pill.yes { background: #E4EFEA; color: #2F5A4A; } .pill.no { background: #F6E3E0; color: #7A1F2B; }
  tfoot td { font-weight: 700; border-top: 2px solid #2B2B2B; border-bottom: 0; background: #fff; }
  .empty { text-align: center; color: #5C5C5C; padding: 24px; }
</style>
</head>
<body>
  <div class="top">
    <div class="brand">ធៀបការ<small>THEABKA</small></div>
    <div class="exported">${html(l.exported)}<br><b>${html(info.exportedAt)}</b></div>
  </div>
  <div class="kicker">${html(l.title)}</div>
  <h1>${html(info.namesKm)}</h1>
  ${showEn ? `<div class="en" lang="en">${html(info.namesEn)}</div>` : ""}
  <div class="meta">${meta}</div>
  <div class="stats">
    ${statBox(l.replies, rows.length, "all")}
    ${statBox(l.attending, stats.attending, "yes")}
    ${statBox(l.notAttending, stats.notAttending, "no")}
    ${statBox(l.totalGuests, stats.totalGuests, "")}
  </div>
  <table>
    <thead><tr>
      <th class="num">${html(l.cols.no)}</th><th>${html(l.cols.name)}</th><th>${html(l.cols.status)}</th>
      <th class="num">${html(l.cols.people)}</th><th>${html(l.cols.message)}</th><th>${html(l.cols.date)}</th>
    </tr></thead>
    <tbody>${body}</tbody>
    ${rows.length ? `<tfoot><tr><td></td><td>${html(l.total)}</td><td></td><td class="num">${fmt.number(people)}</td><td></td><td></td></tr></tfoot>` : ""}
  </table>
</body>
</html>`;
}
