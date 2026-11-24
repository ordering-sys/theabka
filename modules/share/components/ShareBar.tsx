"use client";
/* eslint-disable @next/next/no-img-element -- generated QR data URL */

import Link from "next/link";
import QRCode from "qrcode";
import { useEffect, useRef, useState } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { CheckIcon, ChevronRightIcon, CopyIcon, ExternalIcon, LinkIcon, QrIcon, SendIcon } from "@/components/ui/Icons";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import { useContent } from "@/lib/i18n";
import { inviteUrl } from "@/lib/use-client";

const content = {
  en: { link: "Share link", send: "Send", copy: "Copy", copied: "Copied", copiedToast: "Link copied", messengerToast: "Link copied. Paste it in Messenger.", qr: "QR code", view: "View", viewInvite: "View invitation", qrTitle: "QR code for your invitation", qrHint: "Print it on cards or show it at the venue.", download: "Download QR image", close: "Close", qrAlt: "QR code linking to the invitation" },
  km: { link: "តំណចែករំលែក", send: "ផ្ញើ", copy: "ចម្លង", copied: "បានចម្លង", copiedToast: "បានចម្លងតំណ", messengerToast: "បានចម្លងតំណ។ សូមបិទភ្ជាប់ក្នុង Messenger។", qr: "QR", view: "មើល", viewInvite: "មើលធៀបការ", qrTitle: "កូដ QR សម្រាប់ធៀបការរបស់អ្នក", qrHint: "បោះពុម្ពលើកាត ឬបង្ហាញនៅកន្លែងកម្មវិធី។", download: "ទាញយករូប QR", close: "បិទ", qrAlt: "កូដ QR ភ្ជាប់ទៅធៀបការ" },
};

type Props = {
  slug: string;
  title: string;
  showView?: boolean;
  /** "wide": link and actions side by side from `lg` (dashboard). "stack" keeps the phone layout everywhere (pay success). */
  layout?: "stack" | "wide";
  /** Small line inside the card under the link, e.g. how long the link stays online. */
  note?: React.ReactNode;
  className?: string;
};

/**
 * Copy link + Telegram / Messenger / QR / View. Used on the pay success screen and the dashboard.
 * "wide" on desktop: Copy plus one "Send" menu, so the card stays calm.
 */
