"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Badge } from "@/components/ui/Badge";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button, ButtonLink } from "@/components/ui/Button";
import { BackIcon, ChevronRightIcon, DownloadIcon, GiftIcon, LockIcon, PlusIcon, TrashIcon } from "@/components/ui/Icons";
import { JasmineDivider, KbachCorners } from "@/components/invitation/Kbach";
import { TopBar } from "@/components/ui/TopBar";
import { useToast } from "@/components/ui/Toast";
import { inputClass } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { useContent, useLanguage } from "@/lib/i18n";
import { formatEnglishDate, formatKhmerDate, formatNumber, formatNumericDate, toKhmerNumerals } from "@/lib/khmer";
import { deleteGiftEntry, listGiftEntries, listGuests, type Draft, type GiftEntry, type InvitationGuest, type Session } from "@/lib/store";
import { dashboardContent } from "@/modules/dashboard/content";
import {
  formatGiftAmount,
  formatKhr,
  formatUsdCents,
  giftLedgerAccess,
  giftMatches,
  giftNameEn,
  giftNameKm,
  giftTotals,
  type GiftCurrency,
  type GiftSide,
} from "@/modules/dashboard/lib/gift-ledger";
import { buildGiftXlsx } from "@/modules/dashboard/lib/gift-xlsx";
import { AccountMenu } from "./AccountMenu";
import { GiftEntrySheet } from "./GiftEntrySheet";
import { SOFT_BUTTON } from "./RowMenu";
import { MaskedAmount, TotalsToggle } from "./GiftTotals";
import { useGiftTotalsHidden } from "@/modules/dashboard/hooks/useGiftTotalsHidden";

/** Lines on one page of the book, like a printed gift ledger. */
const LINES_PER_PAGE = 12;
const CURRENCY_KEY = "theabka.giftCurrency";
/** Two pages side by side from Tailwind's `lg` breakpoint. */
const WIDE_QUERY = "(min-width: 1024px)";

type SideFilter = "all" | Exclude<GiftSide, "">;
/** A page index, or the last page (where the next gift gets written). */
type PageRequest = number | "last";

/**
 * The gift ledger as a gift book (សៀវភៅចំណងដៃ): a cover, then ruled pages numbered in the
 * order gifts were written down, with a riel and dollar total at the foot of each page.
 * Phones show one page at a time; desktops show an open two-page spread.
 */
