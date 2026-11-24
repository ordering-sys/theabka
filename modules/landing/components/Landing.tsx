"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useScroll, useSpring, useTransform } from "motion/react";
import { CountUp, EASE, Reveal, SPRING, Stagger, StaggerItem, fadeUp } from "@/components/motion/Motion";
import { ButtonLink } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Header";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { Badge } from "@/components/ui/Badge";
import {
  ArrowUpIcon, CheckIcon, ChevronRightIcon, ClockIcon, CloseIcon, FacebookIcon, GiftIcon, GridIcon, MailIcon, MenuIcon, PhoneIcon, PinIcon, PlayIcon, PlusIcon, SendIcon, UserIcon,
} from "@/components/ui/Icons";
import { PhoneMock, TemplateThumb } from "@/components/invitation/TemplateArt";
import { cn } from "@/lib/cn";
import { COMPANY } from "@/lib/company";
import { useContent, useLanguage } from "@/lib/i18n";
import { formatNumber, formatPrice } from "@/lib/khmer";
import { PLANS, getRsvpStats, rsvps, templates, type EventType } from "@/lib/mock-data";
import { landingContent } from "@/modules/landing/content";
import { useSession } from "@/modules/auth/components/RequireSession";
import { useStartHref } from "@/modules/landing/hooks/useStartHref";
import { HowItWorks } from "./HowItWorks";

const SAMPLE_INVITE = "/i/dara-sophea";

export function Landing() {
  return (
    <>
      <LandingHeader />
      <main id="top">
        <Hero />
        <HowItWorks />
        <Templates />
        <ForGuests />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}

function LandingHeader() {
  const c = useContent(landingContent);
  const { t } = useLanguage();
  // Signed-in hosts see "Dashboard" (→ /app) instead of "Sign in". While the session is
  // still loading, the slot stays invisible (but keeps its size) so the label doesn't flicker.
  const { loading, session } = useSession();
  const start = useStartHref();
  const account = session
    ? { href: "/app", label: c.dashboard, Icon: GridIcon }
    : { href: "/signin", label: t.common.signIn, Icon: UserIcon };
  const nav = [
    ["#how", c.nav.how],
    ["#templates", c.nav.templates],
    ["#pricing", c.nav.pricing],
    ["#faq", c.nav.faq],
  ] as const;
  const [open, setOpen] = useState(false);
  const scrolled = useScrolled(8);
  const active = useActiveSection(nav.map(([href]) => href.slice(1)));
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 200, damping: 40, restDelta: 0.001 });

  // Close the mobile menu on Escape and when the screen grows to desktop.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const mq = window.matchMedia("(min-width: 64rem)");
    const onMq = () => mq.matches && setOpen(false);
    window.addEventListener("keydown", onKey);
    mq.addEventListener("change", onMq);
    return () => {
      window.removeEventListener("keydown", onKey);
      mq.removeEventListener("change", onMq);
    };
  }, [open]);

  const solid = scrolled || open;
  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: EASE }}
      className={cn(
        "sticky top-0 z-30 border-b border-line transition-[background-color,box-shadow] duration-300",
        solid ? "bg-white/90 shadow-[0_4px_16px_-8px_rgba(43,43,43,0.12)] backdrop-blur-md" : "bg-white",
      )}
    >
      <div
        className={cn(
          "mx-auto flex max-w-[1200px] items-center justify-between gap-3 px-4 transition-[padding] duration-300 lg:grid lg:grid-cols-[auto_1fr_auto] lg:gap-4 lg:px-6 xl:gap-6",
          scrolled ? "py-2" : "py-3 lg:py-4",
        )}
      >
        <Logo />

        <nav aria-label={c.nav.label} className="hidden items-center justify-self-center lg:flex xl:gap-1">
          {nav.map(([href, label]) => {
            const on = active === href.slice(1);
            return (
              <a
                key={href}
                href={href}
                aria-current={on ? "location" : undefined}
                className={cn(
                  "group relative flex min-h-11 items-center px-2.5 text-sm leading-[1.6] font-medium whitespace-nowrap no-underline transition-colors xl:px-3.5",
                  on ? "text-maroon" : "text-charcoal hover:text-maroon",
                )}
              >
                {label}
                <span
                  aria-hidden
                  className={cn(
                    "absolute inset-x-2.5 bottom-1.5 h-0.5 xl:inset-x-3.5 origin-center rounded-full bg-gold transition-transform duration-300",
                    on ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100",
                  )}
                />
              </a>
            );
          })}
        </nav>

        <div className="flex items-center justify-end gap-1.5 lg:gap-2.5">
          <LanguageToggle flags />
          <span aria-hidden className="hidden h-6 w-px bg-line lg:block" />
          {/* Icon-only between lg and xl, where the full label would squeeze the nav. */}
          <Link
            href={account.href}
            aria-label={account.label}
            title={account.label}
            aria-hidden={loading || undefined}
            tabIndex={loading ? -1 : undefined}
            className={cn(
              "group hidden min-h-11 min-w-11 items-center justify-center gap-2 rounded-xl px-2.5 text-sm font-semibold whitespace-nowrap text-maroon no-underline transition-colors hover:bg-sand-light hover:text-maroon-dark sm:flex xl:px-3",
              loading && "invisible",
            )}
          >
            <span className="flex size-7 items-center justify-center rounded-full bg-gold-soft text-maroon transition-colors group-hover:bg-maroon group-hover:text-white">
              <account.Icon size={15} strokeWidth={2.2} />
            </span>
            <span className="lg:hidden xl:inline">{account.label}</span>
          </Link>
          <ButtonLink href={start} size="sm" className="group hidden whitespace-nowrap lg:inline-flex">
            <span className="flex size-5 items-center justify-center rounded-full bg-white/20 transition-transform duration-300 group-hover:rotate-90">
              <PlusIcon size={13} strokeWidth={2.6} />
            </span>
            {c.create}
          </ButtonLink>
          <button
            type="button"
            aria-expanded={open}
            aria-controls="landing-menu"
            aria-label={open ? t.common.close : c.nav.menu}
            onClick={() => setOpen((v) => !v)}
            className="flex size-11 cursor-pointer items-center justify-center rounded-xl text-maroon transition-colors hover:bg-sand lg:hidden"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={open ? "close" : "menu"}
                initial={{ opacity: 0, rotate: -45 }}
                animate={{ opacity: 1, rotate: 0 }}
                exit={{ opacity: 0, rotate: 45 }}
                transition={{ duration: 0.15 }}
                className="flex"
              >
                {open ? <CloseIcon size={22} /> : <MenuIcon size={22} />}
              </motion.span>
            </AnimatePresence>
          </button>
        </div>
      </div>

      {/* Reading progress along the bottom edge. */}
      <motion.div
        aria-hidden
        style={{ scaleX: progress }}
        className="absolute inset-x-0 -bottom-px h-0.5 origin-left bg-linear-to-r from-gold to-maroon"
      />

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="scrim"
              aria-hidden
              onClick={() => setOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-x-0 top-full bottom-0 h-dvh bg-scrim lg:hidden"
            />
            <motion.div
              key="panel"
              id="landing-menu"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: EASE }}
              className="absolute inset-x-0 top-full border-b border-line bg-white px-4 pt-2 pb-5 lg:hidden"
            >
              <Stagger as="ul" onMount stagger={0.05} aria-label={c.nav.label} className="flex flex-col">
                {nav.map(([href, label]) => {
                  const on = active === href.slice(1);
                  return (
                    <StaggerItem as="li" key={href}>
                      <a
                        href={href}
                        onClick={() => setOpen(false)}
                        aria-current={on ? "location" : undefined}
                        className={cn(
                          "flex min-h-12 items-center justify-between border-b border-line text-[15px] leading-[1.6] font-medium no-underline",
                          on ? "text-maroon" : "text-charcoal",
                        )}
                      >
                        {label}
                        <span aria-hidden className={cn("size-1.5 rounded-full", on ? "bg-gold" : "bg-transparent")} />
                      </a>
                    </StaggerItem>
                  );
                })}
              </Stagger>
              <div className="mt-4 flex flex-col gap-2.5">
                <ButtonLink href={start} fullWidth onClick={() => setOpen(false)}>
                  <PlusIcon size={16} strokeWidth={2.4} />
                  {c.create}
                </ButtonLink>
                {!loading && (
                  <ButtonLink href={account.href} variant="secondary" fullWidth className="sm:hidden" onClick={() => setOpen(false)}>
                    <account.Icon size={16} />
                    {account.label}
                  </ButtonLink>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.header>
  );
}

