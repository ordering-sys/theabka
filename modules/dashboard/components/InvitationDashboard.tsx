"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CountUp, EASE, Reveal, Stagger, StaggerItem } from "@/components/motion/Motion";
import { ShareBar } from "@/modules/share/components/ShareBar";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { CheckIcon, ChevronRightIcon, ClockIcon, CloseIcon, DownloadIcon, EditIcon, EyeIcon, MailIcon, PinIcon, SparkleIcon, UserIcon } from "@/components/ui/Icons";
import { Lotus } from "@/components/invitation/TemplateArt";
import { TopBar } from "@/components/ui/TopBar";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import { useContent, useLanguage } from "@/lib/i18n";
import { formatEnglishDate, formatKhmerDate, formatNumber, formatNumericDate, formatShortDate, toKhmerNumerals } from "@/lib/khmer";
import { buildRsvpReportHtml, type ReportInfo } from "@/modules/dashboard/lib/rsvp-export";
import { buildRsvpXlsx } from "@/modules/dashboard/lib/rsvp-xlsx";
import { getRsvpStats, getTemplate, templates, type Rsvp } from "@/lib/mock-data";
import { getRsvps, getViewCount, type Draft, type Session } from "@/lib/store";
import { AccountMenu } from "./AccountMenu";
import { dashboardContent } from "@/modules/dashboard/content";
import { inputClass } from "@/components/ui/field";

type Filter = "all" | "yes" | "no";