export function ShareBar({ slug, title, showView = true, layout = "stack", note, className }: Props) {
  const wide = layout === "wide";
  const c = useContent(content);
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const sendMenu = useRef<HTMLDetailsElement>(null);
  const url = inviteUrl(slug);
  const display = url.replace(/^https?:\/\//, "");

  async function copy(toast = c.copiedToast) {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Clipboard blocked (e.g. insecure context): the toast still tells them what happened.
    }
    setCopied(true);
    showToast(toast);
    setTimeout(() => setCopied(false), 2000);
  }

  async function messenger() {
    // The share sheet reaches Messenger on phones; desktop falls back to copying.
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        return; // user cancelled
      }
    }
    copy(c.messengerToast);
  }

  const telegram = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`;
  const tile = cn(
    "flex min-h-11 min-w-16 flex-1 flex-col items-center gap-1 text-xs font-semibold text-charcoal no-underline cursor-pointer",
    wide && "lg:h-13 lg:flex-none lg:flex-row lg:gap-2.5 lg:rounded-card lg:border-[1.5px] lg:border-line lg:bg-white lg:pr-4 lg:pl-2 lg:text-[13px] lg:transition-colors lg:hover:border-line-strong lg:hover:bg-sand-light",
  );
  const icon = "flex size-11 items-center justify-center rounded-full";
  const menuItem = "flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-left text-sm font-semibold text-charcoal no-underline hover:bg-sand-light";
  const menuIcon = "flex size-8 shrink-0 items-center justify-center rounded-full";
  const closeSendMenu = () => sendMenu.current?.removeAttribute("open");
  // "theabka.com/i/dara-sophea": muted host, bold slug.
  const cut = display.indexOf("/i/");
  const host = cut >= 0 ? display.slice(0, cut + 3) : "";
  const path = cut >= 0 ? display.slice(cut + 3) : display;

  return (
    <div className={cn("rounded-card bg-white p-3 shadow-card lg:p-4", wide && "lg:px-5 lg:py-4", className)}>
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-semibold text-muted">{c.link}</div>
        {wide && showView && (
          <Link href={`/i/${slug}`} target="_blank" className="hidden items-center gap-1 text-[13px] font-semibold text-maroon no-underline hover:underline lg:flex">
            {c.viewInvite}
            <ExternalIcon size={14} />
          </Link>
        )}
      </div>
      <div className={cn(wide && "lg:mt-1.5 lg:flex lg:items-center lg:gap-3")}>
        <div
          className={cn(
            "mt-1 flex items-center gap-2",
            wide && "rounded-card border-[1.5px] border-line bg-ivory py-1 pr-1 pl-1.5 lg:mt-0 lg:h-13 lg:min-w-0 lg:grow",
          )}
        >
          {wide && (
            <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-[9px] bg-gold-soft text-gold-deep">
              <LinkIcon size={17} />
            </span>
          )}
          <div lang="en" className="min-w-0 grow truncate text-sm">
            <span className="text-muted">{host}</span>
            <span className="font-semibold text-charcoal">{path}</span>
          </div>
          <button
            type="button"
            onClick={() => copy()}
            className={cn(
              "flex min-h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-[10px] px-3.5 text-[13px] font-semibold text-white transition-colors",
              copied ? "bg-jade" : "bg-maroon hover:bg-maroon-dark",
            )}
          >
            {copied ? <CheckIcon size={15} /> : <CopyIcon size={15} />}
            {copied ? c.copied : c.copy}
          </button>
        </div>
        {wide && (
          // Desktop: one menu instead of three tiles.
          <details ref={sendMenu} className="group relative hidden shrink-0 lg:block">
            <summary className="flex h-13 cursor-pointer list-none items-center gap-2 rounded-card border-[1.5px] border-line bg-white px-4 text-[13px] font-semibold text-charcoal transition-colors hover:border-line-strong hover:bg-sand-light group-open:border-line-strong group-open:bg-sand-light [&::-webkit-details-marker]:hidden">
              <SendIcon size={16} className="text-maroon" />
              {c.send}
              <ChevronRightIcon size={14} className="rotate-90 transition-transform group-open:-rotate-90" />
            </summary>
            <div className="absolute right-0 z-20 mt-1.5 w-56 rounded-card bg-white p-1.5 shadow-lift ring-1 ring-line">
              <a href={telegram} target="_blank" rel="noreferrer" onClick={closeSendMenu} className={menuItem}>
                <span className={cn(menuIcon, "bg-telegram text-white")}><SendIcon size={15} /></span>
                Telegram
              </a>
              <button type="button" onClick={() => { closeSendMenu(); void messenger(); }} className={menuItem}>
                <span className={cn(menuIcon, "bg-messenger text-white")}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M12 2C6.5 2 2 6.1 2 11.2c0 2.9 1.4 5.4 3.7 7.1V22l3.4-1.9c.9.3 1.9.4 2.9.4 5.5 0 10-4.1 10-9.2S17.5 2 12 2zm1 12.4l-2.6-2.7-5 2.7 5.5-5.8 2.6 2.7 4.9-2.7-5.4 5.8z" />
                  </svg>
                </span>
                Messenger
              </button>
              <button type="button" onClick={() => { closeSendMenu(); setQrOpen(true); }} className={menuItem}>
                <span className={cn(menuIcon, "bg-charcoal text-white")}><QrIcon size={15} /></span>
                {c.qr}
              </button>
            </div>
          </details>
        )}
        <div className={cn("mt-2.5 flex", wide && "lg:hidden")}>
        <a href={telegram} target="_blank" rel="noreferrer" className={tile}>
          <span className={cn(icon, "bg-telegram text-white")}><SendIcon size={20} /></span>
          Telegram
        </a>
        <button type="button" onClick={messenger} className={tile}>
          <span className={cn(icon, "bg-messenger text-white")}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M12 2C6.5 2 2 6.1 2 11.2c0 2.9 1.4 5.4 3.7 7.1V22l3.4-1.9c.9.3 1.9.4 2.9.4 5.5 0 10-4.1 10-9.2S17.5 2 12 2zm1 12.4l-2.6-2.7-5 2.7 5.5-5.8 2.6 2.7 4.9-2.7-5.4 5.8z" />
            </svg>
          </span>
          Messenger
        </button>
        <button type="button" onClick={() => setQrOpen(true)} className={tile}>
          <span className={cn(icon, "bg-charcoal text-white")}><QrIcon size={20} /></span>
          {c.qr}
        </button>
        {showView && (
          <Link href={`/i/${slug}`} className={cn(tile, wide && "lg:hidden")}>
            <span className={cn(icon, "bg-gold-soft text-maroon")}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </span>
            {c.view}
          </Link>
        )}
        </div>
      </div>
      {note && <div className="mt-2.5 flex items-center gap-1.5 text-xs leading-[1.7] text-muted">{note}</div>}
      <QrSheet open={qrOpen} onClose={() => setQrOpen(false)} url={url} slug={slug} />
    </div>
  );
}

function QrSheet({ open, onClose, url, slug }: { open: boolean; onClose: () => void; url: string; slug: string }) {
  const c = useContent(content);
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open || dataUrl) return;
    // qrcode needs hex values: charcoal on white (theme tokens --color-charcoal / white).
    QRCode.toDataURL(url, { width: 720, margin: 2, color: { dark: "#2B2B2B", light: "#FFFFFF" } }).then(setDataUrl, () => setDataUrl(null));
  }, [open, url, dataUrl]);

  return (
    <BottomSheet open={open} onClose={onClose} title={c.qrTitle} closeLabel={c.close}>
      <div className="flex flex-col items-center gap-3">
        <div className="flex size-[240px] items-center justify-center rounded-card border border-line bg-white p-2">
          {dataUrl ? <img src={dataUrl} alt={c.qrAlt} className="size-full" /> : <div className="size-full motion-safe:animate-pulse rounded-lg bg-sand" />}
        </div>
        <p className="text-center text-[13px] text-muted">{c.qrHint}</p>
        <a
          href={dataUrl ?? undefined}
          download={`theabka-${slug}-qr.png`}
          aria-disabled={!dataUrl}
          className="flex min-h-12 w-full items-center justify-center rounded-card bg-maroon px-5 text-[15px] font-semibold text-white no-underline hover:bg-maroon-dark aria-disabled:pointer-events-none aria-disabled:opacity-50"
        >
          {c.download}
        </a>
      </div>
    </BottomSheet>
  );
}
