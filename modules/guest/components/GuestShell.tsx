"use client";
/* eslint-disable @next/next/no-img-element -- host-uploaded KHQR image */

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { EASE, popIn } from "@/components/motion/Motion";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { CheckIcon, CloseIcon, GiftIcon, MailIcon } from "@/components/ui/Icons";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { cn } from "@/lib/cn";
import { useContent, useLanguage } from "@/lib/i18n";
import { addDays, formatDayMonth, formatNumber } from "@/lib/khmer";
import type { Invitation, Template } from "@/lib/mock-data";
import { addRsvp, addView } from "@/lib/store";
import { guestContent } from "@/modules/guest/content";
import { DoorsOpenContext } from "./reveal";
import { inputClass } from "@/components/ui/field";

/** `demo`: the built-in sample invitation. Views and RSVPs aren't saved, and a "Sample" pill links home. */
type Props = { invitation: Invitation; template: Template; demo?: boolean; children: React.ReactNode };

/**
 * Interactive layer around the server-rendered invitation: opening doors,
 * music, language toggle, sticky RSVP/Gift bar and their bottom sheets.
 */
export function GuestShell({ invitation: inv, template, demo = false, children }: Props) {
  const c = useContent(guestContent);
  const [doors, setDoors] = useState<"closed" | "opening" | "gone">("closed");
  const [sheet, setSheet] = useState<"rsvp" | "gift" | null>(null);
  const [playing, setPlaying] = useState(false);
  const audio = useRef<HTMLAudioElement>(null);
  const hasMusic = !!inv.musicUrl && !inv.musicUrl.startsWith("custom:");
  const hasGift = !!inv.giftQrUrl;

  // Lock page scroll while the doors cover it.
  useEffect(() => {
    document.documentElement.style.overflow = doors === "gone" ? "" : "hidden";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [doors]);

  function play() {
    audio.current?.play().then(() => setPlaying(true), () => setPlaying(false));
  }

  function openDoors() {
    setDoors("opening");
    // Opening is a user gesture, so browsers allow audio to start here.
    if (hasMusic && !inv.musicMutedDefault) play();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setTimeout(() => {
      setDoors("gone");
      // The doors button disappears; move focus to the invitation so it isn't lost.
      requestAnimationFrame(() => document.getElementById("invitation")?.focus());
    }, reduced ? 0 : 1000);
    if (!demo) void addView(inv.id);
  }

  function toggleMusic() {
    if (playing) {
      audio.current?.pause();
      setPlaying(false);
    } else play();
  }

  const opened = doors !== "closed";

  return (
    <DoorsOpenContext.Provider value={opened}>
    <div className="relative mx-auto min-h-dvh max-w-[480px] bg-ivory ring-1 ring-line">
      <main id="invitation" tabIndex={-1} className="outline-none" inert={doors !== "gone"}>{children}</main>

      {/* Sample invitation: a pill back to the landing page (top-left, opposite the controls). */}
      {demo && (
        <motion.a
          href="/"
          className="fixed top-3 left-[max(0.75rem,calc(50vw-240px+0.75rem))] z-20 flex min-h-11 items-center gap-2 rounded-full bg-charcoal/70 py-1.5 pr-3.5 pl-1.5 text-[13px] font-semibold text-white no-underline backdrop-blur-sm"
          inert={doors !== "gone"}
          initial={false}
          animate={opened ? { opacity: 1, y: 0 } : { opacity: 0, y: -12 }}
          transition={{ duration: 0.4, ease: EASE, delay: opened ? 0.8 : 0 }}
        >
          <span className="rounded-full bg-gold px-2 py-0.5 text-[11px] font-bold text-charcoal">{c.sample}</span>
          {c.sampleCta}
        </motion.a>
      )}

      {/* Top-right controls */}
      <motion.div
        className="fixed top-3 right-[max(0.75rem,calc(50vw-240px+0.75rem))] z-20 flex items-center gap-2"
        inert={doors !== "gone"}
        initial={false}
        animate={opened ? { opacity: 1, y: 0 } : { opacity: 0, y: -12 }}
        transition={{ duration: 0.4, ease: EASE, delay: opened ? 0.8 : 0 }}
      >
        <LanguageToggle variant="dark" />
        {hasMusic && (
          <motion.button
            type="button"
            onClick={toggleMusic}
            aria-label={playing ? c.musicOff : c.musicOn}
            whileTap={{ scale: 0.9 }}
            className="flex size-11 cursor-pointer items-center justify-center rounded-full bg-charcoal/55 text-white backdrop-blur-sm"
          >
            {playing ? (
              <span aria-hidden className="flex h-3.5 items-end gap-0.5">
                {[0, 0.2, 0.4].map((d) => (
                  <span key={d} className="w-[3px] motion-safe:animate-eq bg-gold-light" style={{ animationDelay: `${d}s` }} />
                ))}
              </span>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M11 5L6 9H2v6h4l5 4zM22 9l-6 6M16 9l6 6" />
              </svg>
            )}
          </motion.button>
        )}
      </motion.div>
      {hasMusic && <audio ref={audio} src={inv.musicUrl!} loop preload="none" onEnded={() => setPlaying(false)} />}

      {/* Sticky action bar: slides up once the doors open. */}
      <motion.div
        className="fixed inset-x-0 bottom-0 z-20 mx-auto flex max-w-[480px] gap-2.5 border-t border-line bg-ivory/95 px-4 pt-3 pb-[max(1.125rem,env(safe-area-inset-bottom))] backdrop-blur-sm"
        inert={doors !== "gone"}
        initial={false}
        animate={{ y: opened ? "0%" : "110%" }}
        transition={{ type: "spring", stiffness: 260, damping: 30, delay: opened ? 0.9 : 0 }}
      >
        <Button className={cn("min-h-[52px]", hasGift ? "flex-[2]" : "flex-1")} onClick={() => setSheet("rsvp")}>
          <MailIcon size={18} />
          {c.rsvp}
        </Button>
        {hasGift && (
          <Button variant="gold" className="min-h-[52px] flex-1" onClick={() => setSheet("gift")}>
            <GiftIcon size={18} />
            {c.gift}
          </Button>
        )}
      </motion.div>

      <RsvpSheet open={sheet === "rsvp"} onClose={() => setSheet((s) => (s === "rsvp" ? null : s))} invitation={inv} demo={demo} onGift={hasGift ? () => setSheet("gift") : undefined} />
      {hasGift && <GiftSheet open={sheet === "gift"} onClose={() => setSheet((s) => (s === "gift" ? null : s))} invitation={inv} />}

      {doors !== "gone" && <Doors invitation={inv} template={template} opening={doors === "opening"} onOpen={openDoors} />}
    </div>
    </DoorsOpenContext.Provider>
  );
}

function Doors({ invitation: inv, template, opening, onOpen }: { invitation: Invitation; template: Template; opening: boolean; onOpen: () => void }) {
  const c = useContent(guestContent);
  const { bg, fg, accent } = template.theme;
  const initial = (s: string) => (s.split(" ").at(-1) || s).charAt(0).toUpperCase();
  const door = "absolute inset-y-0 w-1/2";
  const doorTransition = { duration: 1, ease: [0.7, 0, 0.3, 1] } as const;

  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={opening}
      aria-label={c.open}
      className="fixed inset-0 z-40 mx-auto block max-w-[480px] cursor-pointer overflow-hidden"
    >
      <motion.span
        className={cn(door, "left-0 border-r")}
        style={{ background: bg, borderColor: accent }}
        initial={false}
        animate={{ x: opening ? "-100%" : "0%" }}
        transition={doorTransition}
      >
        <span className="absolute inset-y-4 right-2 left-4 rounded-l-card border" style={{ borderColor: accent }} />
      </motion.span>
      <motion.span
        className={cn(door, "right-0 border-l")}
        style={{ background: bg, borderColor: accent }}
        initial={false}
        animate={{ x: opening ? "100%" : "0%" }}
        transition={doorTransition}
      >
        <span className="absolute inset-y-4 right-4 left-2 rounded-r-card border" style={{ borderColor: accent }} />
      </motion.span>
      <motion.span
        className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 text-center"
        style={{ color: fg }}
        // No entrance: the server-rendered doors must be readable before JavaScript loads.
        initial={false}
        animate={opening ? { opacity: 0, scale: 0.6 } : { opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: EASE }}
      >
        <span lang="km" className="font-moul text-base leading-[1.9]" style={{ color: accent }}>
          {template.eventType === "wedding" ? "សិរីមង្គលអាពាហ៍ពិពាហ៍" : "ពិធីភ្ជាប់ពាក្យ"}
        </span>
        {/* Monogram breathes gently to invite a tap. */}
        <motion.span
          className="flex size-24 items-center justify-center rounded-full border-4"
          style={{ background: accent, borderColor: "var(--color-gold-light)" }}
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ duration: 2.4, ease: "easeInOut", repeat: Infinity }}
        >
          <span lang="en" className="font-serif text-[30px] italic" style={{ color: bg }}>
            {initial(inv.groomEn)}&amp;{initial(inv.brideEn)}
          </span>
        </motion.span>
        <span lang="en" className="font-serif text-2xl italic">
          {inv.groomEn.split(" ").at(-1)} &amp; {inv.brideEn.split(" ").at(-1)}
        </span>
        <motion.span
          className="mt-[18px] rounded-full border px-[18px] py-2 text-sm"
          style={{ borderColor: accent }}
          animate={{ opacity: [0.65, 1, 0.65] }}
          transition={{ duration: 2.4, ease: "easeInOut", repeat: Infinity }}
        >
          <span lang="km">ចុចដើម្បីបើក</span> · <span lang="en">Tap to open</span>
        </motion.span>
      </motion.span>
    </button>
  );
}