function useScrolled(threshold: number) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);
  return scrolled;
}

/** Id of the section currently under the header, for the nav highlight. */
function useActiveSection(ids: readonly string[]) {
  const [active, setActive] = useState<string | null>(null);
  const key = ids.join(",");
  useEffect(() => {
    const els = key.split(",").map((id) => document.getElementById(id)).filter((el): el is HTMLElement => !!el);
    if (!els.length) return;
    const visible = new Map<string, boolean>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) visible.set(e.target.id, e.isIntersecting);
        setActive(els.find((el) => visible.get(el.id))?.id ?? null);
      },
      // A band just below the sticky header.
      { rootMargin: "-80px 0px -55% 0px" },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [key]);
  return active;
}

/** A soft, slowly drifting colour glow for section backgrounds. Decorative only. */
function Glow({ className, drift = 24, duration = 14 }: { className?: string; drift?: number; duration?: number }) {
  return (
    <motion.div
      aria-hidden
      animate={{ x: [0, drift, -drift / 2, 0], y: [0, -drift / 2, drift, 0], scale: [1, 1.08, 0.96, 1] }}
      transition={{ duration, ease: "easeInOut", repeat: Infinity }}
      className={cn("pointer-events-none absolute rounded-full blur-3xl", className)}
    />
  );
}

/** A short gold rule that draws itself in under a section title. */
function GoldRule({ center = false, className }: { center?: boolean; className?: string }) {
  return (
    <motion.div
      aria-hidden
      initial={{ scaleX: 0 }}
      whileInView={{ scaleX: 1 }}
      viewport={{ once: true, margin: "0px 0px -40px 0px" }}
      transition={{ duration: 0.8, ease: EASE, delay: 0.2 }}
      className={cn(
        "mt-2 h-[3px] w-12 rounded-full bg-linear-to-r from-gold to-gold-light",
        center ? "mx-auto origin-center" : "origin-left",
        className,
      )}
    />
  );
}