export function InvitationDashboard({ invitation: inv, session }: { invitation: Draft; session: Session }) {
  const c = useContent(dashboardContent).detail;
  const { lang, t } = useLanguage();
  const { showToast } = useToast();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const exportMenu = useRef<HTMLDetailsElement>(null);

  const [all, setAll] = useState<Rsvp[] | null>(null);
  const [opened, setOpened] = useState(0);
  useEffect(() => {
    let alive = true;
    Promise.all([getRsvps(inv.id).catch(() => []), getViewCount(inv.id).catch(() => 0)]).then(([list, views]) => {
      if (!alive) return;
      setAll([...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      setOpened(views);
    });
    return () => {
      alive = false;
    };
  }, [inv.id]);
  const stats = { ...getRsvpStats(all ?? []), opened };

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (all ?? []).filter((r) => (filter === "all" || (filter === "yes") === r.attending) && (!needle || r.guestName.toLowerCase().includes(needle)));
  }, [all, q, filter]);

  const tpl = getTemplate(inv.templateId) ?? templates[0];
  const short = (s: string) => s.split(" ").at(-1) || s;
  const names = `${short(inv.groomEn)} & ${short(inv.brideEn)}`;
  const namesKm = `${short(inv.groomKm)} & ${short(inv.brideKm)}`;
  const venue = lang === "km" ? inv.venueNameKm || inv.venueNameEn : inv.venueNameEn || inv.venueNameKm;
  const live = inv.status === "live";
  const chip = "flex items-center gap-1.5 rounded-full bg-sand-light px-3 py-1 leading-[1.6]";

  /** What the host sees right now (filter + search) is what gets exported. */
  function reportInfo(): ReportInfo {
    const r = c.report;
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const time = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    return {
      fileBase: `rsvp-${inv.slug}`,
      namesKm,
      namesEn: names,
      eventDate: inv.eventDate ? (lang === "km" ? formatKhmerDate(inv.eventDate) : formatEnglishDate(inv.eventDate)) : "",
      venue,
      filter: (filters.find(([v]) => v === filter)?.[1] ?? c.all) + (q.trim() ? ` · “${q.trim()}”` : ""),
      exportedAt: `${formatNumericDate(today, lang)} ${lang === "km" ? toKhmerNumerals(time) : time}`,
      stats: getRsvpStats(rows),
      rows,
      labels: {
        ...r,
        attending: t.rsvp.attending,
        notAttending: t.rsvp.notAttending,
        totalGuests: c.stats.total,
        cols: { no: r.no, ...c.cols },
        brand: "TheabKa",
      },
    };
  }

  async function exportXlsx() {
    const info = reportInfo();
    const file = `${info.fileBase}.xlsx`;
    try {
      const data = await buildRsvpXlsx(info);
      const href = URL.createObjectURL(new Blob([data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
      Object.assign(document.createElement("a"), { href, download: file }).click();
      setTimeout(() => URL.revokeObjectURL(href), 1000);
      showToast(c.csvDone(file));
    } catch {
      showToast(c.export.failed);
    }
  }

  /** Prints the report from a hidden iframe; the print dialog's "Save as PDF" makes the file. */
  function exportPdf() {
    const doc = buildRsvpReportHtml(reportInfo(), {
      lang,
      number: (n) => formatNumber(n, lang),
      date: (d) => formatNumericDate(d, lang),
    });
    const frame = document.createElement("iframe");
    frame.setAttribute("aria-hidden", "true");
    frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
    frame.srcdoc = doc;
    frame.onload = async () => {
      const win = frame.contentWindow;
      if (!win) return;
      // Wait for the Khmer webfonts, or the PDF falls back to a system font.
      await Promise.all([
        win.document.fonts.load("16px 'Kantumruy Pro'"),
        win.document.fonts.load("16px Moul"),
        win.document.fonts.ready,
      ]).catch(() => {});
      const cleanup = () => setTimeout(() => frame.remove(), 500);
      win.addEventListener("afterprint", cleanup, { once: true });
      setTimeout(() => frame.isConnected && frame.remove(), 120_000);
      win.focus();
      win.print();
    };
    document.body.appendChild(frame);
    showToast(c.export.pdfToast);
  }

  function runExport(kind: "xlsx" | "pdf", menu: HTMLDetailsElement | null) {
    if (menu) menu.open = false;
    if (kind === "xlsx") exportXlsx();
    else exportPdf();
  }

  const replies = stats.attending + stats.notAttending;
  const pct = (n: number, of: number) => (of > 0 ? Math.min(100, Math.round((n / of) * 100)) : 0);
  const fmt = (n: number) => formatNumber(n, lang);
  const replyRate = pct(replies, stats.opened);
  const yesPct = pct(stats.attending, replies);
  const noPct = pct(stats.notAttending, replies);
  const tiles = [
    { label: c.stats.opened, value: stats.opened, cls: "text-charcoal", chip: "bg-sand text-charcoal", bar: "bg-charcoal", Icon: EyeIcon, pct: replyRate, sub: c.sub.replyRate(fmt(replyRate)) },
    { label: c.stats.attending, value: stats.attending, cls: "text-jade-ink", chip: "bg-jade-soft text-jade-ink", bar: "bg-jade", Icon: CheckIcon, pct: yesPct, sub: c.sub.ofReplies(fmt(yesPct)) },
    { label: c.stats.notAttending, value: stats.notAttending, cls: "text-maroon", chip: "bg-rose-soft text-maroon", bar: "bg-maroon", Icon: CloseIcon, pct: noPct, sub: c.sub.ofReplies(fmt(noPct)) },
    { label: c.stats.total, value: stats.totalGuests, cls: "text-gold-ink", chip: "bg-gold-soft text-gold-ink", bar: "bg-gold", Icon: UserIcon, pct: stats.totalGuests > 0 ? 100 : 0, sub: c.sub.companions },
  ];
  const filters: [Filter, string, number][] = [
    ["all", c.all, replies],
    ["yes", t.rsvp.attending, stats.attending],
    ["no", t.rsvp.notAttending, stats.notAttending],
  ];

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b border-line bg-white px-3 py-2 lg:px-6">
        <div className="mx-auto max-w-[1200px]">
          <TopBar backHref="/app" title={<span lang="en">{names}</span>} flags end={<AccountMenu session={session} />} />
        </div>
      </header>

      <main className="mx-auto flex max-w-[1200px] flex-col gap-3.5 px-4 pt-3.5 pb-10 lg:gap-5 lg:px-6 lg:pt-6">
        <Reveal onMount className="overflow-hidden rounded-card bg-white shadow-card">
          {/* Thin band in the template's colours ties the card to the invitation's look. */}
          <div aria-hidden className="h-1.5" style={{ background: `linear-gradient(90deg, ${tpl.theme.accent}, ${tpl.theme.bg === "#FFFFFF" ? tpl.theme.fg : tpl.theme.bg})` }} />
          <div className="flex items-center gap-4 p-4 lg:gap-6 lg:px-6 lg:py-5">
            {/* Mini cover in the template's own palette (data, so inline styles). */}
            <span
              aria-hidden
              className="h-27 w-20 shrink-0 rounded-lg p-1 shadow-card ring-1 ring-line lg:h-33 lg:w-24.5"
              style={{ background: tpl.theme.bg }}
            >
              <span
                lang="en"
                className="flex h-full flex-col items-center justify-center gap-1.5 rounded-[5px] border"
                style={{ borderColor: tpl.theme.accent, color: tpl.theme.fg }}
              >
                <Lotus size={20} color={tpl.theme.accent} strokeWidth={1.3} />
                <span className="font-serif text-lg leading-none italic lg:text-xl">
                  {short(inv.groomEn).charAt(0)}&amp;{short(inv.brideEn).charAt(0)}
                </span>
                <span className="h-px w-7" style={{ background: tpl.theme.accent }} />
              </span>
            </span>

            <div className="min-w-0 grow">
              <div className="flex flex-wrap items-center gap-1.5">
                <StatusBadge status={inv.status} />
                {live && <StatusBadge status="paid" />}
                <span className="hidden text-xs text-muted sm:inline">· {lang === "km" ? tpl.nameKm : tpl.nameEn}</span>
              </div>
              <h1 lang="km" className="mt-1 truncate text-xl leading-[1.6] font-bold text-charcoal lg:text-[30px]">{namesKm}</h1>
              {names !== namesKm && (
                <p lang="en" className="-mt-0.5 truncate font-serif text-base leading-snug text-gold-deep italic lg:text-xl">{names}</p>
              )}
              <ul className="mt-2.5 flex flex-wrap gap-1.5 text-xs text-ink-soft lg:mt-3 lg:gap-2 lg:text-[13px]">
                <li className={chip}>
                  <SparkleIcon size={14} className="text-gold-deep" />
                  {t.eventType[tpl.eventType]}
                </li>
                {inv.eventDate && (
                  <li className={chip}>
                    <ClockIcon size={14} className="text-gold-deep" />
                    <span lang={lang}>{lang === "km" ? formatKhmerDate(inv.eventDate) : formatEnglishDate(inv.eventDate)}</span>
                  </li>
                )}
                {venue && (
                  <li className={cn(chip, "min-w-0 max-w-full")}>
                    <PinIcon size={14} className="shrink-0 text-gold-deep" />
                    <span lang={lang} className="truncate">{venue}</span>
                  </li>
                )}
              </ul>
            </div>

            <ButtonLink href={`/app/${inv.id}/edit`} variant="secondary" size="sm" className="hidden shrink-0 lg:inline-flex">
              <EditIcon size={16} />
              {c.edit}
            </ButtonLink>
          </div>
        </Reveal>

        <Reveal onMount delay={0.08}>
          {live ? (
            <ShareBar slug={inv.slug} title={names} layout="wide" />
          ) : (
            <div className="flex flex-col gap-3 rounded-card bg-white p-4 shadow-card lg:flex-row lg:items-center lg:justify-between lg:px-5">
              <p className="text-sm text-muted">{c.draftNote}</p>
              <ButtonLink href={`/app/${inv.id}/pay`} className="lg:shrink-0">{c.publishCta}</ButtonLink>
            </div>
          )}
        </Reveal>

        <Stagger as="ul" onMount delay={0.15} stagger={0.07} className="grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-4">
          {tiles.map((s) => (
            <StaggerItem as="li" key={s.label} whileHover={{ y: -3 }} className="flex flex-col rounded-card bg-white p-3.5 shadow-card lg:p-5">
              <div className="flex items-start justify-between gap-2">
                <span className="truncate pt-1 text-xs font-semibold text-muted lg:text-[13px]">{s.label}</span>
                <span aria-hidden className={cn("flex size-9 shrink-0 items-center justify-center rounded-[10px] lg:size-10", s.chip)}>
                  <s.Icon size={18} />
                </span>
              </div>
              <CountUp
                value={s.value}
                format={(n) => formatNumber(n, lang)}
                className={cn("-mt-1 block text-[30px] leading-[1.3] font-bold tracking-tight lg:text-[38px]", s.cls)}
              />
              <div className="mt-auto pt-2">
                <div aria-hidden className="h-1.5 overflow-hidden rounded-full bg-sand-light">
                  <motion.div
                    className={cn("h-full rounded-full", s.bar)}
                    initial={{ width: 0 }}
                    animate={{ width: `${s.pct}%` }}
                    transition={{ duration: 0.9, ease: EASE, delay: 0.3 }}
                  />
                </div>
                <p className="mt-1.5 truncate text-[11.5px] text-muted lg:text-xs">{s.sub}</p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>

        <ButtonLink href={`/app/${inv.id}/edit`} variant="secondary" fullWidth className="lg:hidden">
          <EditIcon size={16} />
          {c.edit}
        </ButtonLink>

        <Reveal as="section" onMount delay={0.25} aria-labelledby="rsvp-title" className="overflow-hidden rounded-card bg-white shadow-card">
          <div className="flex items-center justify-between gap-3 px-3.5 py-3 lg:px-5 lg:py-4">
            <div className="flex items-center gap-3">
              <span aria-hidden className="hidden size-10 items-center justify-center rounded-[10px] bg-gold-soft text-maroon sm:flex">
                <MailIcon size={19} />
              </span>
              <div>
                <h2 id="rsvp-title" className="flex items-center gap-2 text-base leading-[1.6] font-bold lg:text-lg">
                  {c.rsvps}
                  <span className="rounded-full bg-maroon px-2 text-xs leading-[1.7] font-semibold text-white">{fmt(rows.length)}</span>
                </h2>
                <p className="hidden text-xs text-muted sm:block">{c.rsvpsHint}</p>
              </div>
            </div>
            {rows.length === 0 ? (
              <span aria-disabled className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-card border-[1.5px] border-line px-3.5 text-sm font-semibold text-maroon opacity-45">
                <DownloadIcon size={16} />
                {c.export.button}
              </span>
            ) : (
              <details ref={exportMenu} className="group relative shrink-0">
                <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1.5 rounded-card border-[1.5px] border-line px-3.5 text-sm font-semibold text-maroon transition-colors hover:border-line-strong hover:bg-sand-light group-open:border-line-strong group-open:bg-sand-light [&::-webkit-details-marker]:hidden">
                  <DownloadIcon size={16} />
                  {c.export.button}
                  <ChevronRightIcon size={14} className="rotate-90 transition-transform group-open:-rotate-90" />
                </summary>
                <div className="absolute right-0 z-20 mt-1.5 w-64 rounded-card bg-white p-1.5 shadow-lift ring-1 ring-line">
                  {([
                    ["xlsx", c.export.xlsx, c.export.xlsxHint, "bg-jade-soft text-jade-ink", "XLSX"],
                    ["pdf", c.export.pdf, c.export.pdfHint, "bg-rose-soft text-maroon", "PDF"],
                  ] as const).map(([kind, label, hint, tone, tag]) => (
                    <button
                      key={kind}
                      type="button"
                      onClick={() => runExport(kind, exportMenu.current)}
                      className="flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-left hover:bg-sand-light"
                    >
                      <span aria-hidden lang="en" className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold tracking-wide", tone)}>
                        {tag}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-charcoal">{label}</span>
                        <span className="block truncate text-xs text-muted">{hint}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </details>
            )}
          </div>

          <div className="flex flex-col gap-2.5 border-y border-line bg-sand-light/60 px-3.5 py-3 lg:flex-row lg:items-center lg:justify-between lg:px-5">
            <div className="relative w-full lg:w-80">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted">
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.3-4.3" />
              </svg>
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={c.search}
                aria-label={c.searchLabel}
                className={cn(inputClass, "min-h-11 bg-white pr-3 pl-10 text-[15px]")}
              />
            </div>
            {/* Segmented control: one pill track, the active option lifts out in white. */}
            <div role="group" aria-label={c.rsvps} className="flex rounded-card bg-sand p-1">
              {filters.map(([value, label, count]) => {
                const on = filter === value;
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setFilter(value)}
                    className={cn(
                      "flex min-h-10 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-[9px] px-3.5 text-[13px] font-semibold whitespace-nowrap transition-colors lg:flex-none",
                      on ? "bg-white text-charcoal shadow-card" : "text-muted hover:text-charcoal",
                    )}
                  >
                    {label}
                    <span className={cn("rounded-full px-1.5 text-[11px] leading-[1.6]", on ? "bg-maroon text-white" : "bg-white/70 text-muted")}>
                      {fmt(count)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {all === null ? (
            <div aria-busy className="flex flex-col gap-3 px-4 py-5">
              {[0, 1, 2].map((i) => <div key={i} className="h-10 motion-safe:animate-pulse rounded-card bg-sand" />)}
            </div>
          ) : all.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-10 text-center lg:py-14">
              <span aria-hidden className="relative flex size-20 items-center justify-center rounded-full bg-gold-soft text-maroon">
                <span className="absolute -inset-2.5 rounded-full border-[1.5px] border-dashed border-gold/50" />
                <MailIcon size={34} strokeWidth={1.4} />
              </span>
              <h3 className="mt-6 text-base leading-[1.6] font-bold">{c.noRsvpsTitle}</h3>
              <p className="mt-1 max-w-85 text-sm text-muted">{c.noRsvpsBody}</p>
            </div>
          ) : rows.length === 0 ? (
            <p role="status" className="px-4 py-8 text-center text-sm text-muted">{c.noMatch}</p>
          ) : (
            <>
              {/* Mobile: cards */}
              <ul className="flex flex-col lg:hidden">
                <AnimatePresence initial={false} mode="popLayout">
                {rows.map((r, i) => (
                  <motion.li
                    key={r.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0, transition: { duration: 0.3, ease: EASE, delay: Math.min(i, 8) * 0.03 } }}
                    exit={{ opacity: 0, transition: { duration: 0.15 } }}
                    className="flex gap-3 border-t border-sand px-3.5 py-3 first:border-t-0"
                  >
                    <span aria-hidden className={cn("flex size-9 shrink-0 items-center justify-center rounded-full font-bold", r.attending ? "bg-gold-soft text-gold-ink" : "bg-sand text-muted")}>
                      {r.guestName.charAt(0)}
                    </span>
                    <div className="min-w-0 grow">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-semibold">{r.guestName}</span>
                        <span className="shrink-0 text-xs text-muted">{formatShortDate(r.createdAt, lang)}</span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs">
                        <Badge tone={r.attending ? "jade" : "rose"}>{r.attending ? t.rsvp.attending : t.rsvp.notAttending}</Badge>
                        {r.attending && <span className="text-muted">{formatNumber(r.partySize, lang)} {c.people}</span>}
                      </div>
                      {r.message && <p className="mt-1 text-[13px] text-ink-soft">{r.message}</p>}
                    </div>
                  </motion.li>
                ))}
                </AnimatePresence>
              </ul>

              {/* Desktop: table */}
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="text-xs text-muted">
                      <th scope="col" className="px-5 py-2.5 font-semibold">{c.cols.name}</th>
                      <th scope="col" className="px-3 py-2.5 font-semibold">{c.cols.status}</th>
                      <th scope="col" className="px-3 py-2.5 font-semibold">{c.cols.people}</th>
                      <th scope="col" className="px-3 py-2.5 font-semibold">{c.cols.message}</th>
                      <th scope="col" className="px-5 py-2.5 font-semibold">{c.cols.date}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <motion.tr
                        key={r.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.25, delay: Math.min(i, 10) * 0.025 }}
                        className="border-t border-sand transition-colors hover:bg-ivory"
                      >
                        <td className="px-5 py-3 font-semibold">{r.guestName}</td>
                        <td className="px-3 py-3">
                          <Badge tone={r.attending ? "jade" : "rose"}>{r.attending ? t.rsvp.attending : t.rsvp.notAttending}</Badge>
                        </td>
                        <td className="px-3 py-3">{r.attending ? formatNumber(r.partySize, lang) : "—"}</td>
                        <td className="px-3 py-3 text-ink-soft">{r.message ?? ""}</td>
                        <td className="px-5 py-3 whitespace-nowrap text-muted">{formatShortDate(r.createdAt, lang)}</td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Reveal>
      </main>
    </div>
  );
}
