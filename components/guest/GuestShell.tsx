"use client";
/* eslint-disable @next/next/no-img-element -- host-uploaded KHQR image */

import { useEffect, useRef, useState } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { CheckIcon, CloseIcon, GiftIcon, MailIcon } from "@/components/ui/Icons";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { cn } from "@/lib/cn";
import { useContent, useLanguage } from "@/lib/i18n";
import { addDays, formatDayMonth, formatNumber } from "@/lib/khmer";
import type { Invitation, Template } from "@/lib/mock-data";
import { addRsvp, addView } from "@/lib/store";
import { guestContent } from "./content";

type Props = { invitation: Invitation; template: Template; children: React.ReactNode };

/**
 * Interactive layer around the server-rendered invitation: opening doors,
 * music, language toggle, sticky RSVP/Gift bar and their bottom sheets.
 */
export function GuestShell({ invitation: inv, template, children }: Props) {
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
    void addView(inv.id);
  }

  function toggleMusic() {
    if (playing) {
      audio.current?.pause();
      setPlaying(false);
    } else play();
  }

  return (
    <div className="relative mx-auto min-h-dvh max-w-[480px] bg-ivory ring-1 ring-line">
      <main id="invitation" tabIndex={-1} className="outline-none" inert={doors !== "gone"}>{children}</main>

      {/* Top-right controls */}
      <div className="fixed top-3 right-[max(0.75rem,calc(50vw-240px+0.75rem))] z-20 flex items-center gap-2" inert={doors !== "gone"}>
        <LanguageToggle variant="dark" />
        {hasMusic && (
          <button
            type="button"
            onClick={toggleMusic}
            aria-label={playing ? c.musicOff : c.musicOn}
            className="flex size-11 cursor-pointer items-center justify-center rounded-full bg-charcoal/55 text-white backdrop-blur-sm"
          >
            {playing ? (
              <span aria-hidden className="flex h-3.5 items-end gap-0.5">
                {[0, 0.2, 0.4].map((d) => (
                  <span key={d} className="w-[3px] animate-eq bg-gold-light" style={{ animationDelay: `${d}s` }} />
                ))}
              </span>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M11 5L6 9H2v6h4l5 4zM22 9l-6 6M16 9l6 6" />
              </svg>
            )}
          </button>
        )}
      </div>
      {hasMusic && <audio ref={audio} src={inv.musicUrl!} loop preload="none" onEnded={() => setPlaying(false)} />}

      {/* Sticky action bar */}
      <div
        className="fixed inset-x-0 bottom-0 z-20 mx-auto flex max-w-[480px] gap-2.5 border-t border-line bg-ivory/95 px-4 pt-3 pb-[max(1.125rem,env(safe-area-inset-bottom))] backdrop-blur-sm"
        inert={doors !== "gone"}
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
      </div>

      <RsvpSheet open={sheet === "rsvp"} onClose={() => setSheet((s) => (s === "rsvp" ? null : s))} invitation={inv} onGift={hasGift ? () => setSheet("gift") : undefined} />
      {hasGift && <GiftSheet open={sheet === "gift"} onClose={() => setSheet((s) => (s === "gift" ? null : s))} invitation={inv} />}

      {doors !== "gone" && <Doors invitation={inv} template={template} opening={doors === "opening"} onOpen={openDoors} />}
    </div>
  );
}

function Doors({ invitation: inv, template, opening, onOpen }: { invitation: Invitation; template: Template; opening: boolean; onOpen: () => void }) {
  const c = useContent(guestContent);
  const { bg, fg, accent } = template.theme;
  const initial = (s: string) => (s.split(" ").at(-1) || s).charAt(0).toUpperCase();
  const door = "absolute inset-y-0 w-1/2 transition-transform duration-1000 ease-[cubic-bezier(.7,0,.3,1)]";

  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={opening}
      aria-label={c.open}
      className="fixed inset-0 z-40 mx-auto block max-w-[480px] cursor-pointer overflow-hidden"
    >
      <span className={cn(door, "left-0 border-r", opening && "-translate-x-full")} style={{ background: bg, borderColor: accent }}>
        <span className="absolute inset-y-4 right-2 left-4 rounded-l-card border" style={{ borderColor: accent }} />
      </span>
      <span className={cn(door, "right-0 border-l", opening && "translate-x-full")} style={{ background: bg, borderColor: accent }}>
        <span className="absolute inset-y-4 right-4 left-2 rounded-r-card border" style={{ borderColor: accent }} />
      </span>
      <span
        className={cn("absolute inset-0 flex flex-col items-center justify-center gap-2.5 text-center transition-[opacity,transform] duration-400", opening && "scale-60 opacity-0")}
        style={{ color: fg }}
      >
        <span lang="km" className="font-moul text-base leading-[1.9]" style={{ color: accent }}>
          {template.eventType === "wedding" ? "សិរីមង្គលអាពាហ៍ពិពាហ៍" : "ពិធីភ្ជាប់ពាក្យ"}
        </span>
        <span
          className="flex size-24 items-center justify-center rounded-full border-4"
          style={{ background: accent, borderColor: "var(--color-gold-light)" }}
        >
          <span lang="en" className="font-serif text-[30px] italic" style={{ color: bg }}>
            {initial(inv.groomEn)}&amp;{initial(inv.brideEn)}
          </span>
        </span>
        <span lang="en" className="font-serif text-2xl italic">
          {inv.groomEn.split(" ").at(-1)} &amp; {inv.brideEn.split(" ").at(-1)}
        </span>
        <span className="mt-[18px] rounded-full border px-[18px] py-2 text-sm" style={{ borderColor: accent }}>
          <span lang="km">ចុចដើម្បីបើក</span> · <span lang="en">Tap to open</span>
        </span>
      </span>
    </button>
  );
}