/** Primary button with a light sweep passing over it now and then. */
function ShimmerButton({ className, children, ...props }: React.ComponentProps<typeof ButtonLink>) {
  return (
    <ButtonLink className={cn("relative overflow-hidden", className)} {...props}>
      <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-linear-to-r from-transparent via-white/25 to-transparent motion-safe:animate-shimmer" />
      <span className="relative">{children as React.ReactNode}</span>
    </ButtonLink>
  );
}

function Hero() {
  const start = useStartHref();
  const c = useContent(landingContent).hero;
  const create = useContent(landingContent).create;
  const { lang } = useLanguage();
  const stats = getRsvpStats(rsvps);
  // Share of replies that are "attending".
  const repliedPct = Math.round((stats.attending / rsvps.length) * 100);

  // Scroll parallax: the phone drifts up slower than the page, the RSVP card faster.
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const phoneY = useTransform(scrollYProgress, [0, 1], [0, 90]);
  const cardY = useTransform(scrollYProgress, [0, 1], [0, -60]);
  const glowY = useTransform(scrollYProgress, [0, 1], [0, 140]);

  return (
    <div ref={ref} className="relative overflow-hidden">
      <motion.div style={{ y: glowY }} aria-hidden className="pointer-events-none absolute inset-0">
        <Glow className="-top-24 -left-24 size-[320px] bg-gold-soft/80 lg:-top-32 lg:-left-32 lg:size-[560px] lg:bg-gold-soft" />
        <Glow className="top-1/3 -right-20 size-[300px] bg-rose-soft lg:top-1/4 lg:right-[4%] lg:size-[500px]" drift={32} duration={18} />
      </motion.div>

      <section className="relative mx-auto flex max-w-[1200px] flex-col items-center gap-6 px-5 pt-7 pb-2 lg:flex-row lg:gap-8 lg:px-6 lg:py-[72px]">
        <Stagger onMount stagger={0.12} delay={0.1} className="min-w-0 text-center lg:flex-[1_1_480px] lg:text-left">
          <StaggerItem variant="popIn" className="inline-flex items-center gap-2 rounded-full bg-gold-soft px-3 py-1 text-xs font-semibold text-gold-ink lg:px-3.5 lg:py-1.5 lg:text-[13px]">
            <span aria-hidden className="relative flex size-2">
              <span className="absolute inset-0 rounded-full bg-gold motion-safe:animate-ping" />
              <span className="relative size-2 rounded-full bg-gold" />
            </span>
            {c.badge}
          </StaggerItem>
          <StaggerItem
            as="h1"
            variant="blurUp"
            className={cn(
              "mt-3.5 mb-2 font-normal text-balance text-maroon lg:mt-[18px] lg:mb-3.5",
              // Khmer keeps the tall line height so stacked vowels and subscripts don't clip;
              // English Playfair reads better set tight and larger.
              lang === "km"
                ? "font-moul text-[26px] leading-[1.7] lg:text-[40px] lg:leading-[1.6]"
                : "font-serif text-[30px] leading-[1.2] font-bold tracking-[-0.01em] lg:text-[54px] lg:leading-[1.15]",
            )}
          >
            {c.title}
          </StaggerItem>
          <StaggerItem as="p" className="mb-5 text-[15px] text-ink-soft lg:mb-7 lg:max-w-[540px] lg:text-lg">{c.sub}</StaggerItem>
          <StaggerItem className="flex flex-col gap-2.5 lg:flex-row lg:gap-3">
            <ShimmerButton href={start} fullWidth className="lg:min-h-[50px] lg:w-auto lg:px-6">{create}</ShimmerButton>
            <ButtonLink href={SAMPLE_INVITE} variant="secondary" fullWidth className="lg:hidden">{c.sample}</ButtonLink>
            <ButtonLink href="#how" variant="secondary" className="group hidden min-h-[50px] px-6 lg:inline-flex">
              <span className="flex size-6 items-center justify-center rounded-full bg-maroon text-white transition-transform duration-300 group-hover:scale-110">
                <PlayIcon size={12} />
              </span>
              {c.seeHow}
            </ButtonLink>
          </StaggerItem>
          <Stagger as="ul" onMount stagger={0.1} delay={0.75} className="mt-8 hidden flex-wrap gap-6 text-sm text-ink-soft lg:flex">
            {c.trust.map((item) => (
              <StaggerItem as="li" key={item} className="flex items-center gap-2">
                <span className="flex size-6 items-center justify-center rounded-full bg-jade-soft">
                  <CheckIcon size={14} className="text-jade-ink" />
                </span>
                {item}
              </StaggerItem>
            ))}
          </Stagger>
        </Stagger>

        <div className="relative flex justify-center py-6 lg:flex-[1_1_460px] lg:py-0">
          {/* Stage sized to the phone, so the halo and glow centre on it. On desktop the
              RSVP cards hang off its right edge; the right margin balances that overhang
              so the group sits centred in the column. */}
          <div className="relative lg:mr-[170px]">
            {/* Warm gold glow behind the phone (desktop only). */}
            <Glow className="top-1/2 left-1/2 -mt-[190px] -ml-[190px] hidden size-[380px] bg-gold/20 lg:block" drift={12} duration={16} />
            {/* Slow-turning gold halo behind the phone. */}
            <motion.div
              aria-hidden
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1, rotate: 360 }}
              transition={{
                opacity: { duration: 1, delay: 0.4 },
                scale: { duration: 1, ease: EASE, delay: 0.4 },
                rotate: { duration: 60, ease: "linear", repeat: Infinity },
              }}
              className="pointer-events-none absolute top-1/2 left-1/2 -mt-[150px] -ml-[150px] size-[300px] rounded-full border border-dashed border-gold/50 lg:-mt-[210px] lg:-ml-[210px] lg:size-[420px]"
            />

            <motion.div style={{ y: phoneY }} className="relative">
              <motion.div
                initial={{ opacity: 0, y: 40, rotate: -3 }}
                animate={{ opacity: 1, y: 0, rotate: 0 }}
                transition={{ duration: 0.8, ease: EASE, delay: 0.25 }}
              >
                {/* Gentle idle float once it has landed. */}
                <motion.div
                  animate={{ y: [0, -8, 0], rotate: [0, 0.6, 0] }}
                  transition={{ duration: 5, ease: "easeInOut", repeat: Infinity, delay: 1.1 }}
                >
                  <Link href={SAMPLE_INVITE} aria-label={c.sample} className="block transition-transform active:scale-[0.98] lg:hidden">
                    <PhoneMock />
                  </Link>
                  <div className="hidden lg:block">
                    <PhoneMock size="lg" />
                  </div>
                </motion.div>
              </motion.div>
            </motion.div>

            {/* Overlaps the phone's right edge by 40px so phone, chip and card read as one group. */}
            <motion.div style={{ y: cardY }} className="absolute bottom-14 left-[calc(100%-40px)] hidden lg:block">
              <NewReplyChip />
              <motion.div
                initial={{ opacity: 0, x: 30, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={{ duration: 0.6, ease: EASE, delay: 0.6 }}
                whileHover={{ y: -4 }}
                className="w-[210px] rounded-2xl bg-white p-4 shadow-[0_10px_30px_rgba(43,43,43,0.12)]"
              >
                <div className="flex items-center gap-1.5 text-xs font-semibold text-muted">
                  <span aria-hidden className="relative flex size-1.5">
                    <span className="absolute inset-0 rounded-full bg-jade motion-safe:animate-ping" />
                    <span className="relative size-1.5 rounded-full bg-jade" />
                  </span>
                  {c.liveRsvp}
                </div>
                <CountUp
                  value={stats.totalGuests}
                  format={(n) => formatNumber(n, lang)}
                  className="block text-[32px] leading-[1.2] font-bold text-jade-ink"
                />
                <div className="text-[13px] text-ink-soft">{c.guestsComing}</div>
                <div className="mt-3 mb-1.5 h-2 overflow-hidden rounded-full bg-sand">
                  <motion.div
                    className="h-full rounded-full bg-linear-to-r from-jade-light to-jade"
                    initial={{ width: 0 }}
                    animate={{ width: `${repliedPct}%` }}
                    transition={{ duration: 1.1, ease: EASE, delay: 1 }}
                  />
                </div>
                <div className="text-xs text-muted">{formatNumber(rsvps.length, lang)} {c.replied}</div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}

/** Sample replies popping in above the RSVP card, one after another. */
function NewReplyChip() {
  const { lang } = useLanguage();
  const replies = rsvps.filter((r) => r.attending);
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setI((n) => (n + 1) % replies.length), 3200);
    return () => window.clearInterval(id);
  }, [replies.length]);
  const r = replies[i];
  if (!r) return null;
  return (
    <div aria-hidden className="absolute -top-14 -left-10 h-11 w-[230px]">
      <AnimatePresence mode="popLayout">
        <motion.div
          key={r.id}
          initial={{ opacity: 0, y: 14, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ ...SPRING, delay: i === 0 ? 1.4 : 0 }}
          className="inline-flex items-center gap-2 rounded-full bg-white py-1.5 pr-3.5 pl-1.5 text-[13px] leading-[1.6] shadow-[0_8px_24px_rgba(43,43,43,0.12)]"
        >
          <span className="flex size-7 items-center justify-center rounded-full bg-jade-soft">
            <CheckIcon size={14} className="text-jade-ink" />
          </span>
          <span className="truncate font-semibold text-charcoal">{r.guestName}</span>
          <span className="shrink-0 font-bold text-jade-ink">+{formatNumber(r.partySize, lang)}</span>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function Templates() {
  const c = useContent(landingContent).templates;
  const { lang, t } = useLanguage();
  const [filter, setFilter] = useState<"all" | EventType>("all");
  const shown = templates.filter((tpl) => filter === "all" || tpl.eventType === filter);
  const filters = [
    ["all", c.all],
    ["wedding", t.eventType.wedding],
    ["engagement", t.eventType.engagement],
  ] as const;

  return (
    <section id="templates" className="mx-auto max-w-[1200px] scroll-mt-20 py-7 lg:px-6 lg:py-[72px]">
      <Reveal className="mb-3 flex flex-wrap items-baseline justify-between gap-4 px-5 lg:mb-6 lg:items-end lg:px-0">
        <div>
          <h2 className="text-lg font-bold lg:text-[32px] lg:leading-[1.6]">{c.title}</h2>
          <GoldRule className="hidden lg:block" />
          <p className="mt-2 hidden text-muted lg:block">{c.sub}</p>
        </div>
        <Link href="/app/new" className="text-[13px] font-semibold text-maroon lg:hidden">{c.seeAll}</Link>
        <div className="hidden gap-2 lg:flex" role="group" aria-label={c.title}>
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
                <motion.span layoutId="tpl-filter" transition={SPRING} className="absolute -inset-[1.5px] rounded-full bg-charcoal" />
              )}
              <span className="relative">{label}</span>
            </button>
          ))}
        </div>
      </Reveal>

      {/* Mobile: horizontal scroller. Desktop: filtered grid. */}
      <Stagger as="ul" className="flex gap-3 overflow-x-auto px-5 pb-2 lg:grid lg:grid-cols-[repeat(auto-fill,minmax(220px,1fr))] lg:gap-5 lg:overflow-visible lg:px-0">
        <AnimatePresence mode="popLayout" initial={false}>
        {shown.map((tpl) => {
          const price = formatPrice(tpl.priceUsd, lang);
          return (
            <motion.li
              key={tpl.id}
              layout
              variants={fadeUp}
              exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.2 } }}
              whileHover={{ y: -6 }}
              transition={SPRING}
              className="w-[130px] shrink-0 lg:w-auto"
            >
              <Link
                href={`/app/new?template=${tpl.id}`}
                className="group flex flex-col gap-1.5 text-charcoal no-underline transition-shadow duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold lg:gap-3 lg:rounded-2xl lg:bg-white lg:p-2.5 lg:shadow-card lg:hover:shadow-lift"
              >
                <TemplateThumb template={tpl} size="md" className="h-[180px] shadow-card lg:hidden" />
                <div className="relative hidden overflow-hidden rounded-lg lg:block">
                  {/* Light templates get a faint inner edge so they don't melt into the white card. */}
                  <TemplateThumb template={tpl} size="lg" className="aspect-[4/5] ring-1 ring-charcoal/5 ring-inset" />
                  {/* Hover / focus call to action rising from the bottom of the artwork. */}
                  <span
                    aria-hidden
                    className="absolute inset-x-4 bottom-4 flex translate-y-3 items-center justify-center gap-1.5 rounded-full bg-charcoal/85 py-2.5 text-sm font-semibold text-white opacity-0 backdrop-blur-sm transition duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100"
                  >
                    {c.use}
                    <ChevronRightIcon size={16} />
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 lg:px-1.5 lg:pb-1.5">
                  <div className="min-w-0">
                    <div lang={lang} className="truncate text-[13px] font-semibold lg:text-base">{lang === "km" ? tpl.nameKm : tpl.nameEn}</div>
                    <div className="text-xs text-muted lg:hidden">{t.tier[tpl.tier]}</div>
                    <Badge tone={tpl.tier === "premium" ? "gold" : "neutral"} className="mt-1 hidden text-[11px] lg:inline-flex">
                      {t.tier[tpl.tier]}
                    </Badge>
                  </div>
                  <div className="hidden shrink-0 text-right lg:block">
                    <div className="text-lg leading-tight font-bold text-maroon">{price.usd}</div>
                    <div className="text-xs text-muted">{price.riel}</div>
                  </div>
                </div>
              </Link>
            </motion.li>
          );
        })}
        </AnimatePresence>
      </Stagger>
    </section>
  );
}

