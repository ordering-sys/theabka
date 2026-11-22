"use client";
/* eslint-disable @next/next/no-img-element -- generated QR data URL */

import Link from "next/link";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { QrIcon, SendIcon } from "@/components/ui/Icons";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import { useContent } from "@/lib/i18n";
import { inviteUrl } from "@/lib/use-client";

const content = {
  en: { link: "Share link", copy: "Copy", copied: "Copied", copiedToast: "Link copied", messengerToast: "Link copied. Paste it in Messenger.", qr: "QR code", view: "View", qrTitle: "QR code for your invitation", qrHint: "Print it on cards or show it at the venue.", download: "Download QR image", close: "Close", qrAlt: "QR code linking to the invitation" },
  km: { link: "តំណចែករំលែក", copy: "ចម្លង", copied: "បានចម្លង", copiedToast: "បានចម្លងតំណ", messengerToast: "បានចម្លងតំណ។ សូមបិទភ្ជាប់ក្នុង Messenger។", qr: "QR", view: "មើល", qrTitle: "កូដ QR សម្រាប់ធៀបការរបស់អ្នក", qrHint: "បោះពុម្ពលើកាត ឬបង្ហាញនៅកន្លែងកម្មវិធី។", download: "ទាញយករូប QR", close: "បិទ", qrAlt: "កូដ QR ភ្ជាប់ទៅធៀបការ" },
};

type Props = { slug: string; title: string; showView?: boolean; className?: string };

/** Copy link + Telegram / Messenger / QR / View. Used on the pay success screen and the dashboard. */
export function ShareBar({ slug, title, showView = true, className }: Props) {
  const c = useContent(content);
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
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
  const tile = "flex min-h-11 min-w-16 flex-1 flex-col items-center gap-1 text-xs font-semibold text-charcoal no-underline cursor-pointer";
  const icon = "flex size-11 items-center justify-center rounded-full";

  return (
    <div className={cn("rounded-card bg-white p-3 shadow-card lg:p-4", className)}>
      <div className="text-xs font-semibold text-muted">{c.link}</div>
      <div className="mt-1 flex items-center gap-2">
        <div lang="en" className="min-w-0 grow truncate text-sm font-semibold">{display}</div>
        <button
          type="button"
          onClick={() => copy()}
          className="min-h-11 shrink-0 cursor-pointer rounded-[10px] bg-maroon px-3.5 text-[13px] font-semibold text-white hover:bg-maroon-dark"
        >
          {copied ? c.copied : c.copy}
        </button>
      </div>
      <div className="mt-2.5 flex">
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
          <Link href={`/i/${slug}`} className={tile}>
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
          {dataUrl ? <img src={dataUrl} alt={c.qrAlt} className="size-full" /> : <div className="size-full animate-pulse rounded-lg bg-sand" />}
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
