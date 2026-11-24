"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion, useAnimationFrame, useInView, useMotionValue, useReducedMotion } from "motion/react";
import { EASE, Reveal, SPRING } from "@/components/motion/Motion";
import { ButtonLink, Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { CheckIcon, EyeIcon } from "@/components/ui/Icons";
import { TemplateThumb } from "@/components/invitation/TemplateArt";
import { MockQr } from "@/components/invitation/MockQr";
import { PreviewDialog } from "@/components/invitation/PreviewDialog";
import { cn } from "@/lib/cn";
import { useContent, useLanguage } from "@/lib/i18n";
import { formatEnglishDate, formatKhmerDate, formatNumber, formatPrice } from "@/lib/khmer";
import { PLANS, getRsvpStats, rsvps, sampleInvitation as inv, sampleViewCount, templates, type EventType } from "@/lib/mock-data";
import { landingContent } from "@/modules/landing/content";
import { useStartHref } from "@/modules/landing/hooks/useStartHref";
import { HowItWorksMobile } from "./HowItWorksMobile";

/** How long each step stays up during autoplay. */
const AUTOPLAY_MS = 6000;

/**
 * Interactive 4-step walkthrough (from WebHowItWorks.dc.html).
 * Desktop: step list + live panel side by side. Mobile: a simple step list.
 */
export function HowItWorks() {
  const c = useContent(landingContent).how;
  const { lang } = useLanguage();
  const [step, setStep] = useState(0);
  const last = c.steps.length - 1;
  const start = useStartHref();
  const basicPrice = formatPrice(PLANS.basic.priceUsd, lang);

  // Autoplay: advance every AUTOPLAY_MS while the section is on screen. Hover or focus
  // pauses it; any click on the walkthrough stops it for good; reduced motion disables it.
  // Observed on the desktop block, which is display:none on mobile, so it never runs there.
  const stageRef = useRef<HTMLDivElement>(null);
  const inView = useInView(stageRef, { amount: 0.4 });
  const reduced = useReducedMotion();
  const [auto, setAuto] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const autoplaying = auto && !reduced && step < last;
  const running = autoplaying && inView && !hovered && !focused;
  const progress = useMotionValue(0);

  // Screen-reader text for steps autoplay moves to (user-chosen tabs announce themselves).
  const [announcement, setAnnouncement] = useState("");
  const stepLabel = (i: number) =>
    c.stepOf.replace("{n}", formatNumber(i + 1, lang)).replace("{total}", formatNumber(c.steps.length, lang));

  useAnimationFrame((_, delta) => {
    if (!running) return;
    const next = progress.get() + delta / AUTOPLAY_MS;
    if (next < 1) return progress.set(next);
    progress.set(0);
    const to = Math.min(step + 1, last);
    setStep(to);
    setAnnouncement(`${stepLabel(to)}: ${c.steps[to].title}`);
  });

  /** A user choice: go to that step and stop autoplay. */
  function go(i: number) {
    setAuto(false);
    setStep(i);
  }

  // Vertical tabs keyboard pattern: Up/Down move (wrapping), Home/End jump; selection follows focus.
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  function onTabKey(e: React.KeyboardEvent) {
    const n = c.steps.length;
    const to =
      e.key === "ArrowDown" ? (step + 1) % n
      : e.key === "ArrowUp" ? (step - 1 + n) % n
      : e.key === "Home" ? 0
      : e.key === "End" ? last
      : null;
    if (to === null) return;
    e.preventDefault();
    go(to);
    tabRefs.current[to]?.focus();
  }

  return (
    <section id="how" className="scroll-mt-20 lg:border-y lg:border-line lg:bg-white">
      <div className="mx-auto max-w-[1200px] px-5 py-7 lg:px-6 lg:py-[72px]">
        <Reveal className="mx-auto mb-4 max-w-[640px] text-center lg:mb-10">
          <div className={cn("hidden text-[13px] font-bold text-gold-deep lg:block", lang === "en" && "tracking-[0.1em]")}>{c.kicker}</div>
          <h2 className="mt-1.5 mb-2 text-lg font-bold lg:text-[32px] lg:leading-[1.6]">{c.title}</h2>
          <p className="hidden text-base text-muted lg:block">{c.sub}</p>
        </Reveal>

        {/* Mobile: accordion with a compact panel per step */}
        <HowItWorksMobile />

        {/* Desktop: stepper with live panel */}
        <p aria-live="polite" className="sr-only">{announcement}</p>
        <Reveal className="hidden lg:block">
          <div
            ref={stageRef}
            className="flex items-stretch gap-8"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onFocus={() => setFocused(true)}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false);
            }}
            // Clicks inside the live panel (e.g. a template preview) also count as taking over.
            onPointerDownCapture={() => setAuto(false)}
          >
            <div className="flex min-w-0 flex-[1_1_340px] flex-col">
              <div role="tablist" aria-label={c.title} aria-orientation="vertical" onKeyDown={onTabKey} className="flex flex-col gap-1.5">
                {c.steps.map((s, i) => {
                  const on = i === step;
                  return (
                    <button
                      key={s.title}
                      ref={(el) => {
                        tabRefs.current[i] = el;
                      }}
                      type="button"
                      role="tab"
                      id={`how-tab-${i}`}
                      aria-selected={on}
                      aria-controls="how-panel"
                      tabIndex={on ? 0 : -1}
                      onClick={() => go(i)}
                      className={cn(
                        "relative flex cursor-pointer items-center gap-3.5 rounded-card border-[1.5px] border-transparent p-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold",
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
                      {/* Connector from this circle down to the next one (centre x = 16px padding + 20px).
                          It runs 21px past this button: 1.5px border + 6px gap + 1.5px border + 16px
                          padding, minus 4px of breathing room above the next circle. z-1 keeps it above
                          the next step's ivory highlight; the circles sit above it at z-2. */}
                      {i < last && (
                        <span aria-hidden className="absolute top-[60px] -bottom-[21px] left-[35px] z-1 w-0.5 overflow-hidden rounded-full bg-line-strong">
                          <motion.span
                            initial={false}
                            animate={{ scaleY: i < step ? 1 : 0 }}
                            transition={{ duration: 0.45, ease: EASE }}
                            className="block size-full origin-top bg-jade"
                          />
                        </span>
                      )}
                      <span
                        className={cn(
                          "relative z-2 flex size-10 shrink-0 items-center justify-center rounded-full font-bold transition-colors",
                          i < step ? "bg-jade text-white" : on ? "bg-maroon text-white" : "bg-sand text-maroon",
                        )}
                      >
                        {i < step ? <CheckIcon size={18} /> : formatNumber(i + 1, lang)}
                        {/* Autoplay countdown: a ring around the active circle that fills clockwise
                            from the top. 48px box, r=23 with a 2px stroke leaves a 2px gap to the circle. */}
                        {on && autoplaying && (
                          <svg aria-hidden viewBox="0 0 48 48" className="pointer-events-none absolute -inset-1 size-12 -rotate-90">
                            <circle cx="24" cy="24" r="23" fill="none" strokeWidth="2" className="stroke-gold-soft" />
                            <motion.circle
                              cx="24"
                              cy="24"
                              r="23"
                              fill="none"
                              strokeWidth="2"
                              strokeLinecap="round"
                              className="stroke-maroon"
                              style={{ pathLength: progress }}
                            />
                          </svg>
                        )}
                      </span>
                      <span className="relative flex flex-col gap-0.5">
                        <span className="text-[17px] font-bold">{s.title}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-5 flex gap-2.5">
                {step > 0 && <Button variant="secondary" onClick={() => go(step - 1)}>{c.prev}</Button>}
                {step < last ? (
                  <Button onClick={() => go(step + 1)}>{c.next}</Button>
                ) : (
                  <span className="relative inline-flex">
                    {/* Gold pulse draws the eye to the CTA once the walkthrough ends. */}
                    {!reduced && (
                      <motion.span
                        aria-hidden
                        className="absolute inset-0 rounded-card bg-gold/50"
                        initial={{ scale: 1, opacity: 0.7 }}
                        animate={{ scale: 1.18, opacity: 0 }}
                        transition={{ duration: 1.6, ease: "easeOut", repeat: Infinity, repeatDelay: 0.4 }}
                      />
                    )}
                    <ButtonLink href={start} className="relative">{c.start}</ButtonLink>
                  </span>
                )}
              </div>
              {/* Reassurance under the final CTA: what's free, when you pay, and the entry price. */}
              <AnimatePresence initial={false}>
                {step === last && (
                  <motion.ul
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={{ duration: 0.3, ease: EASE, delay: 0.15 }}
                    className="mt-3.5 flex flex-wrap gap-x-4 gap-y-1.5 text-[13px] text-ink-soft"
                  >
                    {[
                      ...c.reassure,
                      c.fromPrice.replace("{usd}", basicPrice.usd).replace("{riel}", basicPrice.riel),
                    ].map((item) => (
                      <li key={item} className="flex items-center gap-1.5">
                        <CheckIcon size={14} className="shrink-0 text-jade-ink" />
                        {item}
                      </li>
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>
            </div>

            <div
              role="tabpanel"
              tabIndex={0}
              id="how-panel"
              aria-labelledby={`how-tab-${step}`}
              className="flex min-h-[560px] min-w-0 flex-[2_1_560px] flex-col gap-[18px] rounded-[20px] bg-white p-8 shadow-[0_10px_40px_rgba(43,43,43,0.08)] ring-1 ring-line focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold"
            >
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
                <div className="flex gap-1.5" role="img" aria-label={stepLabel(step)}>
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
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/**
 * Template grid: filter by event type, click a template to select it and open
 * the full-screen preview (as the panel note promises).
 */
function PanelTemplates() {
  const c = useContent(landingContent);
  const { lang, t } = useLanguage();
  const [filter, setFilter] = useState<"all" | EventType>("all");
  const [selectedId, setSelectedId] = useState(templates[0].id);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const shown = templates.filter((tpl) => filter === "all" || tpl.eventType === filter);
  const filters = [
    ["all", c.templates.all],
    ["wedding", t.eventType.wedding],
    ["engagement", t.eventType.engagement],
  ] as const;

  return (
    <div className="flex flex-col gap-3.5">
      <div role="group" aria-label={c.how.filterLabel} className="flex gap-2">
        {filters.map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
            className={cn(
              "relative min-h-11 cursor-pointer rounded-full border-[1.5px] px-4 text-sm font-semibold transition-colors",
              filter === value ? "border-charcoal text-white" : "border-line-strong bg-white text-charcoal hover:border-charcoal",
            )}
          >
            {filter === value && (
              <motion.span layoutId="how-template-filter" transition={SPRING} aria-hidden className="absolute -inset-[1.5px] rounded-full bg-charcoal" />
            )}
            <span className="relative">{label}</span>
          </button>
        ))}
      </div>

      <ul className="grid grid-cols-4 gap-3">
        <AnimatePresence mode="popLayout" initial={false}>
          {shown.map((tpl) => {
            const name = lang === "km" ? tpl.nameKm : tpl.nameEn;
            const selected = tpl.id === selectedId;
            return (
              <motion.li
                key={tpl.id}
                layout
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.15 } }}
                transition={{ duration: 0.25, ease: EASE }}
              >
                <motion.button
                  type="button"
                  onClick={() => {
                    setSelectedId(tpl.id);
                    setPreviewId(tpl.id);
                  }}
                  aria-pressed={selected}
                  aria-label={`${c.how.preview}: ${name} · ${t.tier[tpl.tier]} · ${formatPrice(tpl.priceUsd, lang).both}`}
                  whileHover={{ y: -4 }}
                  whileTap={{ scale: 0.97 }}
                  className="group flex w-full cursor-pointer flex-col gap-2 rounded-card text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold"
                >
                  <span className="relative block">
                    <TemplateThumb
                      template={tpl}
                      size="md"
                      className={cn(
                        "h-[150px] transition-shadow duration-300 group-hover:shadow-lift",
                        selected && "outline-[3px] outline-offset-[3px] outline-gold",
                      )}
                    />
                    {/* Hover hint: the whole card opens the preview. */}
                    <span
                      aria-hidden
                      className="absolute inset-x-0 bottom-2.5 flex justify-center opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
                    >
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-charcoal/80 px-3 py-1 text-xs font-semibold text-white">
                        <EyeIcon size={14} />
                        {c.how.preview}
                      </span>
                    </span>
                  </span>
                  <span className="flex items-center justify-between gap-1.5 px-0.5">
                    <span className={cn("truncate text-sm font-semibold", lang === "km" && "leading-[1.7]")}>{name}</span>
                    <Badge tone={tpl.tier === "premium" ? "gold" : "neutral"} className="text-[11px]">
                      {t.tier[tpl.tier]}
                    </Badge>
                  </span>
                </motion.button>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>

      <PreviewDialog
        open={previewId !== null}
        onClose={() => setPreviewId(null)}
        invitation={{ ...inv, templateId: previewId ?? inv.templateId }}
        photos={[]}
        label={c.how.preview}
        closeLabel={c.how.closePreview}
      />
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
          <div lang="en" className="text-[9px] opacity-85">{formatEnglishDate(inv.eventDate)}</div>
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
        <div className="flex items-baseline justify-between gap-2 px-3.5 pt-2">
          <span className="text-[22px] font-bold">{formatPrice(15, lang).usd}.00</span>
          <span className="text-xs text-muted">{formatPrice(15, lang).riel}</span>
        </div>
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
