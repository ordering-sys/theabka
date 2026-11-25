"use client";

import { motion, useReducedMotion } from "motion/react";
import { EASE } from "@/components/motion/Motion";
import { KbachCorners, JasmineDivider } from "@/components/invitation/Kbach";
import { Lotus } from "@/components/invitation/TemplateArt";
import { formatEnglishDate, formatKhmerDate } from "@/lib/khmer";
import { sampleInvitation as inv } from "@/lib/mock-data";

const shortNamesEn = `${inv.groomEn.split(" ").at(-1)} & ${inv.brideEn.split(" ").at(-1)}`;

/**
 * Opening sequence, in seconds from page load. The hero drops the envelope in
 * (lands at ~1.05 s), then: the seal pulses, the flap folds up and over, and the
 * card slides out. With "reduce motion" on, motion skips straight to the open state.
 */
const T = { seal: 1.1, flapClose: 1.4, flapOpen: 1.72, card: 1.95 };
const FLAP = 0.32;

/**
 * Gold dust that rises out of the envelope as the card comes out. Fixed values
 * (not Math.random) so server and client render the same markup.
 * x: start offset from the centre, dx: sideways drift, rise: how far up, d: delay.
 */
const DUST = [
  { x: -150, dx: -30, rise: 170, d: 0.05, size: 5, star: false },
  { x: -120, dx: 10, rise: 240, d: 0.3, size: 12, star: true },
  { x: -95, dx: -20, rise: 140, d: 0.15, size: 4, star: false },
  { x: -70, dx: 25, rise: 210, d: 0.45, size: 6, star: false },
  { x: -40, dx: -15, rise: 260, d: 0.1, size: 4, star: false },
  { x: -15, dx: 20, rise: 190, d: 0.35, size: 10, star: true },
  { x: 10, dx: -25, rise: 150, d: 0.2, size: 5, star: false },
  { x: 35, dx: 15, rise: 250, d: 0.5, size: 4, star: false },
  { x: 60, dx: -10, rise: 200, d: 0.0, size: 6, star: false },
  { x: 85, dx: 30, rise: 160, d: 0.4, size: 14, star: true },
  { x: 110, dx: -20, rise: 230, d: 0.25, size: 4, star: false },
  { x: 135, dx: 25, rise: 180, d: 0.12, size: 5, star: false },
  { x: 160, dx: 10, rise: 140, d: 0.55, size: 9, star: true },
  { x: -170, dx: -15, rise: 200, d: 0.6, size: 4, star: false },
];

/**
 * Desktop hero artwork: a maroon wedding envelope that opens on load and lifts
 * the sample invitation card out. Decorative only (the hero's buttons carry the
 * actions). 460 × 550 px: the open card rises 250 px above the envelope.
 */