export function GiftBook({ invitation: inv, session }: { invitation: Draft; session: Session }) {
  const g = useContent(dashboardContent).detail.gifts;
  const b = g.book;
  const { lang, t } = useLanguage();
  const { showToast } = useToast();
  const access = giftLedgerAccess(inv);
  const { readOnly } = access;
  const wide = useIsWide();
  const [totalsHidden, setTotalsHidden] = useGiftTotalsHidden();

  const [entries, setEntries] = useState<GiftEntry[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [reload, setReload] = useState(0);
  const [guests, setGuests] = useState<InvitationGuest[]>([]);
  const [q, setQ] = useState("");
  const [side, setSide] = useState<SideFilter>("all");
  const [pageReq, setPageReq] = useState<PageRequest>("last");

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<GiftEntry | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [currency, setCurrency] = useState<GiftCurrency>("KHR");

  const [removing, setRemoving] = useState<GiftEntry | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!access.enabled) return;
    let alive = true;
    listGiftEntries(inv.id).then(
      (list) => {
        if (!alive) return;
        setEntries(list);
        setLoadError(false);
      },
      () => alive && setLoadError(true),
    );
    listGuests(inv.id).then((list) => alive && setGuests(list), () => {});
    return () => {
      alive = false;
    };
  }, [inv.id, access.enabled, reload]);

  // Book order: oldest first. Line numbers stay the same while searching.
  const ordered = useMemo(() => [...(entries ?? [])].sort((x, y) => x.createdAt.localeCompare(y.createdAt)), [entries]);
  const lineNo = useMemo(() => new Map(ordered.map((e, i) => [e.id, i + 1])), [ordered]);
  const filtered = useMemo(() => ordered.filter((e) => (side === "all" || e.side === side) && giftMatches(e, q)), [ordered, side, q]);
  const totals = useMemo(() => giftTotals(entries ?? []), [entries]);
  const searching = side !== "all" || q.trim() !== "";

  const pageCount = Math.max(1, Math.ceil(filtered.length / LINES_PER_PAGE));
  const step = wide ? 2 : 1;
  const requested = pageReq === "last" ? pageCount - 1 : Math.min(pageReq, pageCount - 1);
  // On a spread the left page is always an even page, like a real book.
  const first = wide ? requested - (requested % 2) : requested;
  const visible = Array.from({ length: step }, (_, i) => first + i).filter((p) => p < pageCount || (wide && p === first + 1));

  const short = (s: string) => s.split(" ").at(-1) || s;
  const fmt = (n: number) => formatNumber(n, lang);
  const fmtDate = (d: string) => (lang === "km" ? formatKhmerDate(d) : formatEnglishDate(d));

  if (!access.enabled) {
    return (
      <Shell inv={inv} session={session}>
        <div className="mx-auto flex max-w-[480px] flex-col items-center gap-2 rounded-card bg-white px-6 py-10 text-center shadow-card">
          <span aria-hidden className="flex size-12 items-center justify-center rounded-full bg-gold-soft text-gold-ink">
            <GiftIcon size={22} />
          </span>
          {access.canUpgrade ? (
            <>
              <h1 className="mt-1 flex items-center gap-2 text-base leading-[1.6] font-bold">
                {g.title}
                <Badge tone="gold">{t.tier.premium}</Badge>
              </h1>
              <p className="text-sm leading-[1.7] text-muted">{g.sub}</p>
              <ButtonLink href={`/app/${inv.id}/pay`} className="mt-2 leading-[1.6]">{g.upgrade}</ButtonLink>
            </>
          ) : (
            <>
              <h1 className="mt-1 text-base leading-[1.6] font-bold">{b.notAvailable}</h1>
              <ButtonLink href={`/app/${inv.id}/dashboard`} variant="secondary" className="mt-2 leading-[1.6]">{b.back}</ButtonLink>
            </>
          )}
        </div>
      </Shell>
    );
  }

  function openAdd() {
    try {
      const saved = window.localStorage.getItem(CURRENCY_KEY);
      if (saved === "KHR" || saved === "USD") setCurrency(saved);
    } catch {
      // Storage blocked: keep the current default.
    }
    setEditing(null);
    setFormKey((k) => k + 1);
    setSheetOpen(true);
  }

  function openEdit(e: GiftEntry) {
    setEditing(e);
    setFormKey((k) => k + 1);
    setSheetOpen(true);
  }

  function rememberCurrency(cur: GiftCurrency) {
    setCurrency(cur);
    try {
      window.localStorage.setItem(CURRENCY_KEY, cur);
    } catch {
      // Not critical.
    }
  }

  function onSaved(saved: GiftEntry[], mode: "add" | "edit") {
    if (mode === "edit") {
      setEntries((list) => list?.map((x) => saved.find((s) => s.id === x.id) ?? x) ?? null);
      showToast(g.updated);
    } else {
      setEntries((list) => [...(list ?? []), ...saved]);
      // Show the page the new line was written on.
      setQ("");
      setSide("all");
      setPageReq("last");
      showToast(g.saved);
    }
  }

  function askDelete(e: GiftEntry) {
    setSheetOpen(false);
    setRemoving(e);
    setConfirmOpen(true);
  }

  async function confirmRemove() {
    const e = removing;
    if (!e || deleting) return;
    setDeleting(true);
    const ok = await deleteGiftEntry(e.id).catch(() => false);
    setDeleting(false);
    if (ok) {
      setEntries((list) => list?.filter((x) => x.id !== e.id) ?? null);
      setConfirmOpen(false);
    } else {
      showToast(readOnly ? g.ended : g.failed);
    }
  }

  async function download() {
    if (!ordered.length) return;
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const time = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const file = `gifts-${inv.slug}.xlsx`;
    try {
      const data = await buildGiftXlsx({
        namesKm: `${short(inv.groomKm)} & ${short(inv.brideKm)}`,
        namesEn: `${short(inv.groomEn)} & ${short(inv.brideEn)}`,
        eventDate: inv.eventDate ? fmtDate(inv.eventDate) : "",
        exportedAt: `${formatNumericDate(today, lang)} ${lang === "km" ? toKhmerNumerals(time) : time}`,
        rows: ordered,
        labels: { ...g.sheet, sides: g.sides, kinds: g.kinds },
      });
      const href = URL.createObjectURL(new Blob([data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
      Object.assign(document.createElement("a"), { href, download: file }).click();
      setTimeout(() => URL.revokeObjectURL(href), 1000);
      showToast(g.downloaded(file));
    } catch {
      showToast(g.downloadFailed);
    }
  }

  const sideOptions: [SideFilter, string][] = [
    ["all", g.sides.all],
    ["groom", g.sides.groom],
    ["bride", g.sides.bride],
  ];
  const hasEntries = ordered.length > 0;

  return (
    <Shell inv={inv} session={session}>
      {/* ── Cover ─────────────────────────────────────────────── */}
      <section aria-labelledby="book-title" className="relative overflow-hidden rounded-card bg-maroon px-5 pt-7 pb-5 text-center text-white shadow-lift lg:px-10 lg:pt-9">
        {/* Gold frame and kbach corners, as printed on the cover of a gift book. */}
        <span aria-hidden className="pointer-events-none absolute inset-2.5 rounded-[9px] border border-gold/70" />
        <span aria-hidden className="pointer-events-none absolute inset-4 rounded-[6px] border border-gold/30" />
        <KbachCorners />
        <div className="relative">
          <h1 id="book-title" className="flex flex-col items-center gap-1">
            <span lang="km" className="font-moul text-[22px] leading-[1.9] text-gold-light lg:text-3xl">សៀវភៅចំណងដៃ</span>
            <span lang="en" className="font-serif text-sm tracking-[0.2em] text-white/80 uppercase italic">{b.coverEn}</span>
          </h1>
          <JasmineDivider className="mx-auto my-3 max-w-60" />
          <p lang="km" className="text-lg leading-[1.7] font-bold">{short(inv.groomKm)} &amp; {short(inv.brideKm)}</p>
          <p lang="en" className="font-serif text-base text-gold-light italic">{short(inv.groomEn)} &amp; {short(inv.brideEn)}</p>
          {inv.eventDate && <p className="mt-1 text-xs leading-[1.7] text-white/75">{fmtDate(inv.eventDate)}</p>}

          {/* Label plate with the totals: riel and dollars side by side, never added together. */}
          <dl className="mx-auto mt-4 grid max-w-[560px] grid-cols-3 divide-x divide-gold/30 rounded-card bg-ivory px-1 py-2.5 text-charcoal shadow-card">
            <div className="min-w-0 px-2">
              <dt className="truncate text-[11px] font-semibold text-muted lg:text-xs">{g.totals.khr}</dt>
              <dd className="truncate text-[15px] leading-[1.6] font-bold text-gold-ink lg:text-xl">
                <MaskedAmount hidden={totalsHidden}>{formatKhr(totals.khr, lang)}</MaskedAmount>
              </dd>
            </div>
            <div className="min-w-0 px-2">
              <dt className="truncate text-[11px] font-semibold text-muted lg:text-xs">{g.totals.usd}</dt>
              <dd className="truncate text-[15px] leading-[1.6] font-bold text-jade-ink lg:text-xl">
                <MaskedAmount hidden={totalsHidden}>{formatUsdCents(totals.usdCents, lang)}</MaskedAmount>
              </dd>
            </div>
            <div className="min-w-0 px-2">
              <dt className="truncate text-[11px] font-semibold text-muted lg:text-xs">{g.totals.givers}</dt>
              <dd className="truncate text-[15px] leading-[1.6] font-bold lg:text-xl">{fmt(totals.givers)}</dd>
            </div>
          </dl>
          <TotalsToggle hidden={totalsHidden} onToggle={setTotalsHidden} tone="dark" className="mt-1.5" />
          <p className="text-[11px] leading-[1.7] text-white/70">
            {totals.items > 0 && <>{g.totals.items(fmt(totals.items))} · </>}
            {g.totalsNote}
          </p>
        </div>
      </section>

      {readOnly && access.purgeOn && (
        <p role="status" className="flex items-start gap-2 rounded-card bg-rose-soft px-3.5 py-2.5 text-[13px] leading-[1.7] text-maroon">
          <LockIcon size={15} className="mt-1 shrink-0" />
          {g.readOnly(fmtDate(access.purgeOn))}
        </p>
      )}

      {/* ── Search, side filter and actions ──────────────────── */}
      <div className="flex flex-col gap-2.5 rounded-card bg-white p-3 shadow-card lg:flex-row lg:items-center lg:px-4">
        <div className="relative w-full lg:w-72">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
          <input
            type="search"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPageReq(0);
            }}
            placeholder={g.search}
            aria-label={g.searchLabel}
            className={cn(inputClass, "min-h-11 bg-white pr-3 pl-10 text-[15px]")}
          />
        </div>
        <div role="group" aria-label={g.side} className="flex rounded-card bg-sand-light p-1">
          {sideOptions.map(([value, label]) => {
            const on = side === value;
            return (
              <button
                key={value}
                type="button"
                aria-pressed={on}
                onClick={() => {
                  setSide(value);
                  setPageReq(0);
                }}
                className={cn(
                  "flex min-h-10 flex-1 cursor-pointer items-center justify-center rounded-[9px] px-3 text-[13px] leading-[1.6] font-semibold whitespace-nowrap transition-colors lg:flex-none",
                  on ? "bg-white text-charcoal shadow-card" : "text-muted hover:text-charcoal",
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2 lg:ml-auto">
          {readOnly ? (
            <Button size="sm" onClick={() => void download()} disabled={!hasEntries} className="grow leading-[1.6] lg:grow-0">
              <DownloadIcon size={16} />
              {g.download}
            </Button>
          ) : (
            <>
              <button type="button" onClick={() => void download()} disabled={!hasEntries} className={cn(SOFT_BUTTON, "leading-[1.6] disabled:cursor-not-allowed disabled:opacity-50")}>
                <DownloadIcon size={16} className="text-maroon" />
                <span className="hidden sm:inline">{g.download}</span>
                <span className="sm:hidden">Excel</span>
              </button>
              <Button size="sm" onClick={openAdd} className="grow leading-[1.6] lg:grow-0">
                <PlusIcon size={16} />
                {g.add}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ── The pages ─────────────────────────────────────────── */}
      {entries === null && !loadError ? (
        <div aria-busy className="h-[520px] motion-safe:animate-pulse rounded-card bg-ivory shadow-card" />
      ) : loadError ? (
        <div role="alert" className="flex flex-col items-center gap-3 rounded-card bg-white px-6 py-10 text-center shadow-card">
          <p className="max-w-90 text-sm leading-[1.7] text-muted">{g.loadFailed}</p>
          <button type="button" onClick={() => setReload((n) => n + 1)} className={SOFT_BUTTON}>{g.retry}</button>
        </div>
      ) : (
        <section aria-label={g.title}>
          {searching && (
            <p role="status" className="mb-2 text-sm leading-[1.6] font-semibold text-ink-soft">
              {filtered.length ? b.results(fmt(filtered.length)) : g.noMatch}
            </p>
          )}

          {/* Pages stacked behind give the book its thickness. */}
          <div className="relative">
            <span aria-hidden className="absolute inset-x-1.5 -bottom-1.5 top-1.5 rounded-card bg-sand shadow-card" />
            <span aria-hidden className="absolute inset-x-0.5 -bottom-0.5 top-0.5 rounded-card bg-sand-light shadow-card" />
            <div className="relative grid overflow-hidden rounded-card bg-ivory shadow-lift lg:grid-cols-2">
              {visible.map((p, i) => (
                <BookPage
                  key={p}
                  index={p}
                  rows={filtered.slice(p * LINES_PER_PAGE, (p + 1) * LINES_PER_PAGE)}
                  lineNo={lineNo}
                  readOnly={readOnly}
                  onEdit={openEdit}
                  position={wide ? (i === 0 ? "left" : "right") : "single"}
                  blank={p >= pageCount}
                  totalsHidden={totalsHidden}
                />
              ))}
            </div>
          </div>

          {/* Page turner */}
          <nav aria-label={b.page(fmt(first + 1), fmt(pageCount))} className="mt-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setPageReq(Math.max(0, first - step))}
              disabled={first === 0}
              aria-label={b.prev}
              className={cn(SOFT_BUTTON, "px-3 disabled:cursor-not-allowed disabled:opacity-40")}
            >
              <BackIcon size={18} />
              <span className="hidden sm:inline">{b.prev}</span>
            </button>
            <p className="text-sm leading-[1.6] font-semibold text-ink-soft" aria-live="polite">
              {b.page(fmt(first + 1) + (wide && first + 1 < pageCount ? `–${fmt(first + 2)}` : ""), fmt(pageCount))}
            </p>
            <button
              type="button"
              onClick={() => setPageReq(Math.min(pageCount - 1, first + step))}
              disabled={first + step >= pageCount}
              aria-label={b.next}
              className={cn(SOFT_BUTTON, "px-3 disabled:cursor-not-allowed disabled:opacity-40")}
            >
              <span className="hidden sm:inline">{b.next}</span>
              <ChevronRightIcon size={18} />
            </button>
          </nav>

          <p className="mt-3 text-xs leading-[1.7] text-muted">
            {!readOnly && hasEntries && <>{b.tapToEdit} </>}
            {!readOnly && access.purgeOn && g.keepNote(fmtDate(access.purgeOn))}
          </p>
        </section>
      )}

      <GiftEntrySheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        invitationId={inv.id}
        guests={guests}
        editing={editing}
        formKey={formKey}
        defaultCurrency={currency}
        onSaved={onSaved}
        onCurrencyUsed={rememberCurrency}
        onDelete={askDelete}
      />

      {/* Confirm deleting a gift (replaces the browser's confirm box). */}
      <BottomSheet open={confirmOpen} onClose={() => !deleting && setConfirmOpen(false)} label={g.removeTitle} closeLabel={g.cancel} dialogOnDesktop>
        {removing && (
          <div className="flex flex-col items-center gap-2 text-center">
            <span aria-hidden className="flex size-14 items-center justify-center rounded-full bg-rose-soft text-maroon">
              <TrashIcon size={24} />
            </span>
            <h2 className="mt-1 text-lg leading-[1.6] font-bold">{g.removeTitle}</h2>
            <div className="w-full rounded-card bg-ivory px-3 py-2.5">
              <p lang="km" className="text-[15px] leading-[1.7] font-semibold text-charcoal">{giftNameKm(removing)}</p>
              <p className="text-sm font-bold text-charcoal">{formatGiftAmount(removing, lang) || removing.description}</p>
            </div>
            <p className="text-sm leading-[1.7] text-muted">{g.removeBody}</p>
            <div className="mt-3 grid w-full grid-cols-2 gap-2.5">
              <button type="button" onClick={() => setConfirmOpen(false)} disabled={deleting} className={cn(SOFT_BUTTON, "min-h-12 text-[15px] leading-[1.6]")}>
                {g.cancel}
              </button>
              <Button onClick={confirmRemove} disabled={deleting} className="leading-[1.6]">
                <TrashIcon size={16} />
                {deleting ? g.removing : g.remove}
              </Button>
            </div>
          </div>
        )}
      </BottomSheet>
    </Shell>
  );
}

/** Plain host-app chrome around the book: white top bar back to the dashboard. */
function Shell({ inv, session, children }: { inv: Draft; session: Session; children: React.ReactNode }) {
  const b = useContent(dashboardContent).detail.gifts.book;
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b border-line bg-white px-3 py-2 lg:px-6">
        <div className="mx-auto max-w-[1200px]">
          <TopBar backHref={`/app/${inv.id}/dashboard`} title={b.title} flags end={<AccountMenu session={session} />} />
        </div>
      </header>
      <main className="mx-auto flex max-w-[1200px] flex-col gap-3.5 px-4 pt-3.5 pb-12 lg:gap-5 lg:px-6 lg:pt-6">{children}</main>
    </div>
  );
}

/**
 * One ruled page: a column header with a double rule, numbered lines with a red margin,
 * blank lines filling the rest of the page, and the page's riel and dollar totals at the foot.
 */
function BookPage({
  index,
  rows,
  lineNo,
  readOnly,
  onEdit,
  position,
  blank,
  totalsHidden,
}: {
  index: number;
  rows: GiftEntry[];
  lineNo: Map<string, number>;
  readOnly: boolean;
  onEdit: (e: GiftEntry) => void;
  position: "single" | "left" | "right";
  /** The empty right-hand page after the last page of a spread. */
  blank: boolean;
  /** The host hid the money totals: mask the page totals too (each line's amount stays visible). */
  totalsHidden: boolean;
}) {
  const g = useContent(dashboardContent).detail.gifts;
  const b = g.book;
  const { lang } = useLanguage();
  const fmt = (n: number) => formatNumber(n, lang);
  const page = giftTotals(rows);
  const fillers = LINES_PER_PAGE - rows.length;
  // No | Name | Riel | USD on phones; No | Name | Side | Gift/note | Riel | USD on wide pages.
  const grid = "grid grid-cols-[2rem_minmax(0,1fr)_5.25rem_3.75rem] lg:grid-cols-[2.25rem_minmax(0,1fr)_4rem_minmax(0,0.85fr)_5.5rem_4rem]";
  const line = "h-15 border-b border-gold/30";

  return (
    <div
      className={cn(
        "relative flex flex-col px-3 pt-4 pb-3 lg:px-5 lg:pt-5",
        // The spine: a soft shade where the two pages meet.
        position === "left" && "bg-linear-to-l from-charcoal/[0.07] via-transparent to-transparent bg-[length:2.5rem_100%] bg-right bg-no-repeat",
        position === "right" && "bg-linear-to-r from-charcoal/[0.07] via-transparent to-transparent bg-[length:2.5rem_100%] bg-left bg-no-repeat",
      )}
    >
      {/* Column header */}
      <div aria-hidden className={cn(grid, "border-b-[3px] border-double border-maroon/50 pb-1.5 text-[11.5px] leading-[1.6] font-bold text-maroon lg:text-xs")}>
        <span className="text-center">{b.cols.no}</span>
        <span className="border-l border-maroon/30 pl-2">{b.cols.name}</span>
        <span className="hidden pl-1 lg:block">{b.cols.side}</span>
        <span className="hidden pl-1 lg:block">{b.cols.details}</span>
        <span className="pr-1 text-right">{b.cols.khr}</span>
        <span className="pr-1 text-right">{b.cols.usd}</span>
      </div>

      {/* Lines */}
      <div className="flex flex-col">
        {rows.map((e) => {
          const riel = e.currency === "KHR" && e.amount !== null ? fmt(e.amount) : "";
          const usd = e.currency === "USD" && e.amount !== null ? formatUsdCents(e.amount, lang).slice(1) : "";
          const what = e.description || g.kinds[e.kind];
          const sideText = e.side ? g.sides[e.side] : "";
          const cells = (
            <>
              <span className="self-center text-center text-[13px] text-muted tabular-nums">{fmt(lineNo.get(e.id) ?? 0)}</span>
              <span className="flex min-w-0 flex-col justify-center border-l border-maroon/30 pl-2">
                <span lang="km" className="truncate text-[15px] leading-[1.6] font-semibold text-charcoal">{giftNameKm(e)}</span>
                {/* Phones: side, gift and note under the name. Wide: English name. */}
                <span className="truncate text-[11.5px] leading-[1.6] text-muted lg:hidden">
                  {[sideText, what, e.note].filter(Boolean).join(" · ")}
                </span>
                {e.nameEn.trim() && <span lang="en" className="hidden truncate text-[11.5px] leading-[1.6] text-muted lg:block">{giftNameEn(e)}</span>}
              </span>
              <span className="hidden self-center truncate pl-1 text-[13px] leading-[1.6] text-ink-soft lg:block">{sideText}</span>
              <span className="hidden min-w-0 flex-col justify-center pl-1 lg:flex">
                <span className={cn("truncate text-[13px] leading-[1.6]", e.description ? "font-semibold text-gold-ink" : "text-ink-soft")}>{what}</span>
                {e.note && <span className="truncate text-[11.5px] leading-[1.6] text-muted">{e.note}</span>}
              </span>
              <span className="self-center truncate pr-1 text-right text-[14px] font-bold text-charcoal tabular-nums">{riel}</span>
              <span className="self-center truncate pr-1 text-right text-[14px] font-bold text-charcoal tabular-nums">{usd}</span>
            </>
          );
          return readOnly ? (
            <div key={e.id} className={cn(grid, line)}>{cells}</div>
          ) : (
            <button
              key={e.id}
              type="button"
             
              onClick={() => onEdit(e)}
              aria-label={`${giftNameKm(e)} ${formatGiftAmount(e, lang) || e.description}`}
              className={cn(grid, line, "w-full cursor-pointer text-left transition-colors hover:bg-gold-soft/40 focus-visible:bg-gold-soft/40 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gold")}
            >
              {cells}
            </button>
          );
        })}
        {/* Unwritten lines, so every page looks like a page of the book. */}
        {Array.from({ length: fillers }, (_, i) => (
          <div key={`blank-${i}`} aria-hidden className={cn(grid, line)}>
            <span />
            <span className="border-l border-maroon/30" />
          </div>
        ))}
      </div>

      {/* Page foot: totals for this page and the page number */}
      <div className={cn(grid, "mt-1 border-t-[3px] border-double border-maroon/50 pt-1.5 text-[13px] leading-[1.6]")}>
        <span />
        <span className="border-l border-transparent pl-2 font-bold text-maroon lg:col-span-3">{blank ? "" : b.pageTotal}</span>
        <span className="truncate pr-1 text-right font-bold text-gold-ink tabular-nums">
          {!blank && page.khr ? <MaskedAmount hidden={totalsHidden}>{fmt(page.khr)}</MaskedAmount> : ""}
        </span>
        <span className="truncate pr-1 text-right font-bold text-jade-ink tabular-nums">
          {!blank && page.usdCents ? <MaskedAmount hidden={totalsHidden}>{formatUsdCents(page.usdCents, lang).slice(1)}</MaskedAmount> : ""}
        </span>
      </div>
      <p aria-hidden className="mt-2 text-center text-xs text-muted tabular-nums">— {fmt(index + 1)} —</p>
    </div>
  );
}

function subscribeWide(cb: () => void) {
  const m = window.matchMedia(WIDE_QUERY);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
}

/** True from Tailwind's `lg` width: show two pages side by side. */
function useIsWide() {
  return useSyncExternalStore(subscribeWide, () => window.matchMedia(WIDE_QUERY).matches, () => false);
}