const guestIcons = [ClockIcon, MailIcon, PinIcon, GiftIcon];

function ForGuests() {
  const c = useContent(landingContent).guests;
  const { lang } = useLanguage();
  return (
    <section className="relative hidden overflow-hidden bg-maroon text-ivory lg:block">
      <Glow className="-top-32 -left-24 size-[420px] bg-gold/20" drift={40} duration={20} />
      <Glow className="-right-24 -bottom-40 size-[460px] bg-maroon-dark" drift={30} duration={16} />
      <div className="relative mx-auto flex max-w-[1200px] items-center gap-12 px-6 py-[72px]">
        <Reveal className="min-w-0 flex-[1_1_420px]">
          <div className={cn("text-[13px] font-bold text-gold-light", lang === "en" && "tracking-[0.1em]")}>{c.kicker}</div>
          <h2 className="mt-1.5 text-[32px] leading-[1.6] font-bold">{c.title}</h2>
          <GoldRule className="mb-4" />
          <p className="mb-6 text-base opacity-90">{c.sub}</p>
          <ShimmerButton href={SAMPLE_INVITE} variant="gold" className="min-h-[50px] px-6">{c.openSample}</ShimmerButton>
        </Reveal>
        <Stagger as="ul" stagger={0.1} delay={0.15} className="grid flex-[1_1_480px] grid-cols-2 gap-4">
          {c.features.map((f, i) => {
            const Icon = guestIcons[i];
            return (
              <StaggerItem
                as="li"
                key={f.title}
                whileHover={{ y: -4, backgroundColor: "rgba(255,255,255,0.14)" }}
                className="group rounded-[14px] border border-gold/50 bg-white/8 p-[18px] backdrop-blur-sm"
              >
                <span className="flex size-11 items-center justify-center rounded-xl bg-gold/15 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
                  <Icon size={24} className="text-gold-light" />
                </span>
                <div className="mt-2 font-bold">{f.title}</div>
                <div className="text-sm opacity-85">{f.sub}</div>
              </StaggerItem>
            );
          })}
        </Stagger>
      </div>
    </section>
  );
}

