"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { InvitationCover } from "@/components/invitation/InvitationCover";
import { PreviewDialog } from "@/components/invitation/PreviewDialog";
import { ShareBar } from "@/components/share/ShareBar";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button, ButtonLink } from "@/components/ui/Button";
import { CheckIcon } from "@/components/ui/Icons";
import { TopBar } from "@/components/ui/TopBar";
import { cn } from "@/lib/cn";
import { useContent, useLanguage } from "@/lib/i18n";
import { formatPrice, toKhmerNumerals } from "@/lib/khmer";
import { PLANS, getTemplate, templates, type Tier } from "@/lib/mock-data";
import { getDraft, getPaymentStatus, startPayment as startCharge, type Draft, type KhqrCharge } from "@/lib/store";
import { inviteUrl } from "@/lib/use-client";

const content = {
  en: {
    title: "Preview and pay", fullPreview: "Open full-screen preview", closePreview: "Close preview", choosePlan: "Your plan",
    basicNote: "3 photos", premNote: "6 photos + own music", planFromTemplate: "The plan comes from your template.", changeTemplate: "Change template",
    template: "Template", plan: "Plan", link: "Link", total: "Total", onceNote: "Pay once. Editing after publishing is free.",
    pay: "Pay with KHQR", scanTitle: "Scan to pay", merchant: "THEABKA CO., LTD.", waiting: "Waiting for payment…", expiresIn: "Code expires in",
    scanHint: "Scan with ABA, ACLEDA, Wing or any KHQR app", demoExpire: "Prototype: see an expired payment",
    expTitle: "Payment code expired", expBody: "You were not charged. Make a new code to try again.", newCode: "Get a new code",
    live: "Your invitation is live!", liveSub: "Share this link with your guests", toDash: "Go to dashboard", viewGuest: "View as a guest",
    alreadyLive: "This invitation is already live",
    sandboxNote: "Test mode: no money moves. Payment completes by itself in a few seconds.",
    startFailed: "We couldn't create a payment code. Check your connection and try again.",
    qrAlt: "KHQR payment code", alreadyLiveSub: "Your edits are published as soon as they save. There's nothing to pay.", close: "Close",
  },
  km: {
    title: "មើល និងបង់ប្រាក់", fullPreview: "មើលធៀបការពេញអេក្រង់", closePreview: "បិទការមើលជាមុន", choosePlan: "កញ្ចប់របស់អ្នក",
    basicNote: "រូប ៣", premNote: "រូប ៦ + តន្ត្រីផ្ទាល់", planFromTemplate: "កញ្ចប់កំណត់តាមគំរូដែលអ្នកជ្រើស។", changeTemplate: "ប្ដូរគំរូ",
    template: "គំរូ", plan: "កញ្ចប់", link: "តំណ", total: "សរុប", onceNote: "បង់តែម្ដង។ ការកែសម្រួលក្រោយផ្សព្វផ្សាយ ឥតគិតថ្លៃ។",
    pay: "បង់តាម KHQR", scanTitle: "ស្កេនដើម្បីបង់ប្រាក់", merchant: "THEABKA CO., LTD.", waiting: "កំពុងរង់ចាំការបង់ប្រាក់…", expiresIn: "លេខកូដផុតកំណត់ក្នុង",
    scanHint: "ស្កេនដោយ ABA, ACLEDA, Wing ឬកម្មវិធី KHQR ណាមួយ", demoExpire: "សាកល្បង៖ មើលការបង់ប្រាក់ផុតកំណត់",
    expTitle: "លេខកូដបង់ប្រាក់ផុតកំណត់", expBody: "មិនមានការកាត់ប្រាក់ទេ។ សូមបង្កើតលេខកូដថ្មី។", newCode: "បង្កើតលេខកូដថ្មី",
    live: "ធៀបការរបស់អ្នករួចរាល់ហើយ!", liveSub: "ចែករំលែកតំណនេះទៅភ្ញៀវរបស់អ្នក", toDash: "ទៅផ្ទាំងគ្រប់គ្រង", viewGuest: "មើលជាភ្ញៀវ",
    alreadyLive: "ធៀបការនេះផ្សព្វផ្សាយរួចហើយ",
    sandboxNote: "របៀបសាកល្បង៖ មិនមានការកាត់ប្រាក់ពិតទេ។ ការបង់ប្រាក់នឹងបញ្ចប់ដោយស្វ័យប្រវត្តិក្នុងពីរបីវិនាទី។",
    startFailed: "មិនអាចបង្កើតលេខកូដបង់ប្រាក់បានទេ។ សូមពិនិត្យអ៊ីនធឺណិត ហើយព្យាយាមម្ដងទៀត។",
    qrAlt: "កូដបង់ប្រាក់ KHQR", alreadyLiveSub: "ការកែប្រែរបស់អ្នកត្រូវបានផ្សព្វផ្សាយភ្លាមៗពេលរក្សាទុក។ មិនចាំបាច់បង់ប្រាក់ទេ។", close: "បិទ",
  },
};

