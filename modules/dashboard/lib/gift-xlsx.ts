/**
 * Excel (.xlsx) download of the gift ledger (Premium).
 *
 * Layout (one sheet):
 *   1  Title (maroon band)
 *   2  Couple's names
 *   3+ Event date / exported
 *      Summary: total riel, total dollars (live SUM formulas), givers
 *      Table: # | Name | English name | Side | Gift | Riel | Dollars | Description | Note | Date added
 *      with a frozen, filterable header and a total row.
 *   Footer note: recorded by the host; TheabKa doesn't handle gift money.
 *
 * Riel and dollars stay in separate columns so each can be totalled; nothing is converted.
 * exceljs is loaded on demand so it never weighs on the dashboard bundle.
 */
import type { GiftEntry } from "@/lib/store";
import { giftNameEn, giftNameKm, giftTotals, type GiftKind } from "./gift-ledger";

export type GiftSheetInfo = {
  namesKm: string;
  namesEn: string;
  /** Already formatted, or "". */
  eventDate: string;
  exportedAt: string;
  /** Oldest first, the order they were written down. */
  rows: GiftEntry[];
  labels: {
    title: string;
    eventDate: string;
    exported: string;
    totalKhr: string;
    totalUsd: string;
    givers: string;
    total: string;
    note: string;
    cols: { no: string; name: string; nameEn: string; side: string; kind: string; khr: string; usd: string; description: string; note: string; date: string };
    sides: { groom: string; bride: string };
    kinds: Record<GiftKind, string>;
  };
};

// Theme tokens from app/globals.css, as ARGB for Excel (same as rsvp-xlsx.ts).
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
  white: "FFFFFFFF",
};
const FONT = "Khmer UI";
const RIEL_FMT = '#,##0" ៛"';
const USD_FMT = '"$"#,##0.00';