const PETALS = Array.from({ length: 12 }, (_, i) => ({
  left: `${(i * 83) % 100}%`,
  duration: `${2.4 + ((i * 7) % 10) / 6}s`,
  delay: `${((i * 5) % 12) / 8}s`,
  color: i % 3 === 0 ? "var(--color-gold)" : i % 3 === 1 ? "var(--color-rose-soft)" : "var(--color-gold-light)",
}));

function RsvpSheet({
  open, onClose, invitation: inv, demo, onGift,
}: { open: boolean; onClose: () => void; invitation: Invitation; demo: boolean; onGift?: () => void }) {
  const c = useContent(guestContent);
  const { lang } = useLanguage();
  const [name, setName] = useState("");
  const [attending, setAttending] = useState(true);
  const [party, setParty] = useState(2);
  const [message, setMessage] = useState("");
  const [touched, setTouched] = useState(false);
  const [sentName, setSentName] = useState<string | null>(null);
  const nameOk = name.trim().length > 0;
  const replyBy = formatDayMonth(addDays(inv.eventDate, -7), lang);

  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!nameOk) {
      document.getElementById("rsvp-name")?.focus();
      return;
    }
    if (sending) return;
    setSending(true);
    setSendError(false);
    try {
      // The sample shows the thank-you screen without saving anything.
      if (!demo) await addRsvp({ invitationId: inv.id, guestName: name.trim(), attending, partySize: attending ? party : 1, message: message.trim() || null });
      setSentName(name.trim());
    } catch {
      setSendError(true);
    } finally {
      setSending(false);
    }
  }

  function close() {
    onClose();
    // Reset after the sheet animates away so the next guest on this phone starts fresh.
    if (sentName) setTimeout(() => {
      setSentName(null);
      setName("");
      setMessage("");
      setTouched(false);
    }, 300);
  }

  return (
    <BottomSheet
      open={open}
      onClose={close}
      title={sentName ? undefined : c.rsvpTitle}
      label={c.thanksLabel}
      closeLabel={c.close}
    >
      {sentName ? (
        <div className="relative flex min-h-[420px] flex-col items-center justify-center gap-2 overflow-hidden text-center" role="status">
          {PETALS.map((p, i) => (
            <svg
              key={i}
              width="18"
              height="18"
              viewBox="0 0 24 24"
              aria-hidden
              className="absolute top-0 motion-safe:animate-petal motion-reduce:hidden"
              style={{ left: p.left, animationDuration: p.duration, animationDelay: p.delay }}
            >
              <path d="M12 2c3 4 3 8 0 12-3-4-3-8 0-12z" fill={p.color} />
            </svg>
          ))}
          <motion.div variants={popIn} initial="hidden" animate="show" className="flex size-[84px] items-center justify-center rounded-full bg-gold-soft text-maroon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden>
              <path d="M12 3c2 3 2 6 0 9-2-3-2-6 0-9z" />
              <path d="M12 12c3-2 6-2 8 0-3 2-6 2-8 0z" />
              <path d="M12 12c-3-2-6-2-8 0 3 2 6 2 8 0z" />
            </svg>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.4, ease: EASE }} lang="km" className="font-moul text-xl leading-[1.9] text-maroon">សូមអរគុណ</motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.4, ease: EASE }} lang="en" className="font-serif text-xl italic">Thank you, {sentName || "friend"}!</motion.div>
          <p className="max-w-[280px] text-sm text-muted">{attending ? c.thanksYes : c.thanksNo}</p>
          <Button variant="secondary" className="mt-2.5 min-w-[200px]" onClick={close}>{c.backInv}</Button>
          {onGift && <Button variant="gold" className="min-w-[200px]" onClick={onGift}>{c.sendGift}</Button>}
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="flex flex-col gap-3">
          <p className="-mt-2 text-[13px] text-muted">{c.rsvpBy(replyBy)}</p>
          <div>
            <label htmlFor="rsvp-name" className="text-[13px] font-semibold text-ink-soft">{c.name}</label>
            <input
              id="rsvp-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setTouched(true)}
              placeholder={c.namePh}
              autoComplete="name"
              maxLength={80}
              required
              aria-invalid={touched && !nameOk}
              aria-describedby={touched && !nameOk ? "rsvp-name-err" : undefined}
              className={cn(inputClass, "min-h-[50px] px-3 text-[15px]")}
            />
            {touched && !nameOk && <p id="rsvp-name-err" className="mt-1 text-[13px] text-maroon">{c.nameRequired}</p>}
          </div>

          <div role="group" aria-label={c.rsvpTitle} className="flex gap-2.5">
            {([true, false] as const).map((yes) => {
              const on = attending === yes;
              return (
                <motion.button
                  key={String(yes)}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setAttending(yes)}
                  whileTap={{ scale: 0.96 }}
                  className={cn(
                    "flex min-h-16 flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-card border-2 text-[15px] font-bold transition-colors",
                    on ? (yes ? "border-jade bg-jade-soft text-jade-ink" : "border-maroon bg-rose-soft text-maroon") : "border-line-strong bg-white text-charcoal",
                  )}
                >
                  <motion.span animate={on ? { scale: [1, 1.25, 1] } : { scale: 1 }} transition={{ duration: 0.35 }}>
                    {yes ? <CheckIcon size={22} /> : <CloseIcon size={22} />}
                  </motion.span>
                  {yes ? c.yes : c.no}
                </motion.button>
              );
            })}
          </div>

          <AnimatePresence initial={false}>
            {attending && (
              <motion.div
                key="party"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: EASE }}
                className="overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <span id="party-label" className="text-sm font-semibold">{c.people}</span>
                  <div className="flex items-center gap-3" role="group" aria-labelledby="party-label">
                    <motion.button whileTap={{ scale: 0.9 }} type="button" onClick={() => setParty((n) => Math.max(1, n - 1))} aria-disabled={party <= 1} aria-label={c.fewer} className="size-12 cursor-pointer rounded-card border-[1.5px] border-line-strong bg-white text-[22px] text-maroon aria-disabled:opacity-40">−</motion.button>
                    <output aria-live="polite" className="min-w-7 overflow-hidden text-center text-xl font-bold">
                      <motion.span key={party} className="inline-block" initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 500, damping: 30 }}>
                        {formatNumber(party, lang)}
                      </motion.span>
                    </output>
                    <motion.button whileTap={{ scale: 0.9 }} type="button" onClick={() => setParty((n) => Math.min(10, n + 1))} aria-disabled={party >= 10} aria-label={c.more} className="size-12 cursor-pointer rounded-card border-[1.5px] border-line-strong bg-white text-[22px] text-maroon aria-disabled:opacity-40">+</motion.button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div>
            <label htmlFor="rsvp-msg" className="text-[13px] font-semibold text-ink-soft">{c.msg}</label>
            <textarea
              id="rsvp-msg"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={c.msgPh}
              rows={3}
              maxLength={500}
              className={cn(inputClass, "min-h-[72px] resize-none px-3 py-2.5 text-[15px]")}
            />
          </div>
          {sendError && <p role="alert" className="rounded-card bg-rose-soft px-3 py-2 text-[13px] text-maroon">{c.sendFailed}</p>}
          <Button type="submit" fullWidth disabled={sending} className="min-h-[52px]">{sending ? c.sending : c.send}</Button>
        </form>
      )}
    </BottomSheet>
  );
}

