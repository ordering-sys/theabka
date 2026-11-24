"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/Motion";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Header } from "@/components/ui/Header";
import { ChevronRightIcon, ClockIcon, EditIcon, MailIcon, PlusIcon, UserIcon } from "@/components/ui/Icons";
import { useContent, useLanguage } from "@/lib/i18n";
import { formatNumber, formatNumericDate } from "@/lib/khmer";
import { getRsvpStats, getTemplate, templates } from "@/lib/mock-data";
import { getRsvps, listInvitations, type Draft, type Session } from "@/lib/store";
import { DashboardSkeleton } from "@/modules/auth/components/RequireSession";
import { dashboardContent, type DashboardContent } from "@/modules/dashboard/content";
import { AccountMenu } from "./AccountMenu";

type Row = Draft & { going: number };

/** Given name for cards ("Sok Dara" -> "Dara"); a dash until the host fills it in. */
const short = (name: string) => name.trim().split(/\s+/).at(-1) || "—";

/** Whole days from today (local time) to a YYYY-MM-DD date; null when unset. */
function daysUntil(date: string): number | null {
  if (!date) return null;
  const [y, m, d] = date.split("-").map(Number);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((new Date(y, m - 1, d).getTime() - today.getTime()) / 86_400_000);
}

export function InvitationList({ session }: { session: Session }) {
  const c = useContent(dashboardContent);
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

  return (
    <div className="min-h-dvh">
      <Header end={<AccountMenu session={session} />} />

      <main className="mx-auto max-w-[1200px] px-4 pt-3 pb-10 lg:px-6 lg:pt-8">
        <Reveal onMount className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-[24px] leading-[1.6] font-bold lg:text-[30px]">{c.myInv}</h1>
            <p className="text-[13px] text-muted lg:text-[15px]">{firstName ? c.hello(firstName) : c.helloNew}</p>
          </div>
          {list && list.length > 0 && (
            <ButtonLink href="/app/new" className="hidden lg:inline-flex">
              <PlusIcon size={18} />
              {c.newInv}
            </ButtonLink>
          )}
        </Reveal>

        <div className="mt-5 lg:mt-8">
          {list === null ? (
            <DashboardSkeleton />
          ) : list.length === 0 ? (
            <EmptyState />
          ) : (
            <Stagger as="ul" onMount stagger={0.07} className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 lg:gap-5">
              {list.map((inv) => (
                <StaggerItem as="li" key={inv.id} whileHover={{ y: -3 }} whileTap={{ scale: 0.985 }}>
                  <InvitationCard inv={inv} c={c} />
                </StaggerItem>
              ))}
              <StaggerItem as="li" whileTap={{ scale: 0.98 }}>
                <Link
                  href="/app/new"
                  className="group flex h-full min-h-16 items-center justify-center gap-3 rounded-card border-[1.5px] border-dashed border-gold bg-white/60 p-4 font-semibold text-maroon no-underline transition-colors hover:bg-white md:min-h-[188px] md:flex-col"
                >
                  <span aria-hidden className="flex size-10 items-center justify-center rounded-full bg-gold-soft text-maroon transition-transform group-hover:scale-110 md:size-12">
                    <PlusIcon size={22} />
                  </span>
                  {c.newInv}
                </Link>
              </StaggerItem>
            </Stagger>
          )}
        </div>
      </main>
    </div>
  );
}

