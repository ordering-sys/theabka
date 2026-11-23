"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/Motion";
import { StatusBadge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Header";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { useContent, useLanguage } from "@/lib/i18n";
import { formatNumber, formatNumericDate } from "@/lib/khmer";
import { getRsvpStats, getTemplate, templates } from "@/lib/mock-data";
import { getRsvps, listInvitations, signOut as storeSignOut, type Draft, type Session } from "@/lib/store";
import { DashboardSkeleton } from "./RequireSession";
import { dashboardContent } from "./content";

type Row = Draft & { going: number };

/** Given name for cards ("Sok Dara" -> "Dara"); a dash until the host fills it in. */
const short = (name: string) => name.trim().split(/\s+/).at(-1) || "—";

export function InvitationList({ session }: { session: Session }) {
  const c = useContent(dashboardContent);
  const { lang, t } = useLanguage();
  const [list, setList] = useState<Row[] | null>(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      const invs = await listInvitations(session.userId).catch(() => []);
      // Attending guests for live invitations, shown on each card.
      const rows = await Promise.all(
        invs.map(async (inv) => ({
          ...inv,
          going: inv.status === "live" ? getRsvpStats(await getRsvps(inv.id).catch(() => [])).totalGuests : 0,
        })),
      );
      if (alive) setList(rows);
    })();
    return () => {
      alive = false;
    };
  }, [session.userId]);
  // Khmer names put the given name last ("Sok Dara" -> "Dara").
  const firstName = session.name?.split(/\s+/).at(-1);
  const avatar = (session.name || session.email || "?").charAt(0).toUpperCase();

  async function signOut() {
    await storeSignOut();
    // Full reload so no page kept alive by navigation still holds this user's data.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/";
  }

  return (
    <div className="min-h-dvh">
      <header className="border-b border-line bg-ivory lg:bg-white">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-3 px-4 py-2.5 lg:px-6">
          <Logo />
          <div className="flex items-center gap-2 lg:gap-3">
            <LanguageToggle />
            <ButtonLink href="/app/new" size="sm" className="hidden lg:inline-flex">+ {c.newInv}</ButtonLink>
            <details className="relative">
              <summary aria-label={c.account} className="flex size-11 cursor-pointer list-none items-center justify-center rounded-full [&::-webkit-details-marker]:hidden">
                <span aria-hidden className="flex size-9 items-center justify-center rounded-full bg-gold text-sm font-bold text-charcoal">
                  {avatar}
                </span>
              </summary>
              <div className="absolute right-0 z-20 mt-1 min-w-44 rounded-card bg-white p-1.5 shadow-card ring-1 ring-line">
                <div lang="en" className="truncate px-3 py-2 text-xs text-muted">{session.email ?? "Google"}</div>
                <button type="button" onClick={signOut} className="flex min-h-11 w-full cursor-pointer items-center rounded-lg px-3 text-left text-sm font-semibold text-maroon hover:bg-sand-light">
                  {c.signOut}
                </button>
              </div>
            </details>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] px-4 py-2 lg:px-6 lg:py-6">
        <Reveal onMount>
          <h1 className="text-[22px] font-bold lg:text-[26px]">{c.myInv}</h1>
          <p className="mb-3.5 text-[13px] text-muted lg:text-sm">{firstName ? c.hello(firstName) : c.helloNew}</p>
        </Reveal>

        {list === null ? (
          <DashboardSkeleton />
        ) : list.length === 0 ? (
          <EmptyState />
        ) : (
          <Stagger as="ul" onMount stagger={0.07} className="flex flex-col gap-2.5 lg:grid lg:grid-cols-2 lg:gap-4">
            {list.map((inv) => {
              const tpl = getTemplate(inv.templateId) ?? templates[0];
              const live = inv.status === "live";
              const href = live ? `/app/${inv.id}/dashboard` : `/app/${inv.id}/edit`;
              return (
                <StaggerItem as="li" key={inv.id} whileHover={{ y: -3 }} whileTap={{ scale: 0.985 }}>
                  <Link href={href} className="flex items-center gap-3 rounded-card bg-white p-3 text-charcoal no-underline shadow-card hover:ring-1 hover:ring-line-strong">
                    <span aria-hidden className="h-[84px] w-16 shrink-0 rounded-lg p-1" style={{ background: tpl.theme.bg }}>
                      <span
                        lang="en"
                        className="flex h-full items-center justify-center rounded-[5px] border text-center font-serif text-[11px] leading-tight italic"
                        style={{ borderColor: tpl.theme.accent, color: tpl.theme.fg }}
                      >
                        {short(inv.groomEn).charAt(0)}&amp;{short(inv.brideEn).charAt(0)}
                      </span>
                    </span>
                    <span className="min-w-0 grow">
                      <span className="flex flex-wrap gap-1.5">
                        <StatusBadge status={inv.status} />
                        {live && <StatusBadge status="paid" />}
                      </span>
                      <span className="mt-0.5 block truncate text-[15px] font-bold">
                        <span lang="km">{short(inv.groomKm)} &amp; {short(inv.brideKm)}</span>
                        {" · "}
                        <span lang="en">{short(inv.groomEn)} &amp; {short(inv.brideEn)}</span>
                      </span>
                      <span className="block truncate text-xs text-muted">
                        {t.eventType[tpl.eventType]} ·{" "}
                        {live ? (
                          <>
                            {formatNumericDate(inv.eventDate, lang)} · {formatNumber(inv.going, lang)} {c.going}
                          </>
                        ) : (
                          c.notPublished
                        )}
                      </span>
                    </span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden className="shrink-0 text-muted">
                      <path d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </StaggerItem>
              );
            })}
            <StaggerItem as="li" className="lg:col-span-2" whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
              <Link
                href="/app/new"
                className="flex min-h-14 items-center justify-center gap-2 rounded-card border-[1.5px] border-dashed border-gold bg-white font-semibold text-maroon no-underline"
              >
                <span aria-hidden className="text-lg">+</span>
                {c.newInv}
              </Link>
            </StaggerItem>
          </Stagger>
        )}
      </main>
    </div>
  );
}

function EmptyState() {
  const c = useContent(dashboardContent).empty;
  return (
    <Stagger onMount stagger={0.08} className="mt-6 flex flex-col items-center gap-3 rounded-card bg-white px-6 py-10 text-center shadow-card">
      <StaggerItem variant="popIn">
        {/* Envelope bobs gently while waiting for the first invitation. */}
        <motion.span
          aria-hidden
          className="flex size-20 items-center justify-center rounded-full bg-gold-soft text-maroon"
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 3, ease: "easeInOut", repeat: Infinity }}
        >
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M4 6h16v12H4zM4 7l8 6 8-6" />
          </svg>
        </motion.span>
      </StaggerItem>
      <StaggerItem as="h2" className="text-lg font-bold">{c.title}</StaggerItem>
      <StaggerItem as="p" className="max-w-[320px] text-sm text-muted">{c.body}</StaggerItem>
      <StaggerItem><ButtonLink href="/app/new" className="mt-1">{c.cta}</ButtonLink></StaggerItem>
    </Stagger>
  );
}