function GiftSheet({ open, onClose, invitation: inv }: { open: boolean; onClose: () => void; invitation: Invitation }) {
  const c = useContent(guestContent);
  return (
    <BottomSheet open={open} onClose={onClose} title={c.giftTitle} closeLabel={c.close}>
      <div className="flex flex-col items-center gap-2.5">
        <img
          src={inv.giftQrUrl!}
          alt={c.qrAlt}
          className="w-[250px] rounded-[14px] border border-line shadow-[0_4px_16px_rgba(43,43,43,0.08)]"
        />
        <p className="text-center text-[13px] text-muted">{c.scan}</p>
        {(inv.giftNoteKm || inv.giftNoteEn) && (
          <div className="w-full rounded-card bg-ivory px-3.5 py-2.5 text-center text-sm">
            {inv.giftNoteKm && <div lang="km">{inv.giftNoteKm}</div>}
            {inv.giftNoteEn && <div lang="en" className="text-[13px] text-muted">{inv.giftNoteEn}</div>}
          </div>
        )}
        <a
          href={inv.giftQrUrl!}
          download={`khqr-${inv.slug}`}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-card bg-maroon px-5 text-[15px] font-semibold text-white no-underline hover:bg-maroon-dark"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M12 3v12M7 10l5 5 5-5M4 21h16" />
          </svg>
          {c.save}
        </a>
        <p className="text-center text-[11px] text-muted">{c.never}</p>
      </div>
    </BottomSheet>
  );
}
