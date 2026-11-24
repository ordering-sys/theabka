"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { EASE, Reveal, SPRING, Stagger, StaggerItem } from "@/components/motion/Motion";
import { ButtonLink, Button } from "@/components/ui/Button";
import { CheckIcon } from "@/components/ui/Icons";
import { TemplateThumb } from "@/components/invitation/TemplateArt";
import { MockQr } from "@/components/invitation/MockQr";
import { cn } from "@/lib/cn";
import { useContent, useLanguage } from "@/lib/i18n";
import { formatKhmerDate, formatNumber, formatPrice } from "@/lib/khmer";
import { getRsvpStats, rsvps, sampleInvitation as inv, sampleViewCount, templates } from "@/lib/mock-data";
import { landingContent } from "@/modules/landing/content";

/**
 * Interactive 4-step walkthrough (from WebHowItWorks.dc.html).
 * Desktop: step list + live panel side by side. Mobile: a simple step list.
 */
export function HowItWorks() {
  const c = useContent(landingContent).how;
  const { lang } = useLanguage();
  const [step, setStep] = useState(0);
  const last = c.steps.length - 1;

  return (
    <section id="how" className="scroll-mt-20 lg:border-y lg:border-line lg:bg-white">
      <div className="mx-auto max-w-[1200px] px-5 py-7 lg:px-6 lg:py-[72px]">
        <Reveal className="mx-auto mb-4 max-w-[640px] text-center lg:mb-10">
          <div className={cn("hidden text-[13px] font-bold text-gold-deep lg:block", lang === "en" && "tracking-[0.1em]")}>{c.kicker}</div>
          <h2 className="mt-1.5 mb-2 text-lg font-bold lg:text-[32px] lg:leading-[1.6]">{c.title}</h2>
          <p className="hidden text-base text-muted lg:block">{c.sub}</p>
        </Reveal>

        {/* Mobile: numbered list */}
        <Stagger as="ol" stagger={0.09} className="flex flex-col gap-2.5 lg:hidden">
          {c.steps.map((s, i) => (
            <StaggerItem as="li" key={s.title} className="flex items-center gap-3.5 rounded-card bg-white p-3.5 shadow-card">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gold-soft font-bold text-maroon">
                {formatNumber(i + 1, lang)}
              </span>
              <span>
                <span className="block text-[15px] font-semibold">{s.title}</span>
                <span className="block text-[13px] text-muted">{s.sub}</span>
              </span>
            </StaggerItem>
          ))}
        </Stagger>

        {/* Desktop: stepper with live panel */}
        <Reveal className="hidden items-stretch gap-8 lg:flex">
          <div className="flex min-w-0 flex-[1_1_340px] flex-col gap-1.5">
            {c.steps.map((s, i) => {
              const on = i === step;
              return (
                <button
                  key={s.title}
                  type="button"
                  onClick={() => setStep(i)}
                  aria-current={on ? "step" : undefined}
                  className={cn(
                    "relative flex cursor-pointer items-start gap-3.5 rounded-card border-[1.5px] border-transparent p-4 text-left transition-colors",
                    !on && "hover:bg-ivory",
                  )}
                >
                  {/* Active highlight glides between steps. */}
                  {on && (
                    <motion.span
                      layoutId="how-active-step"
                      transition={SPRING}
                      aria-hidden
                      className="absolute -inset-[1.5px] rounded-card border-[1.5px] border-maroon bg-ivory"
                    />
                  )}
                  <span
                    className={cn(
                      "relative flex size-10 shrink-0 items-center justify-center rounded-full font-bold transition-colors",
                      i < step ? "bg-jade text-white" : on ? "bg-maroon text-white" : "bg-sand text-maroon",
                    )}
                  >
                    {i < step ? <CheckIcon size={18} /> : formatNumber(i + 1, lang)}
                  </span>
                  <span className="relative flex flex-col gap-0.5">
                    <span className="text-[17px] font-bold">{s.title}</span>
                    <span className="text-sm text-muted">{s.sub}</span>
                    <span className="text-xs font-semibold text-gold-ink">{s.time}</span>
                  </span>
                </button>
              );
            })}
            <div className="mt-3.5 flex gap-2.5">
              {step > 0 && <Button variant="secondary" onClick={() => setStep(step - 1)}>{c.prev}</Button>}
              {step < last ? (
                <Button onClick={() => setStep(step + 1)}>{c.next}</Button>
              ) : (
                <ButtonLink href="/signin">{c.start}</ButtonLink>
              )}
            </div>
          </div>

          <div className="flex min-h-[560px] min-w-0 flex-[2_1_560px] flex-col gap-[18px] rounded-[20px] bg-white p-8 shadow-[0_10px_40px_rgba(43,43,43,0.08)] ring-1 ring-line">
            <div className="flex items-center justify-between gap-3">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={step}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                  className="text-xl font-bold"
                >
                  {c.steps[step].title}
                </motion.div>
              </AnimatePresence>
              <div className="flex gap-1.5" aria-hidden>
                {c.steps.map((s, i) => (
                  <motion.span
                    key={s.title}
                    initial={false}
                    animate={{ width: i === step ? 32 : 8 }}
                    transition={SPRING}
                    className={cn("h-2 rounded-full transition-colors", i <= step ? "bg-maroon" : "bg-line-strong")}
                  />
                ))}
              </div>
            </div>

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.3, ease: EASE }}
              >
                {step === 0 && <PanelTemplates />}
                {step === 1 && <PanelDetails />}
                {step === 2 && <PanelPay />}
                {step === 3 && <PanelShare />}
              </motion.div>
            </AnimatePresence>

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={step}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="mt-auto rounded-card bg-ivory px-4 py-3 text-sm text-ink-soft"
              >
                {c.steps[step].note}
              </motion.div>
            </AnimatePresence>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function PanelTemplates() {
  return (
    <div className="grid grid-cols-4 gap-3">
      {templates.map((tpl, i) => (
        <TemplateThumb
          key={tpl.id}
          template={tpl}
          size="sm"
          className={cn("h-[170px]", i === 0 && "outline-[3px] outline-offset-[3px] outline-gold")}
        />
      ))}
    </div>
  );
}