function toDate(s: string): Date {
  const [y, m, d] = s.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export async function buildGiftXlsx(info: GiftSheetInfo): Promise<ArrayBuffer> {
  const { default: ExcelJS } = await import("exceljs");
  const { labels: l, rows } = info;
  const totals = giftTotals(rows);

  const wb = new ExcelJS.Workbook();
  wb.creator = "TheabKa";
  wb.created = new Date();
  const ws = wb.addWorksheet("Gifts", {
    properties: { defaultRowHeight: 22 },
    pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 } },
    headerFooter: { oddFooter: "&L&8TheabKa&R&8&P / &N" },
  });

  ws.columns = [
    { key: "no", width: 6 },
    { key: "name", width: 28 },
    { key: "nameEn", width: 24 },
    { key: "side", width: 14 },
    { key: "kind", width: 18 },
    { key: "khr", width: 16 },
    { key: "usd", width: 15 },
    { key: "description", width: 26 },
    { key: "note", width: 32 },
    { key: "date", width: 14 },
  ];
  const lastCol = "J";
  const font = (extra: Partial<import("exceljs").Font> = {}) => ({ name: FONT, size: 11, color: { argb: C.charcoal }, ...extra });
  const fill = (argb: string) => ({ type: "pattern" as const, pattern: "solid" as const, fgColor: { argb } });
  const thin = (argb = C.line) => ({ style: "thin" as const, color: { argb } });

  ws.mergeCells(`A1:${lastCol}1`);
  const title = ws.getCell("A1");
  title.value = l.title;
  title.font = font({ size: 15, bold: true, color: { argb: C.white } });
  title.fill = fill(C.maroon);
  title.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  ws.getRow(1).height = 34;

  ws.mergeCells(`A2:${lastCol}2`);
  const couple = ws.getCell("A2");
  couple.value = info.namesKm === info.namesEn ? info.namesEn : `${info.namesKm}  ·  ${info.namesEn}`;
  couple.font = font({ size: 13, bold: true, color: { argb: C.maroon } });
  couple.fill = fill(C.ivory);
  couple.alignment = { vertical: "middle", indent: 1 };
  couple.border = { bottom: { style: "medium", color: { argb: C.gold } } };
  ws.getRow(2).height = 30;

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
  infoRow(l.exported, info.exportedAt);

  // Table position is known up front so the summary can use formulas.
  const summaryStart = r + 1;
  const headerRow = summaryStart + 3 + 1;
  const first = headerRow + 1;
  const last = headerRow + rows.length;
  const range = (col: string) => `${col}${first}:${col}${last}`;

  const summary: [string, { formula: string; result: number } | number, string, string, string][] = [
    [l.totalKhr, rows.length ? { formula: `SUM(${range("F")})`, result: totals.khr } : 0, RIEL_FMT, C.goldSoft, C.goldInk],
    [l.totalUsd, rows.length ? { formula: `SUM(${range("G")})`, result: totals.usdCents / 100 } : 0, USD_FMT, C.jadeSoft, C.jadeInk],
    [l.givers, totals.givers, "0", C.sandLight, C.charcoal],
  ];
  summary.forEach(([label, value, fmt, bg, ink], i) => {
    const row = summaryStart + i;
    ws.mergeCells(`A${row}:B${row}`);
    ws.mergeCells(`C${row}:D${row}`);
    const a = ws.getCell(`A${row}`);
    a.value = label;
    a.font = font({ bold: true, color: { argb: ink } });
    a.fill = fill(bg);
    a.alignment = { vertical: "middle", indent: 1 };
    const v = ws.getCell(`C${row}`);
    v.value = value;
    v.numFmt = fmt;
    v.font = font({ size: 13, bold: true, color: { argb: ink } });
    v.fill = fill(bg);
    v.alignment = { vertical: "middle", horizontal: "center" };
    for (const cell of [a, v]) cell.border = { top: thin(C.white), bottom: thin(C.white) };
    ws.getRow(row).height = 24;
  });

  const header = ws.getRow(headerRow);
  const cols = l.cols;
  header.values = [cols.no, cols.name, cols.nameEn, cols.side, cols.kind, cols.khr, cols.usd, cols.description, cols.note, cols.date];
  header.height = 28;
  header.eachCell((cell, col) => {
    cell.font = font({ bold: true, color: { argb: C.white } });
    cell.fill = fill(C.maroon);
    cell.alignment = { vertical: "middle", horizontal: [2, 3, 8, 9].includes(col) ? "left" : "center", indent: [2, 3, 8, 9].includes(col) ? 1 : 0 };
    cell.border = { bottom: thin(C.gold) };
  });

  rows.forEach((e, i) => {
    const row = ws.getRow(first + i);
    row.values = [
      i + 1,
      giftNameKm(e),
      e.nameEn.trim() ? giftNameEn(e) : "",
      e.side ? l.sides[e.side] : "",
      l.kinds[e.kind],
      e.currency === "KHR" && e.amount !== null ? e.amount : null,
      e.currency === "USD" && e.amount !== null ? e.amount / 100 : null,
      e.description,
      e.note,
      toDate(e.createdAt),
    ];
    const zebra = i % 2 === 1 ? C.ivory : C.white;
    row.eachCell({ includeEmpty: true }, (cell, col) => {
      const left = [2, 3, 8, 9].includes(col);
      cell.font = font({ bold: col === 2 || col === 6 || col === 7 });
      cell.fill = fill(zebra);
      cell.border = { bottom: thin() };
      cell.alignment = { vertical: "top", horizontal: left ? "left" : col === 6 || col === 7 ? "right" : "center", wrapText: col === 8 || col === 9, indent: left ? 1 : 0 };
    });
    row.getCell(6).numFmt = RIEL_FMT;
    row.getCell(7).numFmt = USD_FMT;
    row.getCell(10).numFmt = "dd/mm/yyyy";
    row.getCell(10).font = font({ color: { argb: C.muted } });
  });

  if (rows.length) {
    const total = ws.getRow(last + 1);
    total.getCell(2).value = l.total;
    total.getCell(6).value = { formula: `SUM(${range("F")})`, result: totals.khr };
    total.getCell(7).value = { formula: `SUM(${range("G")})`, result: totals.usdCents / 100 };
    total.getCell(6).numFmt = RIEL_FMT;
    total.getCell(7).numFmt = USD_FMT;
    total.height = 26;
    for (let col = 1; col <= 10; col++) {
      const cell = total.getCell(col);
      cell.font = font({ bold: true, size: 12, color: { argb: C.maroon } });
      cell.fill = fill(C.goldSoft);
      cell.border = { top: { style: "medium", color: { argb: C.maroon } } };
      cell.alignment = { vertical: "middle", horizontal: col === 2 ? "left" : col === 6 || col === 7 ? "right" : "center", indent: col === 2 ? 1 : 0 };
    }
    ws.autoFilter = { from: { row: headerRow, column: 1 }, to: { row: last, column: 10 } };
  }

  const noteRow = last + (rows.length ? 3 : 2);
  ws.mergeCells(`A${noteRow}:${lastCol}${noteRow}`);
  const note = ws.getCell(`A${noteRow}`);
  note.value = l.note;
  note.font = font({ size: 9, italic: true, color: { argb: C.muted } });
  note.alignment = { indent: 1 };

  ws.views = [{ state: "frozen", ySplit: headerRow, showGridLines: false }];

  return wb.xlsx.writeBuffer() as Promise<ArrayBuffer>;
}
