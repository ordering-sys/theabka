/**
 * Editable Excel (.xlsx) export of the RSVP list.
 *
 * Layout (one sheet):
 *   1  Report title (maroon band)
 *   2  Couple's names
 *   3+ Event date / venue / filter / exported   (label | value)
 *      Summary: replies, attending, not attending, total guests
 *      (live formulas over the guest table, so they update when the host edits rows)
 *      Guest table: # | Name | Reply | People | Message | Date
 *      with a frozen, filterable header, a Reply dropdown and a SUM total row.
 *
 * exceljs is loaded on demand so it never weighs on the dashboard bundle.
 */
import type { ReportInfo } from "./rsvp-export";

// Theme tokens from app/globals.css, as ARGB for Excel.
const C = {
  maroon: "FF7A1F2B",
  gold: "FFC9A24B",
  goldSoft: "FFF3E6C8",
  goldInk: "FF6E5418",
  ivory: "FFFBF6EE",
  sandLight: "FFF6EFE2",
  line: "FFEADFCB",
  charcoal: "FF2B2B2B",
  muted: "FF5C5C5C",
  jadeSoft: "FFE4EFEA",
  jadeInk: "FF2F5A4A",
  roseSoft: "FFF6E3E0",
  white: "FFFFFFFF",
};
// Ships with Windows and covers both Khmer and Latin; other systems fall back cleanly.
const FONT = "Khmer UI";