function PanelDetails() {
  const c = useContent(landingContent).how;
  return (
    <div className="flex flex-wrap gap-6">
      <div className="flex flex-[1_1_280px] flex-col gap-2.5">
        {c.form.map((r) => (
          <div key={r.label}>
            <div className="text-xs font-semibold text-muted">{r.label}</div>
            <div className="flex min-h-[42px] items-center rounded-[10px] border-[1.5px] border-line-strong px-3 py-2 text-sm">{r.value}</div>
          </div>
        ))}
      </div>
      <div className="h-[360px] w-[200px] shrink-0 self-center rounded-[28px] bg-charcoal p-[7px]">
        <div className="relative flex h-full flex-col items-center justify-center rounded-[22px] bg-maroon p-4 text-center text-ivory">
          <div aria-hidden className="absolute inset-[9px] rounded-[14px] border border-gold" />
          <div lang="km" className="font-moul text-[10px] leading-[1.9] text-gold">សិរីមង្គលអាពាហ៍ពិពាហ៍</div>
          <div lang="en" className="mt-1.5 font-serif text-lg italic">Dara &amp; Sophea</div>
          <div lang="km" className="mt-2 text-[10px] leading-[1.8]">{formatKhmerDate(inv.eventDate)}</div>
          <div lang="en" className="text-[9px] opacity-85">{inv.venueNameEn}</div>
        </div>
      </div>
    </div>
  );
}

function PanelPay() {
  const c = useContent(landingContent).how;
  const { lang } = useLanguage();
  return (
    <div className="flex flex-wrap items-center justify-center gap-8">
      <div className="w-[220px] overflow-hidden rounded-[14px] border border-line">
        <div className="bg-khqr p-2 text-center font-extrabold tracking-[0.08em] text-white">KHQR</div>
        <div className="px-3.5 pt-2 text-[22px] font-bold">{formatPrice(15, lang).usd}.00</div>
        <MockQr className="px-5 pt-2.5 pb-4" />
      </div>
      <ul className="flex max-w-[300px] flex-col gap-3">
        {c.payPoints.map((p) => (
          <li key={p} className="flex gap-2.5">
            <CheckIcon size={20} className="mt-[3px] shrink-0 text-jade-ink" />
            <span>{p}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PanelShare() {
  const c = useContent(landingContent).how;
  const { lang, t } = useLanguage();
  const s = { ...getRsvpStats(rsvps), opened: sampleViewCount };
  const stats = [
    { label: c.stats.opened, value: s.opened, cls: "text-charcoal" },
    { label: c.stats.attending, value: s.attending, cls: "text-jade-ink" },
    { label: c.stats.notAttending, value: s.notAttending, cls: "text-maroon" },
    { label: c.stats.total, value: s.totalGuests, cls: "text-gold-ink" },
  ];
  return (
    <div className="flex flex-wrap gap-6">
      <div className="flex flex-[1_1_260px] flex-col gap-3">
        <div className="rounded-card bg-sand-light px-3.5 py-3 font-semibold">theabka.com/i/{inv.slug}</div>
        <div className="flex flex-wrap gap-2 text-[13px] font-semibold text-white">
          <span className="rounded-full bg-telegram px-3.5 py-2">Telegram</span>
          <span className="rounded-full bg-messenger px-3.5 py-2">Messenger</span>
          <span className="rounded-full bg-charcoal px-3.5 py-2">QR</span>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {stats.map((st) => (
            <div key={st.label} className="rounded-card border border-line px-3 py-2.5">
              <div className="text-xs text-muted">{st.label}</div>
              <div className={cn("text-2xl font-bold", st.cls)}>{formatNumber(st.value, lang)}</div>
            </div>
          ))}
        </div>
      </div>
      <ul className="flex-[1_1_280px] overflow-hidden rounded-card border border-line">
        {rsvps.slice(0, 5).map((r) => (
          <li key={r.id} className="flex justify-between gap-2 border-b border-sand px-3.5 py-2.5 text-sm last:border-b-0">
            <span className="font-semibold">{r.guestName}</span>
            <span className={cn("font-bold", r.attending ? "text-jade-ink" : "text-maroon")}>
              {r.attending ? t.rsvp.attending : t.rsvp.notAttending}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
