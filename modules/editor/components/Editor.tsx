"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { EASE, SPRING } from "@/components/motion/Motion";
import { Button, ButtonLink } from "@/components/ui/Button";
import { TierBadge } from "@/components/ui/Badge";
import { BackIcon, CheckIcon, ChevronRightIcon, CloseIcon, EyeIcon, LockIcon } from "@/components/ui/Icons";
import { DETAIL_STEP, draftCheckable, missingDetails } from "@/modules/payments/lib/invitation-checks";
import { stepStatuses } from "@/modules/editor/lib/step-status";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { Lotus } from "@/components/invitation/TemplateArt";
import { InvitationCover, PhoneFrame } from "@/components/invitation/InvitationCover";
import { PreviewDialog } from "@/components/invitation/PreviewDialog";
import { cn } from "@/lib/cn";
import { useContent, useLanguage } from "@/lib/i18n";
import { formatNumber, formatPrice } from "@/lib/khmer";
import { PLANS, getTemplate, templates } from "@/lib/mock-data";
import type { Draft } from "@/lib/store";
import { editorContent } from "@/modules/editor/content";
import {
  CoupleSection, DateSection, GiftSection, MusicSection, PhotosSection, ScheduleSection, VenueSection,
  type SectionProps,
} from "./Sections";
import { useDraft, type SaveStatus } from "@/modules/editor/hooks/useDraft";

const SECTIONS: React.ComponentType<SectionProps>[] = [
  CoupleSection, DateSection, VenueSection, ScheduleSection, PhotosSection, MusicSection, GiftSection,
];

const BACK = "/app";
const payHref = (id: string) => `/app/${id}/pay`;
const dashHref = (id: string) => `/app/${id}/dashboard`;