/** "2026-11-20" or an ISO timestamp -> a date-only Excel value. */
function toDate(s: string): Date {
  const [y, m, d] = s.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export async function buildRsvpXlsx(info: ReportInfo): Promise<ArrayBuffer> {
  const { default: ExcelJS } = await import("exceljs");
  const { labels: l, rows } = info;

  const wb = new ExcelJS.Workbook();
  wb.creator = "TheabKa";
  wb.created = new Date();
  const ws = wb.addWorksheet("RSVP", {
    properties: { defaultRowHeight: 22 },
    pageSetup: { paperSize: 9, orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 } },
    headerFooter: { oddFooter: "&L&8TheabKa&R&8&P / &N" },
  });

  ws.columns = [
    { key: "no", width: 6 },
    { key: "name", width: 30 },
    { key: "status", width: 18 },
    { key: "people", width: 11 },
    { key: "message", width: 48 },
    { key: "date", width: 15 },
  ];
  const lastCol = "F";
  const font = (extra: Partial<import("exceljs").Font> = {}) => ({ name: FONT, size: 11, color: { argb: C.charcoal }, ...extra });
  const fill = (argb: string) => ({ type: "pattern" as const, pattern: "solid" as const, fgColor: { argb } });
  const thin = (argb = C.line) => ({ style: "thin" as const, color: { argb } });

  // 1: title band
  ws.mergeCells(`A1:${lastCol}1`);
  const title = ws.getCell("A1");
  title.value = l.title;
  title.font = font({ size: 15, bold: true, color: { argb: C.white } });
  title.fill = fill(C.maroon);
  title.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  ws.getRow(1).height = 34;

  // 2: couple
  ws.mergeCells(`A2:${lastCol}2`);
  const couple = ws.getCell("A2");
  couple.value = info.namesKm === info.namesEn ? info.namesEn : `${info.namesKm}  ·  ${info.namesEn}`;
  couple.font = font({ size: 13, bold: true, color: { argb: C.maroon } });
  couple.fill = fill(C.ivory);
  couple.alignment = { vertical: "middle", indent: 1 };
  ws.getRow(2).height = 30;
  ws.getCell("A2").border = { bottom: { style: "medium", color: { argb: C.gold } } };

  // Info block: label in A:B, value in C:F.
  let r = 4;
  const infoRow = (label: string, value: string) => {
    ws.mergeCells(`A${r}:B${r}`);
    ws.mergeCells(`C${r}:${lastCol}${r}`);
    const a = ws.getCell(`A${r}`);
    a.value = label;
    a.font = font({ size: 10, bold: true, color: { argb: C.muted } });
    a.alignment = { vertical: "middle", indent: 1 };
    const v = ws.getCell(`C${r}`);
    v.value = value;
    v.font = font();
    v.alignment = { vertical: "middle", wrapText: true };
    r++;
  };
  if (info.eventDate) infoRow(l.eventDate, info.eventDate);
  if (info.venue) infoRow(l.venue, info.venue);
  infoRow(l.filter, info.filter);
  infoRow(l.exported, info.exportedAt);

  // Guest table position is known up front so the summary can use formulas.
  const summaryStart = r + 1;
  const headerRow = summaryStart + 4 + 1;
  const first = headerRow + 1;
  const last = headerRow + rows.length;
  const range = (col: string) => `${col}${first}:${col}${last}`;
  const yesCount = rows.filter((x) => x.attending).length;
  const guestSum = rows.reduce((n, x) => n + (x.attending ? x.partySize : 0), 0);

  // Summary: label (tinted) | value, in A:B and C.
  const summary: [string, string, number, string, string][] = [
    [l.replies, `COUNTA(${range("B")})`, rows.length, C.sandLight, C.charcoal],
    [l.attending, `COUNTIF(${range("C")},"${l.attending}")`, yesCount, C.jadeSoft, C.jadeInk],
    [l.notAttending, `COUNTIF(${range("C")},"${l.notAttending}")`, rows.length - yesCount, C.roseSoft, C.maroon],
    [l.totalGuests, `SUMIF(${range("C")},"${l.attending}",${range("D")})`, guestSum, C.goldSoft, C.goldInk],
  ];
  summary.forEach(([label, formula, result, bg, ink], i) => {
    const row = summaryStart + i;
    ws.mergeCells(`A${row}:B${row}`);
    const a = ws.getCell(`A${row}`);
    a.value = label;
    a.font = font({ bold: true, color: { argb: ink } });
    a.fill = fill(bg);
    a.alignment = { vertical: "middle", indent: 1 };
    const v = ws.getCell(`C${row}`);
    v.value = rows.length ? { formula, result } : 0;
    v.font = font({ size: 13, bold: true, color: { argb: ink } });
    v.fill = fill(bg);
    v.alignment = { vertical: "middle", horizontal: "center" };
    for (const cell of [a, v]) cell.border = { top: thin(C.white), bottom: thin(C.white) };
    ws.getRow(row).height = 24;
  });

  // Table header
  const header = ws.getRow(headerRow);
  header.values = [l.cols.no, l.cols.name, l.cols.status, l.cols.people, l.cols.message, l.cols.date];
  header.height = 28;
  header.eachCell((cell) => {
    cell.font = font({ bold: true, color: { argb: C.white } });
    cell.fill = fill(C.maroon);
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = { bottom: thin(C.gold) };
  });
  header.getCell(2).alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  header.getCell(5).alignment = { vertical: "middle", horizontal: "left", indent: 1 };

  // Guest rows
  rows.forEach((x, i) => {
    const row = ws.getRow(first + i);
    row.values = [i + 1, x.guestName, x.attending ? l.attending : l.notAttending, x.attending ? x.partySize : 0, x.message ?? "", toDate(x.createdAt)];
    const zebra = i % 2 === 1 ? C.ivory : C.white;
    row.eachCell({ includeEmpty: true }, (cell, col) => {
      cell.font = font({ bold: col === 2 });
      cell.fill = fill(zebra);
      cell.border = { bottom: thin() };
      cell.alignment = { vertical: "top", horizontal: col === 2 || col === 5 ? "left" : "center", wrapText: col === 5, indent: col === 2 || col === 5 ? 1 : 0 };
    });
    const status = row.getCell(3);
    status.fill = fill(x.attending ? C.jadeSoft : C.roseSoft);
    status.font = font({ bold: true, color: { argb: x.attending ? C.jadeInk : C.maroon } });
    // Edits stay consistent with the summary formulas.
    status.dataValidation = { type: "list", allowBlank: false, formulae: [`"${l.attending},${l.notAttending}"`] };
    row.getCell(4).numFmt = "0";
    row.getCell(4).dataValidation = { type: "whole", operator: "between", allowBlank: true, formulae: [0, 50] };
    row.getCell(6).numFmt = "dd/mm/yyyy";
    row.getCell(6).font = font({ color: { argb: C.muted } });
  });

  // Total row
  if (rows.length) {
    const total = ws.getRow(last + 1);
    total.getCell(2).value = l.total;
    total.getCell(4).value = { formula: `SUM(${range("D")})`, result: guestSum };
    total.height = 26;
    for (let col = 1; col <= 6; col++) {
      const cell = total.getCell(col);
      cell.font = font({ bold: true, size: 12, color: { argb: C.maroon } });
      cell.fill = fill(C.goldSoft);
      cell.border = { top: { style: "medium", color: { argb: C.maroon } } };
      cell.alignment = { vertical: "middle", horizontal: col === 2 ? "left" : "center", indent: col === 2 ? 1 : 0 };
    }
    ws.autoFilter = { from: { row: headerRow, column: 1 }, to: { row: last, column: 6 } };
  }

  // Keep the table header visible while scrolling.
  ws.views = [{ state: "frozen", ySplit: headerRow, showGridLines: false }];

  return wb.xlsx.writeBuffer() as Promise<ArrayBuffer>;
}