function Pricing() {
  const start = useStartHref();
  const c = useContent(landingContent).pricing;
  const { lang, t } = useLanguage();
  const basic = formatPrice(PLANS.basic.priceUsd, lang);
  const premium = formatPrice(PLANS.premium.priceUsd, lang);
  const contactHref = `mailto:${COMPANY.email}?subject=${encodeURIComponent("Custom invitation")}`;
  return (
    <section id="pricing" className="mx-auto max-w-[1200px] scroll-mt-20 px-5 py-7 lg:px-6 lg:py-[72px]">
      <Reveal className="mb-3.5 text-center lg:mb-8">
        <h2 className="text-lg font-bold lg:text-[32px] lg:leading-[1.6]">{c.title}</h2>
        <GoldRule center className="mb-2" />
        <p className="text-[13px] text-muted lg:text-base">{c.sub}</p>
      </Reveal>
      <Stagger stagger={0.12} className="flex flex-col gap-4 lg:flex-row lg:items-stretch lg:justify-center lg:gap-6">
        {/* Basic */}
        <StaggerItem
          whileHover={{ y: -6 }}
          className="flex flex-col rounded-card border border-line bg-white p-5 shadow-card transition-colors duration-300 hover:border-gold/60 lg:min-w-0 lg:flex-1 lg:rounded-2xl lg:p-8"
        >
          <PlanHeader name={t.tier.basic} tagline={c.basicTagline} price={basic} once={c.once} taglineClass="text-muted" priceClass="text-maroon" />
          <div aria-hidden className="my-5 h-px bg-line" />
          <Checklist items={[c.photos.basic, ...c.shared]} tick="jade" />
          <div className="mt-auto pt-6">
            <ButtonLink href={start} variant="secondary" fullWidth>{c.startBasic}</ButtonLink>
          </div>
        </StaggerItem>

        {/* Premium */}
        <StaggerItem
          whileHover={{ y: -6 }}
          className="group relative flex flex-col overflow-hidden rounded-card bg-maroon p-5 text-ivory shadow-[0_6px_20px_rgba(122,31,43,0.25)] ring-1 ring-gold/40 lg:min-w-0 lg:flex-1 lg:rounded-2xl lg:p-8"
        >
          {/* Soft gold glow in the corner and a light sweep across the card on hover. */}
          <span aria-hidden className="pointer-events-none absolute -top-24 -right-24 size-64 rounded-full bg-gold/20 blur-3xl" />
          <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-1/2 -translate-x-full skew-x-[-20deg] bg-linear-to-r from-transparent via-white/10 to-transparent transition-transform duration-1000 ease-out group-hover:translate-x-[300%]" />
          <motion.div
            animate={{ scale: [1, 1.06, 1] }}
            transition={{ duration: 2.4, ease: "easeInOut", repeat: Infinity, repeatDelay: 1.2 }}
            className="absolute top-4 right-4 rounded-full bg-gold px-3 py-1 text-[11px] font-bold text-charcoal lg:top-6 lg:right-6 lg:text-xs"
          >
            {c.popular}
          </motion.div>
          <div className="relative flex grow flex-col">
            <PlanHeader name={t.tier.premium} tagline={c.premiumTagline} price={premium} once={c.once} taglineClass="pr-28 text-ivory/75" priceClass="text-gold-light" />
            <div aria-hidden className="my-5 h-px bg-ivory/15" />
            {/* One summary row instead of repeating Basic's list, then what Premium adds. */}
            <Checklist items={[c.everythingBasic]} tick="soft" strong />
            <p className="mt-5 mb-2.5 text-xs font-semibold text-gold-light">{c.plus}</p>
            <Checklist items={[c.photos.premium, ...c.extras]} tick="gold" strong />
            <div className="mt-auto pt-6">
              <ButtonLink href={start} variant="gold" fullWidth>{c.startPremium}</ButtonLink>
            </div>
          </div>
        </StaggerItem>

        {/* Custom: no fixed price, contact us to discuss */}
        <StaggerItem
          whileHover={{ y: -6 }}
          className="flex flex-col rounded-card bg-sand-light p-5 ring-1 ring-gold/50 lg:min-w-0 lg:flex-1 lg:rounded-2xl lg:p-8"
        >
          <div>
            <h3 className="text-lg font-bold lg:text-xl">{c.custom.name}</h3>
            <p className="mt-1 text-sm text-muted">{c.custom.tagline}</p>
            <div className="mt-4">
              <span className="block text-[32px] leading-none font-bold text-charcoal lg:text-[40px]">{c.custom.price}</span>
              <span className="mt-2 block text-sm text-muted">{c.custom.priceNote}</span>
            </div>
          </div>
          <div aria-hidden className="my-5 h-px bg-line-strong" />
          <Checklist items={[c.custom.everything]} tick="jade" strong />
          <p className="mt-5 mb-2.5 text-xs font-semibold text-gold-ink">{c.plus}</p>
          <Checklist items={c.custom.items} tick="jade" />
          <div className="mt-auto pt-6">
            <ButtonLink href={contactHref} variant="secondary" fullWidth>
              <MailIcon size={16} />
              {c.custom.cta}
            </ButtonLink>
          </div>
        </StaggerItem>
      </Stagger>

      {/* What every plan shares: no subscription, how to pay, free to try. */}
      <Reveal as="ul" className="mt-6 flex flex-col items-center gap-2 text-sm text-ink-soft lg:mt-8 lg:flex-row lg:flex-wrap lg:justify-center lg:gap-x-8">
        {c.trust.map((item) => (
          <li key={item} className="flex items-center gap-2">
            <CheckIcon size={16} className="shrink-0 text-jade-ink" />
            {item}
          </li>
        ))}
      </Reveal>
    </section>
  );
}