export function EnvelopeMock() {
  // MotionConfig skips transforms under "reduce motion" but would still fade the
  // dust in and out on the spot, so leave it out entirely.
  const reduceMotion = useReducedMotion();
  return (
    <div aria-hidden className="relative h-[550px] w-[460px]">
      <div className="absolute inset-x-0 bottom-0 h-[300px] -rotate-[5deg]">
        {/* Open flap, behind the card: unfolds upward once the closed flap has folded away. */}
        <motion.svg
          width="460"
          height="160"
          viewBox="0 0 460 160"
          className="absolute -top-[158px] left-0"
          style={{ originY: 1 }}
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: FLAP, ease: "easeOut", delay: T.flapOpen }}
        >
          <polygon points="0,160 230,0 460,160" fill="var(--color-maroon-dark)" />
          <polyline points="22,156 230,16 438,156" fill="none" stroke="var(--color-gold)" strokeWidth="1.5" opacity="0.8" />
          <path d="M214 52 Q230 30 246 52 Q230 44 214 52 Z" fill="var(--color-gold)" opacity="0.85" />
        </motion.svg>

        {/* Inside of the envelope. */}
        <div className="absolute inset-0 rounded-md bg-maroon-dark" />

        {/* The card waits fully inside, then slides up. The box clips anything below the envelope. */}
        <div className="absolute -top-[270px] left-0 h-[570px] w-[460px] overflow-hidden">
          <motion.div
            initial={{ y: 250 }}
            animate={{ y: 0 }}
            transition={{ duration: 1.1, ease: EASE, delay: T.card }}
            className="absolute top-5 left-[30px] h-[470px] w-[400px] overflow-hidden rounded-md bg-[#FFFDF8] px-8 pt-8 text-center shadow-[0_10px_30px_rgba(43,43,43,0.16)]"
          >
            <div className="absolute inset-2.5 rounded-sm border border-gold">
              <KbachCorners />
            </div>
            <div className="absolute inset-[15px] rounded-sm border border-gold/50" />

            <div className="relative flex flex-col items-center">
              <Lotus size={34} color="var(--color-gold)" strokeWidth={1.3} />
              <div lang="km" className="mt-1 font-moul text-lg leading-[1.8] text-maroon">សិរីមង្គលអាពាហ៍ពិពាហ៍</div>
              <div lang="km" className="mt-2 text-base leading-[1.7] font-semibold text-charcoal">
                {inv.groomKm} &amp; {inv.brideKm}
              </div>
              <div lang="en" className="font-serif text-[30px] leading-[1.2] text-maroon italic">{shortNamesEn}</div>
              <JasmineDivider className="my-3 w-[140px]" />
              <div lang="km" className="text-[15px] leading-[1.7] font-semibold text-charcoal">{formatKhmerDate(inv.eventDate)}</div>
              <div lang="en" className="text-xs text-muted">{formatEnglishDate(inv.eventDate)}</div>
            </div>

            {/* One warm shine across the card once it has settled. */}
            <motion.span
              className="pointer-events-none absolute -inset-y-10 left-0 w-1/3 -skew-x-20 bg-linear-to-r from-transparent via-gold-light/30 to-transparent"
              initial={{ x: "-150%" }}
              animate={{ x: "400%" }}
              transition={{ duration: 1.2, ease: "easeInOut", delay: T.card + 0.9 }}
            />
          </motion.div>
        </div>

        {/* Front pocket, over the card. */}
        <svg width="460" height="300" viewBox="0 0 460 300" className="absolute top-0 left-0">
          <path d="M0 0 L230 128 L460 0 L460 294 Q460 300 454 300 L6 300 Q0 300 0 294 Z" fill="var(--color-maroon)" />
          <path d="M0 300 L196 150 M460 300 L264 150" stroke="var(--color-maroon-dark)" strokeWidth="1.5" opacity="0.6" />
          <polyline points="16,20 230,140 444,20" fill="none" stroke="var(--color-gold)" strokeWidth="1.5" />
          <path d="M16 22 L16 284 L444 284 L444 22" fill="none" stroke="var(--color-gold)" strokeWidth="1.2" opacity="0.9" />
          <path d="M150 262 Q170 248 190 262 Q210 276 230 262 Q250 248 270 262 Q290 276 310 262" fill="none" stroke="var(--color-gold)" strokeWidth="1.4" />
          <circle cx="230" cy="262" r="3" fill="var(--color-gold)" />
          <path d="M26 274 L26 254 M26 274 L46 274 M30 262 Q30 270 38 270" fill="none" stroke="var(--color-gold)" strokeWidth="1.4" />
          <path d="M434 274 L434 254 M434 274 L414 274 M430 262 Q430 270 422 270" fill="none" stroke="var(--color-gold)" strokeWidth="1.4" />
        </svg>

        {/* Closed flap, over everything: folds up out of sight to open the envelope. */}
        <motion.svg
          width="460"
          height="156"
          viewBox="0 0 460 156"
          className="absolute top-0 left-0 drop-shadow-[0_4px_6px_rgba(43,43,43,0.25)]"
          style={{ originY: 0 }}
          initial={{ scaleY: 1 }}
          animate={{ scaleY: 0 }}
          transition={{ duration: FLAP, ease: "easeIn", delay: T.flapClose }}
        >
          <path d="M0 6 Q0 0 6 0 L454 0 Q460 0 460 6 L230 156 Z" fill="var(--color-maroon)" />
          <polyline points="22,10 230,142 438,10" fill="none" stroke="var(--color-gold)" strokeWidth="1.5" />
        </motion.svg>

        {/* Gold dust rising from the envelope mouth as the card comes out (once). */}
        {!reduceMotion &&
          DUST.map((p, i) => (
            <motion.span
              key={i}
              className="pointer-events-none absolute top-[10px] left-[230px]"
              initial={{ opacity: 0, x: p.x, y: 0, scale: 0.4 }}
              animate={{ opacity: [0, 1, 0], x: p.x + p.dx, y: -p.rise, scale: [0.4, 1, 0.6] }}
              transition={{ duration: 1.6, ease: "easeOut", delay: T.card + p.d }}
            >
              {p.star ? (
                <svg width={p.size} height={p.size} viewBox="0 0 10 10" className="drop-shadow-[0_0_4px_rgba(227,194,119,0.9)]">
                  <path d="M5 0 L6 4 L10 5 L6 6 L5 10 L4 6 L0 5 L4 4 Z" fill="var(--color-gold-light)" />
                </svg>
              ) : (
                <span
                  className="block rounded-full bg-gold-light shadow-[0_0_6px_rgba(227,194,119,0.9)]"
                  style={{ width: p.size, height: p.size }}
                />
              )}
            </motion.span>
          ))}

        {/* Gold seal with ទ (Theab): holds the flap shut, pulses as the envelope opens. */}
        <motion.div
          initial={{ scale: 1 }}
          animate={{ scale: [1, 1.14, 1] }}
          transition={{ duration: 0.4, ease: "easeInOut", delay: T.seal }}
          className="absolute top-[98px] left-[190px] flex size-20 items-center overflow-hidden justify-center rounded-full bg-[radial-gradient(circle_at_35%_30%,#F0D58E_0%,var(--color-gold)_45%,var(--color-gold-deep)_100%)] shadow-[0_6px_14px_rgba(43,43,43,0.3),inset_0_0_0_3px_rgba(255,255,255,0.18)]"
        >
          {/* Light glinting across the gold now and then (CSS, so it stops under "reduce motion"). */}
          <span className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-linear-to-r from-transparent via-white/55 to-transparent motion-safe:animate-shimmer [animation-delay:3s]" />
          <div className="relative flex size-[60px] items-center justify-center rounded-full border border-maroon-dark/45">
            <span lang="km" className="font-moul text-[22px] leading-none text-maroon-dark">ទ</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
