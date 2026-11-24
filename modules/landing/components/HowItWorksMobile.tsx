"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { EASE, Stagger, StaggerItem } from "@/components/motion/Motion";
import { CheckIcon, ChevronRightIcon, EyeIcon } from "@/components/ui/Icons";
import { TemplateThumb } from "@/components/invitation/TemplateArt";
import { MockQr } from "@/components/invitation/MockQr";
import { PreviewDialog } from "@/components/invitation/PreviewDialog";
import { cn } from "@/lib/cn";
import { useContent, useLanguage } from "@/lib/i18n";
import { formatNumber, formatPrice } from "@/lib/khmer";
import { getRsvpStats, rsvps, sampleInvitation as inv, sampleViewCount, templates } from "@/lib/mock-data";
import { landingContent } from "@/modules/landing/content";

/**
 * Mobile "How it works": an accordion where each step opens a compact version of
 * its desktop panel. One step open at a time; the first starts open.
 */
export function HowItWorksMobile() {
  const c = useContent(landingContent).how;
  const { lang } = useLanguage();
  const [open, setOpen] = useState<number | null>(0);

  return (
    <Stagger as="ol" stagger={0.09} className="flex flex-col gap-2.5 lg:hidden">
      {c.steps.map((s, i) => {
        const on = open === i;
        const id = `how-mobile-${i}`;
        return (
          <StaggerItem
            as="li"
            key={s.title}
            className={cn("overflow-hidden rounded-card bg-white shadow-card ring-[1.5px] transition-colors", on ? "ring-maroon" : "ring-transparent")}
          >
            <h3>
              <button
                type="button"
                id={`${id}-button`}
                aria-expanded={on}
                aria-controls={on ? id : undefined}
                onClick={() => setOpen(on ? null : i)}
                className="flex min-h-11 w-full cursor-pointer items-center gap-3.5 p-3.5 text-left"
              >
                <span
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-full font-bold transition-colors",
                    on ? "bg-maroon text-white" : "bg-gold-soft text-maroon",
                  )}
                >
                  {formatNumber(i + 1, lang)}
                </span>
                <span className="min-w-0 grow">
                  <span className="block text-[15px] font-semibold">{s.title}</span>
                  <span className="block text-[13px] text-muted">{s.sub}</span>
                </span>
                <ChevronRightIcon size={18} className={cn("shrink-0 text-muted transition-transform duration-300", on && "rotate-90")} />
              </button>
            </h3>

            <AnimatePresence initial={false}>
              {on && (
                <motion.div
                  id={id}
                  role="region"
                  aria-labelledby={`${id}-button`}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: EASE }}
                >
                  <div className="flex flex-col gap-3 px-3.5 pb-3.5">
                    {i === 0 && <MobileTemplates />}
                    {i === 1 && <MobileDetails />}
                    {i === 2 && <MobilePay />}
                    {i === 3 && <MobileShare />}
                    <p className="rounded-card bg-ivory px-3.5 py-2.5 text-[13px] text-ink-soft">{s.note}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </StaggerItem>
        );
      })}
    </Stagger>
  );
}

/** Templates in a horizontal scroller; tapping one opens the full-screen preview. */
function MobileTemplates() {
  const c = useContent(landingContent).how;
  const { lang, t } = useLanguage();
  const [previewId, setPreviewId] = useState<string | null>(null);

  return (
    <>
      <ul className="-mx-3.5 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-3.5 pb-1">
        {templates.map((tpl) => {
          const name = lang === "km" ? tpl.nameKm : tpl.nameEn;
          return (
            <li key={tpl.id} className="w-[104px] shrink-0 snap-start">
              <button
                type="button"
                onClick={() => setPreviewId(tpl.id)}
                aria-label={`${c.preview}: ${name} · ${t.tier[tpl.tier]} · ${formatPrice(tpl.priceUsd, lang).both}`}
                className="flex w-full cursor-pointer flex-col gap-1.5 rounded-lg text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold active:scale-[0.97]"
              >
                <span className="relative block">
                  <TemplateThumb template={tpl} size="md" className="h-[136px]" />
                  <span aria-hidden className="absolute right-1.5 bottom-1.5 flex size-6 items-center justify-center rounded-full bg-charcoal/70 text-white">
                    <EyeIcon size={13} />
                  </span>
                </span>
                <span className="truncate px-0.5 text-xs font-semibold">{name}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <PreviewDialog
        open={previewId !== null}
        onClose={() => setPreviewId(null)}
        invitation={{ ...inv, templateId: previewId ?? inv.templateId }}
        photos={[]}
        label={c.preview}
        closeLabel={c.closePreview}
      />
    </>
  );
}

/** The sample form as a compact read-only list. */
function MobileDetails() {
  const c = useContent(landingContent).how;
  return (
    <dl className="divide-y divide-sand rounded-card border border-line">
      {c.form.map((r) => (
        <div key={r.label} className="px-3.5 py-2">
          <dt className="text-xs font-semibold text-muted">{r.label}</dt>
          <dd className="text-sm">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** KHQR card with the pay reassurances underneath. */
function MobilePay() {
  const c = useContent(landingContent).how;
  const { lang } = useLanguage();
  const price = formatPrice(15, lang);
  return (
    <div className="flex flex-col items-center gap-3.5">
      <div className="w-[180px] overflow-hidden rounded-[14px] border border-line">
        <div className="bg-khqr p-1.5 text-center text-sm font-extrabold tracking-[0.08em] text-white">KHQR</div>
        <div className="flex items-baseline justify-between gap-2 px-3 pt-1.5">
          <span className="text-lg font-bold">{price.usd}.00</span>
          <span className="text-xs text-muted">{price.riel}</span>
        </div>
        <MockQr className="px-4 pt-2 pb-3.5" />
      </div>
      <ul className="flex w-full flex-col gap-2">
        {c.payPoints.map((p) => (
          <li key={p} className="flex gap-2 text-sm">
            <CheckIcon size={18} className="mt-0.5 shrink-0 text-jade-ink" />
            <span>{p}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Share link and the four headline stats. */
function MobileShare() {
  const c = useContent(landingContent).how;
  const { lang } = useLanguage();
  const s = { ...getRsvpStats(rsvps), opened: sampleViewCount };
  const stats = [
    { label: c.stats.opened, value: s.opened, cls: "text-charcoal" },
    { label: c.stats.attending, value: s.attending, cls: "text-jade-ink" },
    { label: c.stats.notAttending, value: s.notAttending, cls: "text-maroon" },
    { label: c.stats.total, value: s.totalGuests, cls: "text-gold-ink" },
  ];
  return (
    <>
      <div className="truncate rounded-card bg-sand-light px-3.5 py-2.5 text-sm font-semibold">theabka.com/i/{inv.slug}</div>
      <div className="grid grid-cols-2 gap-2">
        {stats.map((st) => (
          <div key={st.label} className="rounded-card border border-line px-3 py-2">
            <div className="text-xs text-muted">{st.label}</div>
            <div className={cn("text-xl font-bold", st.cls)}>{formatNumber(st.value, lang)}</div>
          </div>
        ))}
      </div>
    </>
  );
}