function PlanHeader({
  name, tagline, price, once, taglineClass, priceClass,
}: {
  name: string; tagline: string; price: { usd: string; riel: string }; once: string; taglineClass: string; priceClass: string;
}) {
  return (
    <div>
      <h3 className="text-lg font-bold lg:text-xl">{name}</h3>
      <p className={cn("mt-1 text-sm", taglineClass)}>{tagline}</p>
      <div className="mt-4 flex items-end gap-2.5">
        <span className={cn("text-[40px] leading-none font-bold lg:text-[52px]", priceClass)}>{price.usd}</span>
        <span className="pb-1 text-sm leading-tight opacity-80">
          <span className="block font-semibold">{price.riel}</span>
          <span className="block">{once}</span>
        </span>
      </div>
    </div>
  );
}

/** Benefit list with a round tick per line: jade (Basic), soft gold or solid gold (Premium). */
function Checklist({ items, tick, strong }: { items: string[]; tick: "jade" | "soft" | "gold"; strong?: boolean }) {
  return (
    <ul className="flex flex-col gap-2.5">
      {items.map((label) => (
        <li key={label} className={cn("flex items-center gap-2.5 text-sm", strong && "font-semibold")}>
          <span
            aria-hidden
            className={cn(
              "flex size-5 shrink-0 items-center justify-center rounded-full",
              tick === "jade" && "bg-jade-soft text-jade-ink",
              tick === "soft" && "bg-white/15 text-gold-light",
              tick === "gold" && "bg-gold text-charcoal",
            )}
          >
            <CheckIcon size={12} />
          </span>
          {label}
        </li>
      ))}
    </ul>
  );
}