function InvitationCard({ inv, c }: { inv: Row; c: DashboardContent }) {
  const { lang, t } = useLanguage();
  const tpl = getTemplate(inv.templateId) ?? templates[0];
  const live = inv.status === "live";
  const href = live ? `/app/${inv.id}/dashboard` : `/app/${inv.id}/edit`;
  const days = daysUntil(inv.eventDate);
  const countdown =
    days === null ? null : days < 0 ? c.past : days === 0 ? c.today : days === 1 ? c.tomorrow : c.daysLeft(formatNumber(days, lang));

  return (
    <Link
      href={href}
      className="group flex h-full flex-col rounded-card bg-white text-charcoal no-underline shadow-card ring-1 ring-transparent transition-shadow hover:shadow-lift hover:ring-line"
    >
      <div className="flex gap-3.5 p-3.5">
        {/* Mini cover in the template's own palette (data, so inline styles). */}
        <span aria-hidden className="h-[100px] w-[76px] shrink-0 rounded-lg p-1 shadow-sm" style={{ background: tpl.theme.bg }}>
          <span
            lang="en"
            className="flex h-full flex-col items-center justify-center gap-1 rounded-[5px] border text-center"
            style={{ borderColor: tpl.theme.accent, color: tpl.theme.fg }}
          >
            <span className="font-serif text-[15px] leading-none italic">
              {short(inv.groomEn).charAt(0)}&amp;{short(inv.brideEn).charAt(0)}
            </span>
            <span className="h-px w-6" style={{ background: tpl.theme.accent }} />
          </span>
        </span>

        <span className="flex min-w-0 grow flex-col">
          <span className="flex flex-wrap items-center gap-1.5">
            <StatusBadge status={inv.status} />
            {live && <StatusBadge status="paid" />}
          </span>
          <span lang="km" className="mt-1.5 block truncate text-[16px] leading-[1.6] font-bold">
            {short(inv.groomKm)} &amp; {short(inv.brideKm)}
          </span>
          <span lang="en" className="block truncate font-serif text-[15px] leading-snug text-ink-soft italic">
            {short(inv.groomEn)} &amp; {short(inv.brideEn)}
          </span>
          <span className="mt-1 block truncate text-xs text-muted">
            {t.eventType[tpl.eventType]} · {inv.eventDate ? formatNumericDate(inv.eventDate, lang) : c.noDate}
          </span>
        </span>
      </div>

      <span className="mt-auto flex min-h-12 items-center justify-between gap-2 border-t border-line px-3.5 py-2 text-[13px]">
        <span className="flex min-w-0 items-center gap-2 text-muted">
          {live ? (
            <>
              <span className="flex items-center gap-1 font-semibold text-jade-ink">
                <UserIcon size={15} />
                {formatNumber(inv.going, lang)} {c.going}
              </span>
              {countdown && (
                <Badge tone={days !== null && days < 0 ? "neutral" : "gold"} className="truncate">
                  <ClockIcon size={12} />
                  {countdown}
                </Badge>
              )}
            </>
          ) : (
            <span className="truncate">{c.notPublished}</span>
          )}
        </span>
        <span className="flex shrink-0 items-center gap-1 font-semibold text-maroon">
          {!live && <EditIcon size={14} />}
          {live ? c.manage : c.continueEdit}
          <ChevronRightIcon size={16} className="transition-transform group-hover:translate-x-0.5" />
        </span>
      </span>
    </Link>
  );
}

function EmptyState() {
  const c = useContent(dashboardContent).empty;
  return (
    <Stagger onMount stagger={0.08} className="mx-auto mt-6 flex max-w-[460px] flex-col items-center gap-2.5 rounded-card bg-white px-6 py-10 text-center shadow-card lg:mt-10 lg:py-14">
      <StaggerItem variant="popIn">
        <span aria-hidden className="flex size-[112px] items-center justify-center rounded-full bg-gold-soft text-maroon ring-8 ring-gold-soft/40">
          <MailIcon size={54} strokeWidth={1.1} />
        </span>
      </StaggerItem>
      <StaggerItem as="h2" className="mt-3 text-lg leading-[1.6] font-bold">{c.title}</StaggerItem>
      <StaggerItem as="p" className="max-w-[320px] text-sm text-muted">{c.body}</StaggerItem>
      <StaggerItem className="mt-3 w-full sm:w-auto">
        <ButtonLink href="/app/new" fullWidth className="sm:w-auto">
          <PlusIcon size={18} />
          {c.cta}
        </ButtonLink>
      </StaggerItem>
    </Stagger>
  );
}
