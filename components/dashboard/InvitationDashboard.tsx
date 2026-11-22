"use client";

import { useEffect, useMemo, useState } from "react";
import { ShareBar } from "@/components/share/ShareBar";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { TopBar } from "@/components/ui/TopBar";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import { useContent, useLanguage } from "@/lib/i18n";
import { formatKhmerDate, formatNumber, formatShortDate } from "@/lib/khmer";
import { getRsvpStats, getTemplate, templates, type Rsvp } from "@/lib/mock-data";
import { getRsvps, getViewCount, type Draft } from "@/lib/store";
import { dashboardContent } from "./content";

type Filter = "all" | "yes" | "no";

/** Excel needs a BOM to read UTF-8 (Khmer names) correctly. */
function toCsv(rows: Rsvp[]) {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const header = ["Name", "Attending", "People", "Message", "Date"];
  const lines = rows.map((r) => [r.guestName, r.attending ? "Yes" : "No", r.attending ? r.partySize : 0, r.message ?? "", r.createdAt].map(esc).join(","));
  return "﻿" + [header.map(esc).join(","), ...lines].join("\r\n");
}

export function InvitationDashboard({ invitation: inv }: { invitation: Draft }) {
  const c = useContent(dashboardContent).detail;
  const { lang, t } = useLanguage();
  const { showToast } = useToast();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

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
  const live = inv.status === "live";

  function exportCsv() {
    const file = `rsvp-${inv.slug}.csv`;
    const href = URL.createObjectURL(new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" }));
    Object.assign(document.createElement("a"), { href, download: file }).click();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
    showToast(c.csvDone(file));
  }

  const tiles = [
    { label: c.stats.opened, value: stats.opened, cls: "text-charcoal" },
    { label: c.stats.attending, value: stats.attending, cls: "text-jade-ink" },
    { label: c.stats.notAttending, value: stats.notAttending, cls: "text-maroon" },
    { label: c.stats.total, value: stats.totalGuests, cls: "text-gold-ink" },
  ];
  const filters: [Filter, string][] = [["all", c.all], ["yes", t.rsvp.attending], ["no", t.rsvp.notAttending]];

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b border-line bg-ivory px-3 py-2 lg:bg-white lg:px-6">
        <div className="mx-auto max-w-[1200px]">
          <TopBar backHref="/app" title={<span lang="en">{names}</span>} />
        </div>
      </header>

      <main className="mx-auto flex max-w-[1200px] flex-col gap-3.5 px-4 pt-3.5 pb-10 lg:gap-5 lg:px-6 lg:pt-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold lg:text-[26px]">
              <span lang="km">{short(inv.groomKm)} &amp; {short(inv.brideKm)}</span> · <span lang="en">{names}</span>
            </h1>
            <p className="text-[13px] text-muted lg:text-sm">
              {t.eventType[tpl.eventType]} · <span lang="km">{formatKhmerDate(inv.eventDate)}</span> · <span lang={lang}>{lang === "km" ? inv.venueNameKm || inv.venueNameEn : inv.venueNameEn}</span>
            </p>
            <div className="mt-1 flex gap-1.5">
              <StatusBadge status={inv.status} />
              {live && <StatusBadge status="paid" />}
            </div>
          </div>
          <ButtonLink href={`/app/${inv.id}/edit`} variant="secondary" size="sm" className="hidden lg:inline-flex">{c.edit}</ButtonLink>
        </div>

        {live ? (
          <ShareBar slug={inv.slug} title={names} />
        ) : (
          <div className="flex flex-col gap-2 rounded-card bg-white p-4 shadow-card">
            <p className="text-sm text-muted">{c.draftNote}</p>
            <ButtonLink href={`/app/${inv.id}/pay`}>{c.publishCta}</ButtonLink>
          </div>
        )}

        <ul className="grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-4">
          {tiles.map((s) => (
            <li key={s.label} className="rounded-card bg-white p-3 shadow-card lg:p-[18px]">
              <div className="text-xs font-semibold text-muted lg:text-[13px]">{s.label}</div>
              <div className={cn("text-[26px] leading-[1.3] font-bold lg:text-[34px]", s.cls)}>{formatNumber(s.value, lang)}</div>
            </li>
          ))}
        </ul>

        <ButtonLink href={`/app/${inv.id}/edit`} variant="secondary" fullWidth className="lg:hidden">{c.edit}</ButtonLink>

        <section aria-labelledby="rsvp-title" className="rounded-card bg-white shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 lg:px-5 lg:py-4">
            <h2 id="rsvp-title" className="text-base font-bold lg:text-lg">
              {c.rsvps} ({formatNumber(rows.length, lang)})
            </h2>
            <button
              type="button"
              onClick={exportCsv}
              disabled={rows.length === 0}
              className="min-h-11 cursor-pointer rounded-card border-[1.5px] border-maroon bg-white px-4 text-sm font-semibold text-maroon disabled:opacity-40 lg:order-last"
            >
              {c.csv}
            </button>
            <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto">
              <div className="relative w-full lg:w-60">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden className="absolute top-[15px] left-3 text-muted">
                  <circle cx="11" cy="11" r="7" />
                  <path d="M21 21l-4.3-4.3" />
                </svg>
                <input
                  type="search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={c.search}
                  aria-label={c.searchLabel}
                  className="min-h-12 w-full rounded-card border-[1.5px] border-line-strong bg-white pr-3 pl-10 text-[15px] outline-none focus:border-maroon"
                />
              </div>
              <div role="group" aria-label={c.rsvps} className="flex gap-2 overflow-x-auto">
                {filters.map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={filter === value}
                    onClick={() => setFilter(value)}
                    className={cn(
                      "min-h-11 shrink-0 cursor-pointer rounded-full border-[1.5px] px-4 text-sm font-semibold whitespace-nowrap",
                      filter === value ? "border-charcoal bg-charcoal text-white" : "border-line-strong bg-white text-charcoal",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {all === null ? (
            <div aria-busy className="flex flex-col gap-3 px-4 pb-5">
              {[0, 1, 2].map((i) => <div key={i} className="h-10 animate-pulse rounded-card bg-sand" />)}
            </div>
          ) : all.length === 0 ? (
            <p className="px-4 pb-6 text-center text-sm text-muted">{c.noRsvps}</p>
          ) : rows.length === 0 ? (
            <p role="status" className="px-4 pb-6 text-center text-sm text-muted">{c.noMatch}</p>
          ) : (
            <>
              {/* Mobile: cards */}
              <ul className="flex flex-col lg:hidden">
                {rows.map((r) => (
                  <li key={r.id} className="flex gap-3 border-t border-sand px-3.5 py-3">
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
                  </li>
                ))}
              </ul>

              {/* Desktop: table */}
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-t border-line bg-sand-light text-xs text-muted">
                      <th scope="col" className="px-5 py-2.5 font-semibold">{c.cols.name}</th>
                      <th scope="col" className="px-3 py-2.5 font-semibold">{c.cols.status}</th>
                      <th scope="col" className="px-3 py-2.5 font-semibold">{c.cols.people}</th>
                      <th scope="col" className="px-3 py-2.5 font-semibold">{c.cols.message}</th>
                      <th scope="col" className="px-5 py-2.5 font-semibold">{c.cols.date}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.id} className="border-t border-sand">
                        <td className="px-5 py-3 font-semibold">{r.guestName}</td>
                        <td className="px-3 py-3">
                          <Badge tone={r.attending ? "jade" : "rose"}>{r.attending ? t.rsvp.attending : t.rsvp.notAttending}</Badge>
                        </td>
                        <td className="px-3 py-3">{r.attending ? formatNumber(r.partySize, lang) : "—"}</td>
                        <td className="px-3 py-3 text-ink-soft">{r.message ?? ""}</td>
                        <td className="px-5 py-3 whitespace-nowrap text-muted">{formatShortDate(r.createdAt, lang)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