function Faq() {
  const c = useContent(landingContent).faq;
  const [open, setOpen] = useState(0);
  return (
    <section id="faq" className="mx-auto max-w-[840px] scroll-mt-20 px-5 py-7 lg:px-6 lg:pt-6 lg:pb-[72px]">
      <Reveal className="mb-3 text-center lg:mb-5">
        <h2 className="text-lg font-bold lg:text-[32px] lg:leading-[1.6]">{c.title}</h2>
        <GoldRule center />
      </Reveal>
      <Stagger stagger={0.06} className="flex flex-col gap-2 lg:gap-2.5">
        {c.items.map((item, i) => {
          const isOpen = open === i;
          const id = `faq-${i}`;
          return (
            <StaggerItem key={item.q}>
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={id}
                onClick={() => setOpen(isOpen ? -1 : i)}
                className={cn(
                  "flex min-h-12 w-full cursor-pointer items-center justify-between gap-3 rounded-card border bg-white px-4 py-3.5 text-left text-sm font-semibold transition-colors duration-300 lg:min-h-14 lg:px-5 lg:py-4 lg:text-base",
                  isOpen ? "border-gold/60 text-maroon" : "border-transparent hover:border-line-strong",
                )}
              >
                <span>{item.q}</span>
                {/* The plus rotates into an × when open. */}
                <motion.span
                  aria-hidden
                  animate={{ rotate: isOpen ? 45 : 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className="text-lg text-maroon lg:text-[22px]"
                >
                  +
                </motion.span>
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    id={id}
                    key="answer"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: EASE }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pt-2.5 pb-1 text-sm text-ink-soft lg:px-5 lg:text-base">{item.a}</div>
                  </motion.div>
                )}
              </AnimatePresence>
            </StaggerItem>
          );
        })}
      </Stagger>
    </section>
  );
}