export function Editor({ initial, initialStep = 0 }: { initial: Draft; initialStep?: number }) {
  const c = useContent(editorContent);
  const { lang } = useLanguage();
  const { draft, update, status, flush } = useDraft(initial);
  const [step, setStep] = useState(() => Math.min(Math.max(0, Math.trunc(initialStep)), SECTIONS.length - 1));
  // 1 = moving forward, -1 = back: sets which way the section slides.
  const [direction, setDirection] = useState(1);
  const [previewOpen, setPreviewOpen] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  const template = getTemplate(draft.templateId) ?? templates[0];
  const price = formatPrice(template.priceUsd, lang);
  const Section = SECTIONS[step];
  // Photos over the plan limit (after switching to a Basic template) never reach guests.
  const shownPhotos = draft.photos.slice(0, PLANS[template.tier].maxPhotos);
  const previewDraft = shownPhotos.some((p) => p.id === draft.coverPhotoId) ? draft : { ...draft, coverPhotoId: shownPhotos[0]?.id ?? null };
  const last = SECTIONS.length - 1;
  // Editing a published invitation is free: no pay step, changes are live as soon as they save.
  const isLive = draft.status === "live";
  const doneHref = isLive ? dashHref(draft.id) : payHref(draft.id);
  // Same rules as the pay screen and payment API: every field must be filled before publishing.
  const missing = isLive ? [] : missingDetails(draftCheckable(draft));
  const ready = missing.length === 0;
  // Green tick = the step's fields are filled in, wherever the host is in the flow.
  const statuses = stepStatuses(draft, !isLive);
  // First thing each step still needs (steps with nothing missing aren't in the map).
  const missingByStep = new Map(statuses.flatMap((s, i) => (s.needs.length ? [[i, s.needs[0]] as const] : [])));
  /** "Add both names" or "Add both names +1" when the step needs more than one thing. */
  const needLabel = (i: number) => {
    const needs = statuses[i].needs;
    return c.incomplete.labels[needs[0]].action + (needs.length > 1 ? ` +${formatNumber(needs.length - 1, lang)}` : "");
  };
  const doneCount = statuses.filter((s) => s.state === "complete").length;
  const [showMissing, setShowMissing] = useState(false);
  const blockedLabel = c.incomplete.blocked(formatNumber(missing.length, lang));

  // Move focus to the new section's heading so screen readers announce it.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [step]);

  const router = useRouter();
  /** The next screen reads the saved invitation, so finish saving before navigating. */
  async function leave(e: React.MouseEvent, href: string) {
    e.preventDefault();
    await flush();
    router.push(href);
  }

  /** Publish buttons stay focusable while blocked, so a click can explain what's missing. */
  function tryPublish(e: React.MouseEvent) {
    if (ready) return leave(e, doneHref);
    e.preventDefault();
    setShowMissing(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const goTo = (i: number) => {
    setDirection(i >= step ? 1 : -1);
    setStep(i);
    window.scrollTo({ top: 0 });
  };

  // Keep the active mobile tab in view when Next/Back changes the step.
  useEffect(() => {
    document.querySelector(`[data-tab="${step}"]`)?.scrollIntoView({ inline: "nearest", block: "nearest" });
  }, [step]);

  const stepLabel = `${c.step} ${formatNumber(step + 1, lang)} ${c.of} ${formatNumber(SECTIONS.length, lang)}`;
  // Khmer names when the UI is Khmer, else English; given names only, like the rest of the host app.
  const given = (s: string) => s.trim().split(/\s+/).at(-1) ?? "";
  const [groom, bride] = lang === "km"
    ? [draft.groomKm || draft.groomEn, draft.brideKm || draft.brideEn]
    : [draft.groomEn || draft.groomKm, draft.brideEn || draft.brideKm];
  const coupleName = groom || bride ? `${given(groom) || "—"} & ${given(bride) || "—"}` : "";

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Header: compact on mobile, full bar on desktop */}
      <header className="sticky top-0 z-20 border-b border-line bg-white">
        <div className="mx-auto flex max-w-[1440px] items-center gap-1.5 px-3 py-2 lg:gap-3 lg:px-6 lg:py-2.5">
          <Link href={BACK} aria-label={c.backToDashboard} className="flex size-11 shrink-0 items-center justify-center rounded-full text-charcoal hover:bg-sand">
            <BackIcon size={22} />
          </Link>
          <div className="min-w-0 grow">
            <div className="truncate text-[15px] leading-[1.6] font-bold lg:text-base">
              <span className="lg:hidden">{c.title}</span>
              <span className={cn("hidden lg:inline", !coupleName && "text-muted")}>{coupleName || c.untitled}</span>
            </div>
            <SaveIndicator status={status} />
          </div>
          {/* Same 44px height and corners as the buttons beside it. */}
          <LanguageToggle flags className="h-11 shrink-0 rounded-card" />
          {/* The side preview only fits from xl; below that the button opens it full-screen. */}
          <Button variant="secondary" size="sm" className="min-h-11 px-3 text-[13px] xl:hidden" onClick={() => setPreviewOpen(true)}>
            <EyeIcon size={16} />
            {c.preview}
          </Button>
          <ButtonLink
            href={doneHref}
            onClick={tryPublish}
            size="sm"
            aria-disabled={!ready || undefined}
            title={ready ? undefined : blockedLabel}
            className={cn("hidden lg:inline-flex", !ready && "bg-maroon/45 hover:bg-maroon/55")}
          >
            {!ready && <LockIcon size={15} />}
            {isLive ? c.done : (
              <>
                {c.publish} · {price.usd} <span className="font-normal opacity-85">({price.riel})</span>
              </>
            )}
            {!ready && <span className="sr-only">. {blockedLabel}</span>}
          </ButtonLink>
        </div>

        {/* Mobile tabs */}
        <nav aria-label={c.sectionsLabel} className="flex gap-1.5 overflow-x-auto px-3 pt-0.5 pb-2 lg:hidden">
          {c.sections.map((label, i) => {
            const need = missingByStep.get(i);
            const done = statuses[i].state === "complete";
            const current = i === step;
            return (
              <button
                key={label}
                type="button"
                onClick={() => goTo(i)}
                data-tab={i}
                aria-current={current ? "step" : undefined}
                className={cn(
                  "relative flex min-h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold transition-colors",
                  current
                    ? "text-white"
                    : need
                      ? "border-[1.5px] border-maroon/35 bg-rose-soft pl-2 text-maroon"
                      : done
                        ? "bg-jade-soft text-jade-ink"
                        : "bg-sand text-ink-soft",
                  current && need && "pl-2",
                )}
              >
                {current && (
                  <motion.span layoutId="editor-tab-mobile" transition={SPRING} aria-hidden className="absolute inset-0 rounded-full bg-maroon" />
                )}
                {/* Same "!" badge as the desktop stepper */}
                {need && (
                  <span
                    aria-hidden
                    className={cn(
                      "relative flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                      current ? "bg-gold-light text-charcoal" : "bg-maroon text-white",
                    )}
                  >
                    !
                  </span>
                )}
                {done && <CheckIcon size={14} className="relative" />}
                <span className="relative">{label}</span>
                {need && <span className="sr-only">. {c.incomplete.stepMissing}</span>}
              </button>
            );
          })}
        </nav>

        {/* Mobile: what the current step still needs (the desktop stepper shows this under each step). */}
        {missingByStep.has(step) && (
          <div role="status" className="flex items-center gap-2 border-t border-maroon/15 bg-rose-soft px-4 py-2 text-xs font-semibold text-maroon lg:hidden">
            <span aria-hidden className="flex size-5 shrink-0 items-center justify-center rounded-full bg-maroon text-[11px] font-bold text-white">!</span>
            <span className="leading-[1.6]">{needLabel(step)}</span>
          </div>
        )}
      </header>

      <div className="mx-auto flex w-full max-w-[1440px] grow gap-6 lg:p-6">
        {/* Desktop: vertical stepper card + the template in use */}
        <div className="sticky top-24 hidden h-fit w-60 shrink-0 flex-col gap-3 lg:flex">
          <nav aria-label={c.sectionsLabel} className="overflow-hidden rounded-card bg-white shadow-card">
            <div className="border-b border-line px-4 pt-3.5 pb-3">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-semibold text-muted">{c.progress(formatNumber(doneCount, lang), formatNumber(SECTIONS.length, lang))}</span>
                <span className="text-xs font-bold text-jade-ink">{formatNumber(Math.round((doneCount / SECTIONS.length) * 100), lang)}%</span>
              </div>
              <div aria-hidden className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-sand-light">
                <motion.div
                  className="h-full rounded-full bg-jade"
                  initial={false}
                  animate={{ width: `${(doneCount / SECTIONS.length) * 100}%` }}
                  transition={{ duration: 0.4, ease: EASE }}
                />
              </div>
            </div>

            <ol className="relative p-2">
              {c.sections.map((label, i) => {
                const need = missingByStep.get(i);
                const done = statuses[i].state === "complete";
                const current = i === step;
                return (
                  <li key={label} className="relative">
                    {/* Connector from this circle to the next one */}
                    {i < last && (
                      <span aria-hidden className={cn("absolute top-9.5 -bottom-2.5 left-5.75 w-0.5 rounded-full", done ? "bg-jade/50" : "bg-line")} />
                    )}
                    <button
                      type="button"
                      onClick={() => goTo(i)}
                      aria-current={current ? "step" : undefined}
                      className={cn(
                        "relative flex w-full cursor-pointer items-start gap-3 rounded-[10px] px-2.5 py-2.5 text-left text-sm font-semibold transition-colors",
                        current ? "text-maroon" : done || need ? "text-charcoal hover:bg-sand-light" : "text-muted hover:bg-sand-light hover:text-charcoal",
                      )}
                    >
                      {current && (
                        <motion.span layoutId="editor-tab-desktop" transition={SPRING} aria-hidden className="absolute inset-0 rounded-[10px] bg-rose-soft/60" />
                      )}
                      <span
                        className={cn(
                          "relative flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors",
                          current
                            ? "bg-maroon text-white ring-4 ring-maroon/15"
                            : need
                              ? "border-[1.5px] border-maroon/40 bg-rose-soft text-maroon"
                              : done
                                ? "bg-jade text-white"
                                : "border-[1.5px] border-line-strong bg-white text-muted",
                        )}
                      >
                        {done ? <CheckIcon size={13} /> : need && !current ? "!" : formatNumber(i + 1, lang)}
                      </span>
                      <span className="relative min-w-0 grow pt-0.5">
                        <span className="block leading-[1.6]">{label}</span>
                        {need && (
                          <span className="mt-0.5 flex items-center gap-1 text-xs font-medium text-maroon">
                            <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-maroon" />
                            <span className="sr-only">{c.incomplete.stepMissing}: </span>
                            {needLabel(i)}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>

            {/* Overall status for drafts: what's left, or ready. */}
            {!isLive && (
              <button
                type="button"
                onClick={() => (ready ? undefined : goTo(DETAIL_STEP[missing[0]]))}
                disabled={ready}
                className={cn(
                  "flex w-full items-center gap-2 border-t px-4 py-3 text-left text-xs font-semibold transition-colors",
                  ready ? "cursor-default border-jade/20 bg-jade-soft text-jade-ink" : "cursor-pointer border-maroon/15 bg-rose-soft text-maroon hover:bg-rose-soft/70",
                )}
              >
                <span aria-hidden className={cn("flex size-6 shrink-0 items-center justify-center rounded-full bg-white", ready ? "text-jade-ink" : "text-maroon")}>
                  {ready ? <CheckIcon size={13} /> : <span className="font-bold">!</span>}
                </span>
                <span className="grow leading-[1.6]">
                  {ready ? c.incomplete.allSet : c.incomplete.attention(formatNumber(missingByStep.size, lang))}
                </span>
                {!ready && <ChevronRightIcon size={14} />}
              </button>
            )}
          </nav>

          <div className="flex items-center gap-3 rounded-card bg-white p-3 shadow-card">
            {/* Mini cover in the template's own palette (data, so inline styles). */}
            <span aria-hidden className="h-15 w-11.5 shrink-0 rounded-md p-0.5 ring-1 ring-line" style={{ background: template.theme.bg }}>
              <span className="flex h-full items-center justify-center rounded-sm border" style={{ borderColor: template.theme.accent }}>
                <Lotus size={18} color={template.theme.accent} strokeWidth={1.4} />
              </span>
            </span>
            <div className="min-w-0">
              <div className="text-[11px] font-semibold text-muted">{c.template}</div>
              <div className="truncate text-sm font-bold">{lang === "km" ? template.nameKm : template.nameEn}</div>
              <TierBadge tier={template.tier} className="mt-0.5 text-[11px]" />
            </div>
          </div>
        </div>

        <main className="flex min-w-0 grow flex-col px-4 pt-4 pb-28 lg:px-0 lg:pt-0 lg:pb-0">
          <div className="mb-4 lg:mb-5">
            <div className={cn("text-xs font-bold text-gold-deep", lang === "en" && "tracking-[0.06em]")}>{stepLabel}</div>
            <h1 ref={headingRef} tabIndex={-1} className="text-xl leading-[1.6] font-bold outline-none lg:text-[28px]">
              {c.sections[step]}
            </h1>
            <p className="mt-0.5 text-[13px] text-muted lg:text-sm">{c.hints[step]}</p>
          </div>

          {/* Shown after a blocked Publish click; disappears once everything is filled in. */}
          <AnimatePresence initial={false}>
            {showMissing && !ready && (
              <motion.div
                key="missing"
                role="alert"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25, ease: EASE }}
                className="overflow-hidden"
              >
                <div className="mb-4 rounded-card border border-maroon/25 bg-rose-soft p-4">
                  <div className="flex items-start gap-3">
                    <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-maroon">
                      <LockIcon size={17} />
                    </span>
                    <div className="min-w-0 grow">
                      <h2 className="text-sm leading-[1.6] font-bold text-maroon">{c.incomplete.title}</h2>
                      <p className="text-[13px] text-ink-soft">{c.incomplete.body}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowMissing(false)}
                      aria-label={c.incomplete.close}
                      className="-m-1.5 flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-maroon hover:bg-white/60"
                    >
                      <CloseIcon size={16} />
                    </button>
                  </div>
                  <ul className="mt-2.5 flex flex-col gap-1.5">
                    {missing.map((m) => (
                      <li key={m} className="flex items-center justify-between gap-3 rounded-[10px] bg-white px-3 py-1">
                        <span className="flex min-w-0 items-center gap-2 text-sm">
                          <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-maroon" />
                          <span className="leading-[1.7]">{c.incomplete.labels[m].item}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => goTo(DETAIL_STEP[m])}
                          className="flex min-h-11 shrink-0 cursor-pointer items-center gap-1 text-sm font-semibold text-maroon hover:underline"
                        >
                          {c.incomplete.fix}
                          <ChevronRightIcon size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          {/* Fixed minimum height: short steps and the empty moment between slides don't make
              the Back/Next row jump up and down when switching steps. */}
          <div className="min-h-[24rem] lg:min-h-[30rem]">
          <AnimatePresence mode="wait" initial={false} custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={{
                enter: (d: number) => ({ opacity: 0, x: d * 28 }),
                center: { opacity: 1, x: 0 },
                exit: (d: number) => ({ opacity: 0, x: d * -28 }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: EASE }}
            >
              <Section draft={draft} update={update} tier={template.tier} />
            </motion.div>
          </AnimatePresence>
          </div>
          {status === "error" && <p role="alert" className="mt-3 text-[13px] text-maroon">{c.saveFailed}</p>}

          {/* Step navigation: sticky bar on mobile, inline on desktop */}
          <div className="fixed inset-x-0 bottom-0 z-10 flex gap-2.5 border-t border-line bg-white px-4 pt-3 pb-[max(1.125rem,env(safe-area-inset-bottom))] lg:static lg:mt-6 lg:items-center lg:justify-between lg:border-t lg:bg-transparent lg:px-0 lg:pt-5 lg:pb-0">
            {step > 0 ? (
              <Button variant="secondary" className="flex-1 lg:flex-none" onClick={() => goTo(step - 1)}>
                <BackIcon size={16} />
                {c.back}
              </Button>
            ) : (
              <span className="hidden lg:block" />
            )}
            {step < last ? (
              <Button className="flex-[2] lg:flex-none" onClick={() => goTo(step + 1)}>
                <span className="lg:hidden">{c.next}</span>
                <span className="hidden lg:inline">{c.nextTo(c.sections[step + 1])}</span>
                <ChevronRightIcon size={16} />
              </Button>
            ) : (
              <ButtonLink
                href={doneHref}
                onClick={tryPublish}
                aria-disabled={!ready || undefined}
                title={ready ? undefined : blockedLabel}
                className={cn("flex-[2] lg:flex-none", !ready && "bg-maroon/45 hover:bg-maroon/55")}
              >
                {!ready && <LockIcon size={15} />}
                {isLive ? c.done : c.toPay}
                {ready && <ChevronRightIcon size={16} />}
                {!ready && <span className="sr-only">. {blockedLabel}</span>}
              </ButtonLink>
            )}
          </div>
        </main>

        {/* Desktop live preview */}
        <aside aria-label={c.livePreview} className="sticky top-24 hidden h-fit shrink-0 flex-col items-center gap-3 xl:flex">
          <div className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink-soft shadow-card">
            <span aria-hidden className="size-1.5 rounded-full bg-jade motion-safe:animate-pulse" />
            {c.livePreview}
          </div>
          <PhoneFrame>
            <InvitationCover invitation={previewDraft} photos={shownPhotos} compact />
          </PhoneFrame>
        </aside>
      </div>

      <PreviewDialog open={previewOpen} onClose={() => setPreviewOpen(false)} invitation={previewDraft} photos={shownPhotos} label={c.livePreview} closeLabel={c.closePreview} />
    </div>
  );
}

function SaveIndicator({ status }: { status: SaveStatus }) {
  const c = useContent(editorContent);
  return (
    <>
      <div aria-hidden className={cn("flex items-center gap-1 text-xs", status === "error" ? "text-maroon" : status === "saving" ? "text-muted" : "text-jade-ink")}>
        {status === "saved" && <CheckIcon size={12} />}
        {status === "saving" ? c.saving : status === "saved" ? c.saved : c.saveFailedShort}
      </div>
      {/* Screen readers hear only "saved" or the error, not every keystroke. */}
      <span role="status" className="sr-only">{status === "saving" ? "" : status === "saved" ? c.saved : c.saveFailedShort}</span>
    </>
  );
}
