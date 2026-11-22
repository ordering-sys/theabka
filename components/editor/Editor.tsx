"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { BackIcon, CheckIcon } from "@/components/ui/Icons";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { InvitationCover, PhoneFrame } from "@/components/invitation/InvitationCover";
import { PreviewDialog } from "@/components/invitation/PreviewDialog";
import { cn } from "@/lib/cn";
import { useContent, useLanguage } from "@/lib/i18n";
import { formatNumber, formatPrice } from "@/lib/khmer";
import { PLANS, getTemplate, templates } from "@/lib/mock-data";
import type { Draft } from "@/lib/store";
import { editorContent } from "./content";
import {
  CoupleSection, DateSection, GiftSection, MusicSection, PhotosSection, ScheduleSection, VenueSection,
  type SectionProps,
} from "./Sections";
import { useDraft, type SaveStatus } from "./useDraft";

const SECTIONS: React.ComponentType<SectionProps>[] = [
  CoupleSection, DateSection, VenueSection, ScheduleSection, PhotosSection, MusicSection, GiftSection,
];

const BACK = "/app";
const payHref = (id: string) => `/app/${id}/pay`;
const dashHref = (id: string) => `/app/${id}/dashboard`;

export function Editor({ initial }: { initial: Draft }) {
  const c = useContent(editorContent);
  const { lang } = useLanguage();
  const { draft, update, status, flush } = useDraft(initial);
  const [step, setStep] = useState(0);
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

  const goTo = (i: number) => {
    setStep(i);
    window.scrollTo({ top: 0 });
  };

  // Keep the active mobile tab in view when Next/Back changes the step.
  useEffect(() => {
    document.querySelector(`[data-tab="${step}"]`)?.scrollIntoView({ inline: "nearest", block: "nearest" });
  }, [step]);

  const stepLabel = `${c.step} ${formatNumber(step + 1, lang)} ${c.of} ${formatNumber(SECTIONS.length, lang)}`;

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Header: compact on mobile, full bar on desktop */}
      <header className="sticky top-0 z-20 border-b border-line bg-ivory lg:bg-white">
        <div className="mx-auto flex max-w-[1440px] items-center gap-1.5 px-3 py-2 lg:gap-3 lg:px-6 lg:py-2.5">
          <Link href={BACK} aria-label={c.backToDashboard} className="flex size-11 shrink-0 items-center justify-center rounded-full text-charcoal hover:bg-sand">
            <BackIcon size={22} />
          </Link>
          <div className="min-w-0 grow">
            <div className="truncate text-[15px] font-bold lg:text-base">
              <span className="lg:hidden">{c.title}</span>
              <span lang="en" className="hidden lg:inline">{draft.groomEn || "—"} &amp; {draft.brideEn || "—"}</span>
            </div>
            <SaveIndicator status={status} />
          </div>
          <LanguageToggle />
          <Button variant="secondary" size="sm" className="min-h-11 px-3 text-[13px] lg:hidden" onClick={() => setPreviewOpen(true)}>
            <EyeIcon />
            {c.preview}
          </Button>
          <ButtonLink href={doneHref} onClick={(e) => leave(e, doneHref)} className="hidden lg:inline-flex">
            {isLive ? c.done : (
              <>
                {c.publish} · {price.usd} <span className="font-normal opacity-85">({price.riel})</span>
              </>
            )}
          </ButtonLink>
        </div>

        {/* Mobile tabs */}
        <nav aria-label={c.sectionsLabel} className="flex gap-1.5 overflow-x-auto px-3 pt-0.5 pb-2 lg:hidden">
          {c.sections.map((label, i) => (
            <button
              key={label}
              type="button"
              onClick={() => goTo(i)}
              data-tab={i}
              aria-current={i === step ? "step" : undefined}
              className={cn(
                "flex min-h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold",
                i === step ? "bg-maroon text-white" : i < step ? "bg-jade-soft text-jade-ink" : "bg-sand text-ink-soft",
              )}
            >
              {i < step && <CheckIcon size={14} />}
              {label}
            </button>
          ))}
        </nav>
      </header>

      <div className="mx-auto flex w-full max-w-[1440px] grow gap-6 lg:p-6">
        {/* Desktop section list */}
        <nav aria-label={c.sectionsLabel} className="hidden w-[220px] shrink-0 flex-col gap-1 lg:flex">
          {c.sections.map((label, i) => (
            <button
              key={label}
              type="button"
              onClick={() => goTo(i)}
              aria-current={i === step ? "step" : undefined}
              className={cn(
                "flex min-h-11 cursor-pointer items-center gap-2.5 rounded-card px-3 text-left text-sm font-semibold",
                i === step ? "bg-white text-maroon ring-1 ring-line" : "text-ink-soft hover:bg-white/60",
              )}
            >
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full text-xs",
                  i === step ? "bg-maroon text-white" : i < step ? "bg-jade text-white" : "bg-sand text-maroon",
                )}
              >
                {i < step ? <CheckIcon size={12} /> : formatNumber(i + 1, lang)}
              </span>
              {label}
            </button>
          ))}
        </nav>

        <main className="flex min-w-0 grow flex-col px-4 pt-4 pb-28 lg:px-0 lg:pt-0 lg:pb-0">
          <div className={cn("text-xs font-bold text-gold-deep lg:hidden", lang === "en" && "tracking-[0.06em]")}>{stepLabel}</div>
          <h1 ref={headingRef} tabIndex={-1} className="mb-3.5 text-xl font-bold outline-none lg:text-2xl">
            {c.sections[step]}
          </h1>
          <div key={step} className="animate-fade-in">
            <Section draft={draft} update={update} tier={template.tier} />
          </div>
          {status === "error" && <p role="alert" className="mt-3 text-[13px] text-maroon">{c.saveFailed}</p>}

          {/* Step navigation: sticky bar on mobile, inline on desktop */}
          <div className="fixed inset-x-0 bottom-0 z-10 flex gap-2.5 border-t border-line bg-white px-4 pt-3 pb-[max(1.125rem,env(safe-area-inset-bottom))] lg:static lg:mt-5 lg:border-0 lg:bg-transparent lg:p-0">
            {step > 0 && (
              <Button variant="secondary" className="flex-1 lg:flex-none" onClick={() => goTo(step - 1)}>{c.back}</Button>
            )}
            {step < last ? (
              <Button className="flex-[2] lg:flex-none" onClick={() => goTo(step + 1)}>{c.next}</Button>
            ) : (
              <ButtonLink href={doneHref} onClick={(e) => leave(e, doneHref)} className="flex-[2] lg:flex-none">{isLive ? c.done : c.toPay}</ButtonLink>
            )}
          </div>
        </main>

        {/* Desktop live preview */}
        <aside aria-label={c.livePreview} className="sticky top-24 hidden h-fit shrink-0 flex-col items-center gap-2.5 xl:flex">
          <div className="text-[13px] font-bold text-muted">{c.livePreview}</div>
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

function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