function FinalCta() {
  const start = useStartHref();
  const c = useContent(landingContent);
  const { lang } = useLanguage();
  return (
    <section className="mx-auto hidden max-w-[1200px] px-6 pb-[72px] lg:block">
      <Reveal variant="popIn" className="relative overflow-hidden rounded-[20px] border border-gold-light bg-gold-soft px-8 py-12 text-center">
        <Glow className="-top-20 -left-16 size-[280px] bg-white/70" drift={36} duration={16} />
        <Glow className="-right-16 -bottom-24 size-[300px] bg-gold-light/40" drift={28} duration={19} />
        <div className="relative">
          <h2 className={cn("mb-2 text-[26px] leading-[1.7] text-maroon", lang === "km" ? "font-moul font-normal" : "font-serif font-bold")}>{c.cta.title}</h2>
          <p className="mb-6 text-ink-soft">{c.cta.sub}</p>
          <ShimmerButton href={start} className="min-h-[50px] px-6">{c.create}</ShimmerButton>
        </div>
      </Reveal>
    </section>
  );
}

function Footer() {
  const c = useContent(landingContent);
  const { lang } = useLanguage();
  const product = [
    ["#how", c.nav.how],
    ["#templates", c.nav.templates],
    ["#pricing", c.nav.pricing],
    ["#faq", c.nav.faq],
  ] as const;
  // TODO: replace with the real Telegram and Facebook page links.
  const socials = [
    { href: "https://t.me/", label: "Telegram", Icon: SendIcon },
    { href: "https://facebook.com/", label: "Facebook", Icon: FacebookIcon },
  ];
  const link = "flex min-h-11 items-center text-footer no-underline transition-colors hover:text-gold-light lg:min-h-9";
  const heading = "mb-2 text-xs font-semibold text-gold";

  return (
    <footer className="relative mt-7 bg-charcoal text-[13px] text-footer lg:mt-0 lg:text-sm">
      {/* Thin gold line along the top edge. */}
      <div aria-hidden className="h-px bg-linear-to-r from-transparent via-gold/60 to-transparent" />
      <div className="mx-auto max-w-[1200px] px-5 pt-8 pb-6 lg:px-6 lg:pt-14 lg:pb-8">
        <div className="grid grid-cols-2 gap-x-6 gap-y-8 lg:grid-cols-[1.6fr_1fr_1fr_1.3fr] lg:gap-10">
          {/* Brand */}
          <div className="col-span-2 lg:col-span-1">
            <div className="text-lg leading-[1.7] text-gold lg:text-xl">
              <span lang="km" className="font-moul">ធៀបការ</span> <span lang="en" className="font-serif font-bold">TheabKa</span>
            </div>
            <p className="mt-2 max-w-[300px] text-footer-muted">{c.hero.badge}</p>
            <p className="mt-5 mb-2.5 text-xs font-semibold text-gold">{c.footer.follow}</p>
            <div className="flex gap-2.5">
              {socials.map(({ href, label, Icon }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  title={label}
                  className="flex size-11 items-center justify-center rounded-full bg-white/5 text-footer ring-1 ring-white/10 transition-colors hover:bg-gold hover:text-charcoal"
                >
                  <Icon size={18} />
                </a>
              ))}
            </div>
          </div>

          {/* Product links */}
          <nav aria-label={c.footer.product}>
            <p className={heading}>{c.footer.product}</p>
            <ul>
              {product.map(([href, label]) => (
                <li key={href}><a href={href} className={link}>{label}</a></li>
              ))}
            </ul>
          </nav>

          {/* Legal links */}
          <nav aria-label={c.legal.label}>
            <p className={heading}>{c.legal.label}</p>
            <ul>
              <li><Link href="/privacy" className={link}>{c.legal.privacy}</Link></li>
              <li><Link href="/terms" className={link}>{c.legal.terms}</Link></li>
            </ul>
          </nav>

          {/* Contact (company details live in lib/company.ts) */}
          <div className="col-span-2 lg:col-span-1">
            <p className={heading}>{c.footer.contact}</p>
            <ul className="flex flex-col">
              <li>
                <a href={`mailto:${COMPANY.email}`} lang="en" className={cn(link, "gap-2.5")}>
                  <MailIcon size={16} className="shrink-0 text-gold" />
                  {COMPANY.email}
                </a>
              </li>
              <li>
                <a href={`tel:${COMPANY.phone}`} lang="en" className={cn(link, "gap-2.5")}>
                  <PhoneIcon size={16} className="shrink-0 text-gold" />
                  {COMPANY.phone}
                </a>
              </li>
              <li className="flex min-h-11 items-center gap-2.5 lg:min-h-9">
                <PinIcon size={16} className="shrink-0 text-gold" />
                {lang === "km" ? COMPANY.cityKm : COMPANY.cityEn}
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 flex flex-col gap-3 border-t border-white/10 pt-5 text-xs text-footer-muted lg:mt-12 lg:flex-row lg:items-center lg:justify-between lg:text-[13px]">
          <div lang="en">© 2026 TheabKa · {COMPANY.name}</div>
          <div className="flex items-center justify-between gap-5">
            <span>{c.footer.made}</span>
            <a href="#top" className="flex min-h-11 items-center gap-1.5 font-semibold text-gold-light no-underline transition-colors hover:text-gold">
              {c.footer.top}
              <ArrowUpIcon size={14} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