const POLL_MS = 2000;

type SheetState = "closed" | "waiting" | "paid" | "expired";

export function PayScreen({ initial }: { initial: Draft }) {
  const c = useContent(content);
  const { lang, t } = useLanguage();
  const [draft, setDraft] = useState(initial);
  const [sheet, setSheet] = useState<SheetState>("closed");
  const [left, setLeft] = useState(0);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [charge, setCharge] = useState<KhqrCharge | null>(null);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const payTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const attempt = useRef(0);

  const template = getTemplate(draft.templateId) ?? templates[0];
  const tier: Tier = template.tier;
  const price = formatPrice(PLANS[tier].priceUsd, lang);
  const photos = draft.photos.slice(0, PLANS[tier].maxPhotos);
  const link = inviteUrl(draft.slug).replace(/^https?:\/\//, "");
  const names = `${draft.groomEn.split(" ").at(-1)} & ${draft.brideEn.split(" ").at(-1)}`;

  // Countdown while the code is showing; at zero the code counts as expired.
  useEffect(() => {
    if (sheet !== "waiting" || !charge || left <= 0) return;
    const id = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [sheet, left, charge]);
  const view: SheetState = sheet === "waiting" && charge && left <= 0 ? "expired" : sheet;

  // If the page is hidden (navigation keeps it alive), polling stops; close the sheet so it doesn't wait forever.
  useLayoutEffect(
    () => () => {
      clearTimeout(payTimer.current);
      attempt.current++;
      setSheet((s) => (s === "waiting" ? "closed" : s));
    },
    [],
  );

  /** Poll the payment until the server (webhook or provider status check) marks it paid or expired. */
  function poll(paymentId: string, run: number) {
    payTimer.current = setTimeout(async () => {
      if (run !== attempt.current) return;
      const status = await getPaymentStatus(paymentId).catch(() => null);
      if (run !== attempt.current) return;
      if (status?.status === "paid") {
        const fresh = await getDraft(draft.id).catch(() => undefined);
        if (fresh) setDraft(fresh);
        setSheet("paid");
      } else if (status?.status === "expired") {
        setSheet("expired");
      } else {
        poll(paymentId, run);
      }
    }, POLL_MS);
  }

  async function startPayment() {
    clearTimeout(payTimer.current);
    const run = ++attempt.current;
    setCharge(null);
    setQrImage(null);
    setFailed(false);
    setSheet("waiting");
    try {
      const c = await startCharge(draft.id, Math.round(PLANS[tier].priceUsd * 100), PLANS[tier].priceKhr);
      if (run !== attempt.current) return;
      setCharge(c);
      setLeft(Math.max(0, Math.round((new Date(c.expiresAt).getTime() - Date.now()) / 1000)));
      setQrImage(await QRCode.toDataURL(c.qrPayload, { width: 600, margin: 1, errorCorrectionLevel: "M" }));
      poll(c.paymentId, run);
    } catch {
      if (run === attempt.current) setFailed(true);
    }
  }

  function expireNow() {
    clearTimeout(payTimer.current);
    attempt.current++;
    setLeft(0);
    setSheet("expired");
  }

  function closeSheet() {
    clearTimeout(payTimer.current);
    attempt.current++;
    setSheet("closed");
  }

  const mm = Math.floor(left / 60);
  const ss = String(left % 60).padStart(2, "0");
  const clock = lang === "km" ? toKhmerNumerals(`${mm}:${ss}`) : `${mm}:${ss}`;
  const alreadyLive = initial.status === "live";

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col pb-28">
      <div className="px-3 py-2">
        <TopBar backHref={`/app/${draft.id}/edit`} title={c.title} />
      </div>

      <div className="flex justify-center pt-1.5 pb-2">
        <div className="h-[360px] w-[200px] rounded-[30px] bg-charcoal p-2">
          <div className="h-full overflow-hidden rounded-[23px] [&>div]:p-4">
            <InvitationCover invitation={draft} photos={photos} compact className="text-[0.85em]" />
          </div>
        </div>
      </div>
      <div className="text-center">
        <button type="button" onClick={() => setPreviewOpen(true)} className="inline-flex min-h-11 cursor-pointer items-center text-[13px] font-semibold text-maroon">
          {c.fullPreview}
        </button>
      </div>

      {alreadyLive ? (
        <div className="mx-4 mt-2 flex flex-col items-center gap-2 rounded-card bg-white p-5 text-center shadow-card">
          <span className="flex size-12 items-center justify-center rounded-full bg-jade text-white"><CheckIcon size={24} /></span>
          <h2 className="text-lg font-bold">{c.alreadyLive}</h2>
          <p className="text-sm text-muted">{c.alreadyLiveSub}</p>
          <ButtonLink href={`/app/${draft.id}/dashboard`} fullWidth className="mt-2">{c.toDash}</ButtonLink>
        </div>
      ) : (
        <div className="px-4 pt-2">
          <h2 className="mb-2 text-sm font-bold">{c.choosePlan}</h2>
          <div className="flex gap-2.5">
            {(["basic", "premium"] as const).map((p) => {
              const on = p === tier;
              const pp = formatPrice(PLANS[p].priceUsd, lang);
              return (
                <div
                  key={p}
                  aria-current={on ? "true" : undefined}
                  className={cn("flex-1 rounded-card border-2 bg-white p-3 text-left", on ? "border-maroon bg-rose-soft/40" : "border-line opacity-60")}
                >
                  <div className="flex items-center justify-between font-bold">
                    {t.tier[p]}
                    {on && <CheckIcon size={18} className="text-maroon" />}
                  </div>
                  <div className="text-xl font-bold text-maroon">{pp.usd}</div>
                  <div className="text-xs text-muted">{pp.riel} · {p === "basic" ? c.basicNote : c.premNote}</div>
                </div>
              );
            })}
          </div>
          <p className="mt-1.5 text-xs text-muted">
            {c.planFromTemplate}{" "}
            <Link href={`/app/new?from=${draft.id}`} className="inline-flex min-h-11 items-center font-semibold text-maroon">{c.changeTemplate}</Link>
          </p>

          <dl className="mt-1 flex flex-col gap-1.5 rounded-card bg-white p-3.5 text-sm shadow-card">
            <div className="flex justify-between gap-3"><dt className="text-muted">{c.template}</dt><dd className="font-semibold">{lang === "km" ? template.nameKm : template.nameEn}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted">{c.plan}</dt><dd className="font-semibold">{t.tier[tier]}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted">{c.link}</dt><dd lang="en" className="truncate font-semibold">{link}</dd></div>
            <div aria-hidden className="my-1 h-px bg-line" />
            <div className="flex justify-between gap-3 text-base"><dt className="font-bold">{c.total}</dt><dd className="font-bold text-maroon">{price.usd} · {price.riel}</dd></div>
          </dl>
          <p className="mt-2.5 text-center text-xs text-muted">{c.onceNote}</p>
          
        </div>
      )}

      {!alreadyLive && (
        <div className="fixed inset-x-0 bottom-0 z-10 mx-auto max-w-[480px] border-t border-line bg-white px-4 pt-3 pb-[max(1.125rem,env(safe-area-inset-bottom))]">
          <Button fullWidth className="min-h-[52px]" onClick={startPayment}>
            <span className="rounded bg-khqr px-1.5 py-0.5 text-[11px] font-extrabold text-white">KHQR</span>
            {c.pay} {price.usd}
          </Button>
        </div>
      )}

      <BottomSheet open={sheet !== "closed"} onClose={closeSheet} title={view === "waiting" || view === "expired" ? c.scanTitle : undefined} label={c.live} closeLabel={c.close}>
        {view === "waiting" && failed && (
          <div role="alert" className="flex flex-col items-center gap-2.5 py-6 text-center">
            <p className="text-sm text-maroon">{c.startFailed}</p>
            <Button fullWidth onClick={startPayment}>{c.newCode}</Button>
          </div>
        )}

        {view === "waiting" && !failed && (
          <div className="flex flex-col items-center gap-2.5 pt-1.5">
            <div className="w-[230px] overflow-hidden rounded-[14px] border border-line shadow-[0_4px_16px_rgba(43,43,43,0.08)]">
              <div className="bg-khqr p-2 text-center font-extrabold tracking-[0.08em] text-white">KHQR</div>
              <div lang="en" className="px-3.5 pt-2.5 pb-1 text-xs text-ink-soft">{c.merchant}</div>
              <div className="px-3.5 text-[22px] font-bold">
                {price.usd}.00<span className="text-[13px] font-medium text-muted"> USD</span>
              </div>
              <div aria-hidden className="my-2 border-t border-dashed border-line-strong" />
              <div className="px-[22px] pt-1 pb-4">
                {qrImage ? (
                  // eslint-disable-next-line @next/next/no-img-element -- generated data URL
                  <img src={qrImage} alt={c.qrAlt} className="aspect-square w-full" />
                ) : (
                  <div aria-busy className="aspect-square w-full animate-pulse rounded-lg bg-sand" />
                )}
              </div>
            </div>
            <div className="text-sm text-ink-soft">{price.riel}</div>
            <div role="status" className="flex items-center gap-2 text-[15px] font-semibold text-maroon">
              <span aria-hidden className="size-2.5 animate-pulse rounded-full bg-gold" />
              {c.waiting}
            </div>
            <div className="text-[13px] text-muted">
              {c.expiresIn} <b className="text-charcoal">{clock}</b>
            </div>
            <p className="text-center text-xs text-muted">{c.scanHint}</p>
            {charge?.sandbox && (
              <>
                <p className="text-center text-xs text-gold-ink">{c.sandboxNote}</p>
                <button type="button" onClick={expireNow} className="min-h-11 cursor-pointer text-xs text-maroon underline">{c.demoExpire}</button>
              </>
            )}
          </div>
        )}

        {view === "expired" && (
          <div className="flex flex-col items-center gap-2.5 pt-5 pb-1.5 text-center" role="alert">
            <span className="flex size-16 items-center justify-center rounded-full bg-rose-soft text-maroon">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" />
              </svg>
            </span>
            <h3 className="text-lg font-bold">{c.expTitle}</h3>
            <p className="text-sm text-muted">{c.expBody}</p>
            <Button fullWidth className="mt-1.5" onClick={startPayment}>{c.newCode}</Button>
          </div>
        )}

        {view === "paid" && (
          <div className="flex flex-col items-center gap-2 pt-2.5 text-center">
            <span className="flex size-[72px] animate-pop items-center justify-center rounded-full bg-jade text-white">
              <CheckIcon size={36} strokeWidth={2.6} />
            </span>
            <h3 role="status" className="text-xl font-bold">{c.live}</h3>
            <p className="text-sm text-muted">{c.liveSub}</p>
            <ShareBar slug={draft.slug} title={names} showView={false} className="mt-1.5 w-full text-left shadow-none ring-1 ring-line" />
            <ButtonLink href={`/app/${draft.id}/dashboard`} fullWidth className="mt-1">{c.toDash}</ButtonLink>
            <ButtonLink href={`/i/${draft.slug}`} variant="secondary" fullWidth>{c.viewGuest}</ButtonLink>
          </div>
        )}
      </BottomSheet>

      <PreviewDialog open={previewOpen} onClose={() => setPreviewOpen(false)} invitation={draft} photos={photos} label={c.fullPreview} closeLabel={c.closePreview} />
    </main>
  );
}
