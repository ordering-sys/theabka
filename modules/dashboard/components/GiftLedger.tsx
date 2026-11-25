"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { ChevronRightIcon, GiftIcon, LockIcon } from "@/components/ui/Icons";
import { useContent, useLanguage } from "@/lib/i18n";
import { formatEnglishDate, formatKhmerDate, formatNumber } from "@/lib/khmer";
import { listGiftEntries, type Draft, type GiftEntry } from "@/lib/store";
import { dashboardContent } from "@/modules/dashboard/content";
import { formatKhr, formatUsdCents, giftTotals, type GiftLedgerAccess } from "@/modules/dashboard/lib/gift-ledger";
import { useGiftTotalsHidden } from "@/modules/dashboard/hooks/useGiftTotalsHidden";
import { MaskedAmount, TotalsToggle } from "./GiftTotals";

/**
 * The dashboard's "Gifts" tab: a closed gift book with its totals and a link to open it
 * (/app/[id]/gifts). Basic hosts see the feature locked, with the upgrade button.
 */
export function GiftLedger({ invitation: inv, access }: { invitation: Draft; access: GiftLedgerAccess }) {
  const c = useContent(dashboardContent).detail.gifts;
  const { lang, t } = useLanguage();
  const fmt = (n: number) => formatNumber(n, lang);
  const [entries, setEntries] = useState<GiftEntry[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [totalsHidden, setTotalsHidden] = useGiftTotalsHidden();

  useEffect(() => {
    if (!access.enabled) return;
    let alive = true;
    listGiftEntries(inv.id).then(
      (list) => alive && setEntries(list),
      () => alive && setFailed(true),
    );
    return () => {
      alive = false;
    };
  }, [inv.id, access.enabled]);

  const totals = useMemo(() => giftTotals(entries ?? []), [entries]);
  const href = `/app/${inv.id}/gifts`;
  const fmtDate = (d: string) => (lang === "km" ? formatKhmerDate(d) : formatEnglishDate(d));

  if (!access.enabled && !access.canUpgrade) return null;

  if (!access.enabled) {
    return (
      <div className="flex flex-col items-center gap-2 border-t border-line px-6 py-8 text-center">
        <BookCover locked />
        <h3 className="mt-2 flex items-center gap-2 text-base leading-[1.6] font-bold">
          {c.title}
          <Badge tone="gold">{t.tier.premium}</Badge>
        </h3>
        <p className="max-w-90 text-sm leading-[1.7] text-muted">{c.sub}</p>
        <p className="text-xs text-muted">{c.premiumOnly}</p>
        <ButtonLink href={`/app/${inv.id}/pay`} className="mt-2 leading-[1.6]">{c.upgrade}</ButtonLink>
      </div>
    );
  }

  const count = entries?.length ?? 0;

  return (
    <div className="border-t border-line">
      {access.readOnly && access.purgeOn && (
        <p role="status" className="flex items-start gap-2 border-b border-line bg-rose-soft/60 px-3.5 py-2.5 text-[13px] leading-[1.7] text-maroon lg:px-5">
          <LockIcon size={15} className="mt-1 shrink-0" />
          {c.readOnly(fmtDate(access.purgeOn))}
        </p>
      )}
      <div className="flex flex-col gap-4 px-3.5 py-4 sm:flex-row sm:items-center lg:px-5 lg:py-5">
        <Link href={href} aria-label={c.book.open} className="mx-auto shrink-0 rounded-card transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold sm:mx-0">
          <BookCover />
        </Link>

        <div className="flex min-w-0 grow flex-col gap-3">
          {entries === null && !failed ? (
            <div aria-busy className="h-16 motion-safe:animate-pulse rounded-card bg-sand" />
          ) : count === 0 || failed ? (
            <div className="text-center sm:text-left">
              <h3 className="text-base leading-[1.6] font-bold">{c.emptyTitle}</h3>
              <p className="text-sm leading-[1.7] text-muted">{c.book.openHint}</p>
            </div>
          ) : (
            <>
              <dl className="grid grid-cols-3 gap-2 rounded-card bg-ivory p-3">
                <div className="min-w-0">
                  <dt className="truncate text-[11.5px] font-semibold text-muted">{c.totals.khr}</dt>
                  <dd className="truncate text-base leading-[1.6] font-bold text-gold-ink lg:text-xl">
                    <MaskedAmount hidden={totalsHidden}>{formatKhr(totals.khr, lang)}</MaskedAmount>
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="truncate text-[11.5px] font-semibold text-muted">{c.totals.usd}</dt>
                  <dd className="truncate text-base leading-[1.6] font-bold text-jade-ink lg:text-xl">
                    <MaskedAmount hidden={totalsHidden}>{formatUsdCents(totals.usdCents, lang)}</MaskedAmount>
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="truncate text-[11.5px] font-semibold text-muted">{c.totals.givers}</dt>
                  <dd className="truncate text-base leading-[1.6] font-bold text-charcoal lg:text-xl">{fmt(totals.givers)}</dd>
                </div>
              </dl>
              <div className="flex flex-wrap items-center justify-between gap-x-3">
                <p className="text-xs leading-[1.7] text-muted">
                  {c.count(fmt(count))}
                  {totals.items > 0 && <> · {c.totals.items(fmt(totals.items))}</>} · {c.totalsNote}
                </p>
                <TotalsToggle hidden={totalsHidden} onToggle={setTotalsHidden} className="-mr-2" />
              </div>
            </>
          )}
          <ButtonLink href={href} className="leading-[1.6] sm:self-start">
            <GiftIcon size={17} />
            {c.book.open}
            <ChevronRightIcon size={16} />
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}

/** A small closed gift book: maroon cover, gold frame, title in Moul. */
function BookCover({ locked = false }: { locked?: boolean }) {
  return (
    <span aria-hidden className="relative flex h-32 w-24 shrink-0 flex-col items-center justify-center gap-1 rounded-r-lg rounded-l-sm bg-maroon px-2 text-center shadow-lift">
      {/* Spine */}
      <span className="absolute inset-y-0 left-0 w-2 rounded-l-sm bg-linear-to-r from-charcoal/30 to-transparent" />
      <span className="absolute inset-1.5 left-3 rounded-[5px] border border-gold/70" />
      <span lang="km" className="relative font-moul text-[11px] leading-[1.9] text-gold-light">សៀវភៅ<br />ចំណងដៃ</span>
      <span className="relative h-px w-8 bg-gold/70" />
      {locked ? <LockIcon size={14} className="relative text-gold-light" /> : <GiftIcon size={14} className="relative text-gold-light" />}
    </span>
  );
}
