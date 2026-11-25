"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { motion } from "motion/react";
import { EASE, Reveal, Stagger, StaggerItem, popIn } from "@/components/motion/Motion";
import { InvitationCover } from "@/components/invitation/InvitationCover";
import { PreviewDialog } from "@/components/invitation/PreviewDialog";
import { ShareBar } from "@/modules/share/components/ShareBar";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button, ButtonLink } from "@/components/ui/Button";
import { CheckIcon } from "@/components/ui/Icons";
import { TopBar } from "@/components/ui/TopBar";
import { cn } from "@/lib/cn";
import { useContent, useLanguage } from "@/lib/i18n";
import { formatPrice, formatRiel, toKhmerNumerals } from "@/lib/khmer";
import { PLANS, UPGRADE_PRICE, getTemplate, templates, type Tier } from "@/lib/mock-data";
import { Badge } from "@/components/ui/Badge";
import { getDraft, getPaymentStatus, startPayment as startCharge, type Draft, type KhqrCharge } from "@/lib/store";
import { inviteUrl } from "@/lib/use-client";
import { DETAIL_STEP, draftCheckable, missingDetails } from "@/modules/payments/lib/invitation-checks";
import { missingLabels } from "@/modules/payments/lib/missing-labels";

const content = {
  en: {
    title: "Preview and pay", fullPreview: "Open full-screen preview", closePreview: "Close preview", choosePlan: "Your plan",
    basicNote: "3 photos", premNote: "6 photos + own music", planFromTemplate: "The plan comes from your template.", changeTemplate: "Change template",
    template: "Template", plan: "Plan", link: "Link", total: "Total", onceNote: "Pay once. Editing after publishing is free.",
    pay: "Pay with KHQR", scanTitle: "Scan to pay", waiting: "Waiting for payment…", expiresIn: "Code expires in",
    scanHint: "Scan with ABA, ACLEDA, Wing or any KHQR app", demoExpire: "Test mode: see an expired payment",
    saveQr: "Save QR image", samePhone: "Paying on this phone? Save the image, then choose it from your banking app's scan screen.",
    expTitle: "Payment code expired", expBody: "You were not charged. Make a new code to try again.", newCode: "Get a new code",
    live: "Your invitation is live!", liveSub: "Share this link with your guests", toDash: "Go to dashboard", viewGuest: "View as a guest",
    alreadyLive: "This invitation is already live",
    sandboxNote: "Test mode: no money moves. Payment completes by itself in a few seconds.",
    startFailed: "We couldn't create a payment code. Check your connection and try again.",
    providerDown: "Bakong payments aren't available right now. You weren't charged. Please try again later.",
    incompleteFailed: "Some details are still missing. Close this and fill them in first.",
    incompleteTitle: "Finish your invitation first", incompleteBody: "Add these before you pay:", add: "Add",
    missing: missingLabels.en,
    qrAlt: "KHQR payment code", alreadyLiveSub: "Your edits are published as soon as they save. There's nothing to pay.", close: "Close",
    upgradeTitle: "Upgrade to Premium", upgradeSub: "Your link stays the same. Pay only the difference.",
    upgradeItems: ["Up to 6 photos", "Your own song", "Premium designs", "Opening animation", "Personal invitation for each guest", "Guest list download", "Gift ledger", "Unlimited guest replies", "Data retention for 6 months"],
    upgradePay: "Upgrade with KHQR", upgraded: "You're on Premium now!", upgradedSub: "Every Premium feature is on for this invitation.",
  },
  km: {
    title: "មើល និងបង់ប្រាក់", fullPreview: "មើលធៀបការពេញអេក្រង់", closePreview: "បិទការមើលជាមុន", choosePlan: "កញ្ចប់របស់អ្នក",
    basicNote: "រូប ៣", premNote: "រូប ៦ + តន្ត្រីផ្ទាល់", planFromTemplate: "កញ្ចប់កំណត់តាមគំរូដែលអ្នកជ្រើស។", changeTemplate: "ប្ដូរគំរូ",
    template: "គំរូ", plan: "កញ្ចប់", link: "តំណ", total: "សរុប", onceNote: "បង់តែម្ដង។ ការកែសម្រួលក្រោយផ្សព្វផ្សាយ ឥតគិតថ្លៃ។",
    pay: "បង់តាម KHQR", scanTitle: "ស្កេនដើម្បីបង់ប្រាក់", waiting: "កំពុងរង់ចាំការបង់ប្រាក់…", expiresIn: "លេខកូដផុតកំណត់ក្នុង",
    scanHint: "ស្កេនដោយ ABA, ACLEDA, Wing ឬកម្មវិធី KHQR ណាមួយ", demoExpire: "របៀបសាកល្បង៖ មើលការបង់ប្រាក់ផុតកំណត់",
    saveQr: "រក្សាទុករូប QR", samePhone: "បង់នៅលើទូរសព្ទនេះ? រក្សាទុករូបភាព រួចជ្រើសវាពីផ្ទាំងស្កេនក្នុងកម្មវិធីធនាគាររបស់អ្នក។",
    expTitle: "លេខកូដបង់ប្រាក់ផុតកំណត់", expBody: "មិនមានការកាត់ប្រាក់ទេ។ សូមបង្កើតលេខកូដថ្មី។", newCode: "បង្កើតលេខកូដថ្មី",
    live: "ធៀបការរបស់អ្នករួចរាល់ហើយ!", liveSub: "ចែករំលែកតំណនេះទៅភ្ញៀវរបស់អ្នក", toDash: "ទៅផ្ទាំងគ្រប់គ្រង", viewGuest: "មើលជាភ្ញៀវ",
    alreadyLive: "ធៀបការនេះផ្សព្វផ្សាយរួចហើយ",
    sandboxNote: "របៀបសាកល្បង៖ មិនមានការកាត់ប្រាក់ពិតទេ។ ការបង់ប្រាក់នឹងបញ្ចប់ដោយស្វ័យប្រវត្តិក្នុងពីរបីវិនាទី។",
    startFailed: "មិនអាចបង្កើតលេខកូដបង់ប្រាក់បានទេ។ សូមពិនិត្យអ៊ីនធឺណិត ហើយព្យាយាមម្ដងទៀត។",
    providerDown: "ការបង់ប្រាក់តាមបាគងមិនអាចប្រើបានទេពេលនេះ។ មិនមានការកាត់ប្រាក់ទេ។ សូមព្យាយាមម្ដងទៀតនៅពេលក្រោយ។",
    incompleteFailed: "នៅខ្វះព័ត៌មានខ្លះ។ សូមបិទផ្ទាំងនេះ ហើយបំពេញវាជាមុនសិន។",
    incompleteTitle: "សូមបំពេញធៀបការជាមុនសិន", incompleteBody: "សូមបន្ថែមព័ត៌មានទាំងនេះ មុនពេលបង់ប្រាក់៖", add: "បន្ថែម",
    missing: missingLabels.km,
    qrAlt: "កូដបង់ប្រាក់ KHQR", alreadyLiveSub: "ការកែប្រែរបស់អ្នកត្រូវបានផ្សព្វផ្សាយភ្លាមៗពេលរក្សាទុក។ មិនចាំបាច់បង់ប្រាក់ទេ។", close: "បិទ",
    upgradeTitle: "ដំឡើងទៅកញ្ចប់ពិសេស", upgradeSub: "តំណរបស់អ្នកនៅដដែល។ បង់តែប្រាក់លើសប៉ុណ្ណោះ។",
    upgradeItems: ["រូបថតរហូតដល់ ៦ សន្លឹក", "បទចម្រៀងផ្ទាល់ខ្លួន", "គំរូពិសេស", "ចលនាបើកធៀប", "ធៀបការផ្ទាល់ឈ្មោះភ្ញៀវម្នាក់ៗ", "ទាញយកបញ្ជីភ្ញៀវ", "បញ្ជីចំណងដៃ", "ទទួលការឆ្លើយតបពីភ្ញៀវ គ្មានកំណត់", "រក្សាទុកទិន្នន័យរយៈពេល ៦ ខែ"],
    upgradePay: "ដំឡើងតាម KHQR", upgraded: "អ្នកប្រើកញ្ចប់ពិសេសហើយ!", upgradedSub: "មុខងារពិសេសទាំងអស់ បានបើកសម្រាប់ធៀបការនេះ។",
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
  // Why creating the code failed: picks the message in the sheet.
  const [failed, setFailed] = useState<false | "network" | "provider" | "incomplete">(false);
  const payTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const attempt = useRef(0);

  const template = getTemplate(draft.templateId) ?? templates[0];
  const tier: Tier = template.tier;
  const alreadyLive = initial.status === "live";
  // A live Basic invitation can pay the difference to become Premium (fixed when the page opens).
  const [upgradeMode] = useState(alreadyLive && initial.paidTier === "basic" && !initial.purgedAt);
  const priceUsd = upgradeMode ? UPGRADE_PRICE.usd : PLANS[tier].priceUsd;
  const price = formatPrice(priceUsd, lang);
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
      const c = await startCharge(draft.id, { upgrade: upgradeMode });
      if (run !== attempt.current) return;
      setCharge(c);
      setLeft(Math.max(0, Math.round((new Date(c.expiresAt).getTime() - Date.now()) / 1000)));
      setQrImage(await QRCode.toDataURL(c.qrPayload, { width: 600, margin: 1, errorCorrectionLevel: "M" }));
      poll(c.paymentId, run);
    } catch (err) {
      if (run !== attempt.current) return;
      const code = err instanceof Error ? err.message : "";
      setFailed(code === "provider_unavailable" || code === "provider_error" ? "provider" : code === "incomplete" ? "incomplete" : "network");
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
  // The server refuses incomplete invitations too; this explains why and links to the fix.
  const missing = alreadyLive ? [] : missingDetails(draftCheckable(draft));

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col pb-28">
      <div className="px-3 py-2">
        <TopBar backHref={`/app/${draft.id}/edit`} title={c.title} />
      </div>

      <div className="flex justify-center pt-1.5 pb-2">
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="h-[360px] w-[200px] rounded-[30px] bg-charcoal p-2"
        >
          <div className="h-full overflow-hidden rounded-[23px] [&>div]:p-4">
            <InvitationCover invitation={draft} photos={photos} compact className="text-[0.85em]" />
          </div>
        </motion.div>
      </div>
      <div className="text-center">
        <button type="button" onClick={() => setPreviewOpen(true)} className="inline-flex min-h-11 cursor-pointer items-center text-[13px] font-semibold text-maroon">
          {c.fullPreview}
        </button>
      </div>

      {upgradeMode ? (
        <Reveal onMount delay={0.15} className="mx-4 mt-2 rounded-card bg-white p-4 shadow-card">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold">{c.upgradeTitle}</h2>
            <Badge tone="gold">{t.tier.premium}</Badge>
          </div>
          <p className="mt-0.5 text-sm text-muted">{c.upgradeSub}</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-sm">
            {c.upgradeItems.map((item) => (
              <li key={item} className="flex items-center gap-2 leading-[1.7]">
                <CheckIcon size={16} className="shrink-0 text-gold-deep" />
                {item}
              </li>
            ))}
          </ul>
          <div aria-hidden className="my-3 h-px bg-line" />
          <div className="flex justify-between gap-3 text-base">
            <span className="font-bold">{c.total}</span>
            <span className="font-bold text-maroon">{price.usd} · {price.riel}</span>
          </div>
        </Reveal>
      ) : alreadyLive ? (
        <Reveal onMount delay={0.15} className="mx-4 mt-2 flex flex-col items-center gap-2 rounded-card bg-white p-5 text-center shadow-card">
          <motion.span variants={popIn} initial="hidden" animate="show" className="flex size-12 items-center justify-center rounded-full bg-jade text-white"><CheckIcon size={24} /></motion.span>
          <h2 className="text-lg font-bold">{c.alreadyLive}</h2>
          <p className="text-sm text-muted">{c.alreadyLiveSub}</p>
          <ButtonLink href={`/app/${draft.id}/dashboard`} fullWidth className="mt-2">{c.toDash}</ButtonLink>
        </Reveal>
      ) : (
        <Stagger onMount delay={0.15} stagger={0.08} className="px-4 pt-2">
          {missing.length > 0 && (
            <StaggerItem>
              <div role="alert" className="mb-3.5 rounded-card border border-maroon/25 bg-rose-soft p-3.5 text-sm">
                <h2 className="font-bold text-maroon">{c.incompleteTitle}</h2>
                <p className="mt-0.5 text-[13px] text-ink-soft">{c.incompleteBody}</p>
                <ul className="mt-1.5 flex flex-col">
                  {missing.map((m) => (
                    <li key={m} className="flex items-center justify-between gap-3 border-t border-maroon/10 first:border-t-0">
                      <span className="leading-[1.7]">{c.missing[m].item}</span>
                      <Link href={`/app/${draft.id}/edit?step=${DETAIL_STEP[m]}`} className="inline-flex min-h-11 shrink-0 items-center font-semibold text-maroon underline">
                        {c.add}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </StaggerItem>
          )}
          <StaggerItem as="h2" className="mb-2 text-sm font-bold">{c.choosePlan}</StaggerItem>
          <StaggerItem className="flex gap-2.5">
            {(["basic", "premium"] as const).map((p) => {
              const on = p === tier;
              const pp = formatPrice(PLANS[p].priceUsd, lang);
              return (
                <motion.div
                  key={p}
                  animate={{ scale: on ? 1 : 0.97 }}
                  aria-current={on ? "true" : undefined}
                  className={cn("flex-1 rounded-card border-2 p-3 text-left transition-colors", on ? "border-maroon bg-rose-soft/40" : "border-line bg-white text-ink-soft")}
                >
                  <div className="flex items-center justify-between font-bold">
                    {t.tier[p]}
                    {on && <CheckIcon size={18} className="text-maroon" />}
                  </div>
                  <div className={cn("text-xl font-bold", on ? "text-maroon" : "text-charcoal")}>{pp.usd}</div>
                  <div className="text-xs text-muted">{pp.riel} · {p === "basic" ? c.basicNote : c.premNote}</div>
                </motion.div>
              );
            })}
          </StaggerItem>
          <StaggerItem as="p" className="mt-1.5 text-xs text-muted">
            {c.planFromTemplate}{" "}
            <Link href={`/app/new?from=${draft.id}`} className="inline-flex min-h-11 items-center font-semibold text-maroon">{c.changeTemplate}</Link>
          </StaggerItem>

          <StaggerItem>
          <dl className="mt-1 flex flex-col gap-1.5 rounded-card bg-white p-3.5 text-sm shadow-card">
            <div className="flex justify-between gap-3"><dt className="text-muted">{c.template}</dt><dd className="font-semibold">{lang === "km" ? template.nameKm : template.nameEn}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted">{c.plan}</dt><dd className="font-semibold">{t.tier[tier]}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted">{c.link}</dt><dd lang="en" className="truncate font-semibold">{link}</dd></div>
            <div aria-hidden className="my-1 h-px bg-line" />
            <div className="flex justify-between gap-3 text-base"><dt className="font-bold">{c.total}</dt><dd className="font-bold text-maroon">{price.usd} · {price.riel}</dd></div>
          </dl>
          </StaggerItem>
          <StaggerItem as="p" className="mt-2.5 text-center text-xs text-muted">{c.onceNote}</StaggerItem>
        </Stagger>
      )}

      {(!alreadyLive || upgradeMode) && (
        <motion.div
          initial={{ y: "110%" }}
          animate={{ y: "0%" }}
          transition={{ type: "spring", stiffness: 260, damping: 30, delay: 0.4 }}
          className="fixed inset-x-0 bottom-0 z-10 mx-auto max-w-[480px] border-t border-line bg-white px-4 pt-3 pb-[max(1.125rem,env(safe-area-inset-bottom))]"
        >
          <Button fullWidth className="min-h-[52px]" onClick={startPayment} disabled={missing.length > 0}>
            <span className="rounded bg-khqr px-1.5 py-0.5 text-[11px] font-extrabold text-white">KHQR</span>
            {upgradeMode ? c.upgradePay : c.pay} {price.usd}
          </Button>
        </motion.div>
      )}

      <BottomSheet open={sheet !== "closed"} onClose={closeSheet} title={view === "waiting" || view === "expired" ? c.scanTitle : undefined} label={c.live} closeLabel={c.close}>
        {view === "waiting" && failed && (
          <div role="alert" className="flex flex-col items-center gap-2.5 py-6 text-center">
            <p className="text-sm text-maroon">
              {failed === "provider" ? c.providerDown : failed === "incomplete" ? c.incompleteFailed : c.startFailed}
            </p>
            <Button fullWidth onClick={startPayment}>{c.newCode}</Button>
          </div>
        )}

        {view === "waiting" && !failed && (
          <div className="flex flex-col items-center gap-2.5 pt-1.5">
            <div className="w-[230px] overflow-hidden rounded-[14px] border border-line shadow-[0_4px_16px_rgba(43,43,43,0.08)]">
              <div className="bg-khqr p-2 text-center font-extrabold tracking-[0.08em] text-white">KHQR</div>
              <div lang="en" className="px-3.5 pt-2.5 pb-1 text-xs text-ink-soft">
                {charge ? charge.merchantName : <span aria-hidden className="inline-block h-3 w-24 motion-safe:animate-pulse rounded bg-sand align-middle" />}
              </div>
              <div className="px-3.5 text-[22px] font-bold">
                {charge?.currency === "KHR" ? (
                  <>
                    {formatRiel(charge.amountKhr, "en").replace(" ៛", "")}<span className="text-[13px] font-medium text-muted"> KHR</span>
                  </>
                ) : (
                  <>
                    ${((charge?.amountUsdCents ?? priceUsd * 100) / 100).toFixed(2)}
                    <span className="text-[13px] font-medium text-muted"> USD</span>
                  </>
                )}
              </div>
              <div aria-hidden className="my-2 border-t border-dashed border-line-strong" />
              <div className="px-[22px] pt-1 pb-4">
                {qrImage ? (
                  // eslint-disable-next-line @next/next/no-img-element -- generated data URL
                  <img src={qrImage} alt={c.qrAlt} className="aspect-square w-full" />
                ) : (
                  <div aria-busy className="aspect-square w-full motion-safe:animate-pulse rounded-lg bg-sand" />
                )}
              </div>
            </div>
            <div className="text-sm text-ink-soft">{charge ? formatRiel(charge.amountKhr, lang) : price.riel}</div>
            <div role="status" className="flex items-center gap-2 text-[15px] font-semibold text-maroon">
              <span aria-hidden className="size-2.5 motion-safe:animate-pulse rounded-full bg-gold" />
              {c.waiting}
            </div>
            <div className="text-[13px] text-muted">
              {c.expiresIn} <b className="text-charcoal">{clock}</b>
            </div>
            <p className="text-center text-xs text-muted">{c.scanHint}</p>
            {qrImage && charge && !charge.sandbox && (
              <>
                <a
                  href={qrImage}
                  download={`theabka-khqr-${charge.paymentId.slice(0, 8)}.png`}
                  className="inline-flex min-h-11 items-center justify-center rounded-card px-4 text-sm font-semibold text-maroon underline"
                >
                  {c.saveQr}
                </a>
                <p className="-mt-1.5 text-center text-xs text-muted">{c.samePhone}</p>
              </>
            )}
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
            <motion.span variants={popIn} initial="hidden" animate="show" className="flex size-[72px] items-center justify-center rounded-full bg-jade text-white">
              <CheckIcon size={36} strokeWidth={2.6} />
            </motion.span>
            <h3 role="status" className="text-xl font-bold">{upgradeMode ? c.upgraded : c.live}</h3>
            <p className="text-sm text-muted">{upgradeMode ? c.upgradedSub : c.liveSub}</p>
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