const PETALS = Array.from({ length: 12 }, (_, i) => ({
  left: `${(i * 83) % 100}%`,
  duration: `${2.4 + ((i * 7) % 10) / 6}s`,
  delay: `${((i * 5) % 12) / 8}s`,
  color: i % 3 === 0 ? "var(--color-gold)" : i % 3 === 1 ? "var(--color-rose-soft)" : "var(--color-gold-light)",
}));

function RsvpSheet({ open, onClose, invitation: inv, onGift }: { open: boolean; onClose: () => void; invitation: Invitation; onGift?: () => void }) {
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
      await addRsvp({ invitationId: inv.id, guestName: name.trim(), attending, partySize: attending ? party : 1, message: message.trim() || null });
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
              className="absolute top-0 animate-petal"
              style={{ left: p.left, animationDuration: p.duration, animationDelay: p.delay }}
            >
              <path d="M12 2c3 4 3 8 0 12-3-4-3-8 0-12z" fill={p.color} />
            </svg>
          ))}
          <div className="flex size-[84px] animate-pop items-center justify-center rounded-full bg-gold-soft text-maroon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden>
              <path d="M12 3c2 3 2 6 0 9-2-3-2-6 0-9z" />
              <path d="M12 12c3-2 6-2 8 0-3 2-6 2-8 0z" />
              <path d="M12 12c-3-2-6-2-8 0 3 2 6 2 8 0z" />
            </svg>
          </div>
          <div lang="km" className="font-moul text-xl leading-[1.9] text-maroon">សូមអរគុណ</div>
          <div lang="en" className="font-serif text-xl italic">Thank you, {sentName || "friend"}!</div>
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
              className="min-h-[50px] w-full rounded-card border-[1.5px] border-line-strong bg-white px-3 text-[15px] outline-none focus:border-maroon aria-invalid:border-maroon"
            />
            {touched && !nameOk && <p id="rsvp-name-err" className="mt-1 text-[13px] text-maroon">{c.nameRequired}</p>}
          </div>

          <div role="group" aria-label={c.rsvpTitle} className="flex gap-2.5">
            {([true, false] as const).map((yes) => {
              const on = attending === yes;
              return (
                <button
                  key={String(yes)}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setAttending(yes)}
                  className={cn(
                    "flex min-h-16 flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-card border-2 text-[15px] font-bold",
                    on ? (yes ? "border-jade bg-jade-soft text-jade-ink" : "border-maroon bg-rose-soft text-maroon") : "border-line-strong bg-white text-charcoal",
                  )}
                >
                  {yes ? <CheckIcon size={22} /> : <CloseIcon size={22} />}
                  {yes ? c.yes : c.no}
                </button>
              );
            })}
          </div>

          {attending && (
            <div className="flex items-center justify-between">
              <span id="party-label" className="text-sm font-semibold">{c.people}</span>
              <div className="flex items-center gap-3" role="group" aria-labelledby="party-label">
                <button type="button" onClick={() => setParty((n) => Math.max(1, n - 1))} aria-disabled={party <= 1} aria-label={c.fewer} className="size-12 cursor-pointer rounded-card border-[1.5px] border-line-strong bg-white text-[22px] text-maroon aria-disabled:opacity-40">−</button>
                <output aria-live="polite" className="min-w-7 text-center text-xl font-bold">{formatNumber(party, lang)}</output>
                <button type="button" onClick={() => setParty((n) => Math.min(10, n + 1))} aria-disabled={party >= 10} aria-label={c.more} className="size-12 cursor-pointer rounded-card border-[1.5px] border-line-strong bg-white text-[22px] text-maroon aria-disabled:opacity-40">+</button>
              </div>
            </div>
          )}

          <div>
            <label htmlFor="rsvp-msg" className="text-[13px] font-semibold text-ink-soft">{c.msg}</label>
            <textarea
              id="rsvp-msg"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={c.msgPh}
              rows={3}
              maxLength={500}
              className="min-h-[72px] w-full resize-none rounded-card border-[1.5px] border-line-strong bg-white px-3 py-2.5 text-[15px] outline-none focus:border-maroon"
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
