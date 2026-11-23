"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { EASE, Reveal, Stagger, StaggerItem, fadeUp } from "@/components/motion/Motion";
import { ButtonLink } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Header";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { CheckIcon, ClockIcon, GiftIcon, MailIcon, PinIcon, PlayIcon } from "@/components/ui/Icons";
import { PhoneMock, TemplateThumb } from "@/components/invitation/TemplateArt";
import { cn } from "@/lib/cn";
import { COMPANY } from "@/lib/company";
import { useContent, useLanguage } from "@/lib/i18n";
import { formatNumber, formatPrice } from "@/lib/khmer";
import { PLANS, getRsvpStats, rsvps, templates, type EventType } from "@/lib/mock-data";
import { landingContent } from "./content";
import { HowItWorks } from "./HowItWorks";

const SAMPLE_INVITE = "/i/dara-sophea";
const START = "/signin";

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
  const nav = [
    ["#how", c.nav.how],
    ["#templates", c.nav.templates],
    ["#pricing", c.nav.pricing],
    ["#faq", c.nav.faq],
  ] as const;
  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: EASE }}
      className="sticky top-0 z-30 border-b border-line bg-ivory/95 backdrop-blur-sm"
    >
      <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-4 py-3 lg:px-6">
        <Logo />
        <nav aria-label={c.nav.label} className="hidden gap-6 lg:flex">
          {nav.map(([href, label]) => (
            <a key={href} href={href} className="px-1 py-2.5 text-sm font-medium text-charcoal no-underline hover:text-maroon">
              {label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2 lg:gap-3">
          <LanguageToggle />
          <Link href="/signin" className="flex min-h-11 items-center px-1 text-[13px] font-semibold text-maroon no-underline hover:text-maroon-dark lg:text-sm">
            {t.common.signIn}
          </Link>
          <ButtonLink href={START} size="sm" className="hidden lg:inline-flex">{c.create}</ButtonLink>
        </div>
      </div>
    </motion.header>
  );
}

function Hero() {
  const c = useContent(landingContent).hero;
  const create = useContent(landingContent).create;
  const { lang } = useLanguage();
  const stats = getRsvpStats(rsvps);
  // Share of replies that are "attending".
  const repliedPct = Math.round((stats.attending / rsvps.length) * 100);

  return (
    <section className="mx-auto flex max-w-[1200px] flex-col items-center gap-6 px-5 pt-7 pb-2 lg:flex-row lg:gap-12 lg:px-6 lg:py-[72px]">
      <Stagger onMount stagger={0.1} delay={0.1} className="min-w-0 text-center lg:flex-[1_1_480px] lg:text-left">
        <StaggerItem variant="popIn" className="inline-block rounded-full bg-gold-soft px-3 py-1 text-xs font-semibold text-gold-ink lg:px-3.5 lg:py-1.5 lg:text-[13px]">
          {c.badge}
        </StaggerItem>
        <StaggerItem as="h1" className={cn("mt-3.5 mb-2 text-[26px] leading-[1.7] font-normal text-maroon lg:mt-[18px] lg:mb-3.5 lg:text-[40px] lg:leading-[1.6]", lang === "km" ? "font-moul" : "font-serif font-bold")}>
          {c.title}
        </StaggerItem>
        <StaggerItem as="p" className="mb-5 text-[15px] text-ink-soft lg:mb-7 lg:max-w-[540px] lg:text-lg">{c.sub}</StaggerItem>
        <StaggerItem className="flex flex-col gap-2.5 lg:flex-row lg:gap-3">
          <ButtonLink href={START} fullWidth className="lg:w-auto lg:min-h-[50px] lg:px-6">{create}</ButtonLink>
          <ButtonLink href={SAMPLE_INVITE} variant="secondary" fullWidth className="lg:hidden">{c.sample}</ButtonLink>
          <ButtonLink href="#how" variant="secondary" className="hidden min-h-[50px] px-6 lg:inline-flex">
            <PlayIcon size={18} />
            {c.seeHow}
          </ButtonLink>
        </StaggerItem>
        <StaggerItem as="ul" className="mt-8 hidden flex-wrap gap-6 text-sm text-ink-soft lg:flex">
          {c.trust.map((item) => (
            <li key={item} className="flex items-center gap-2">
              <CheckIcon size={18} className="text-jade-ink" />
              {item}
            </li>
          ))}
        </StaggerItem>
      </Stagger>

      <div className="flex justify-center gap-6 py-6 lg:flex-[1_1_400px] lg:items-end lg:py-0">
        <motion.div
          initial={{ opacity: 0, y: 40, rotate: -3 }}
          animate={{ opacity: 1, y: 0, rotate: 0 }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.25 }}
        >
          {/* Gentle idle float once it has landed. */}
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 5, ease: "easeInOut", repeat: Infinity, delay: 1.1 }}
          >
            <Link href={SAMPLE_INVITE} aria-label={c.sample} className="lg:hidden">
              <PhoneMock />
            </Link>
            <div className="hidden lg:block">
              <PhoneMock size="lg" />
            </div>
          </motion.div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 30, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: EASE, delay: 0.6 }}
          className="mb-10 hidden w-[210px] rounded-2xl bg-white p-4 shadow-[0_10px_30px_rgba(43,43,43,0.12)] lg:block"
        >
          <div className="text-xs font-semibold text-muted">{c.liveRsvp}</div>
          <div className="text-[32px] leading-[1.2] font-bold text-jade-ink">{formatNumber(stats.totalGuests, lang)}</div>
          <div className="text-[13px] text-ink-soft">{c.guestsComing}</div>
          <div className="mt-3 mb-1.5 h-2 overflow-hidden rounded-full bg-sand">
            <motion.div
              className="h-full bg-jade"
              initial={{ width: 0 }}
              animate={{ width: `${repliedPct}%` }}
              transition={{ duration: 1, ease: EASE, delay: 1 }}
            />
          </div>
          <div className="text-xs text-muted">{formatNumber(rsvps.length, lang)} {c.replied}</div>
        </motion.div>
      </div>
    </section>
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
          <p className="mt-1 hidden text-muted lg:block">{c.sub}</p>
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
                "min-h-11 cursor-pointer rounded-full border-[1.5px] px-4 text-sm font-semibold",
                filter === value ? "border-charcoal bg-charcoal text-white" : "border-line-strong bg-white text-charcoal",
              )}
            >
              {label}
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
              className="w-[130px] shrink-0 lg:w-auto"
            >
              <Link
                href="/app/new"
                className="flex flex-col gap-1.5 text-charcoal no-underline lg:gap-2 lg:rounded-2xl lg:bg-white lg:p-2.5 lg:shadow-card"
              >
                <TemplateThumb template={tpl} size="md" className="h-[180px] shadow-card lg:hidden" />
                <TemplateThumb template={tpl} size="lg" className="hidden h-[280px] lg:block" />
                <div className="flex items-center justify-between lg:px-1 lg:pb-1">
                  <div>
                    <div lang={lang} className="text-[13px] font-semibold lg:text-base">{lang === "km" ? tpl.nameKm : tpl.nameEn}</div>
                    <div className="text-xs text-muted">{t.tier[tpl.tier]}</div>
                  </div>
                  <div className="hidden text-right lg:block">
                    <div className="font-bold text-maroon">{price.usd}</div>
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
    <section className="hidden bg-maroon text-ivory lg:block">
      <div className="mx-auto flex max-w-[1200px] items-center gap-12 px-6 py-[72px]">
        <Reveal className="min-w-0 flex-[1_1_420px]">
          <div className={cn("text-[13px] font-bold text-gold-light", lang === "en" && "tracking-[0.1em]")}>{c.kicker}</div>
          <h2 className="mt-1.5 mb-3 text-[32px] leading-tight font-bold">{c.title}</h2>
          <p className="mb-6 text-base opacity-90">{c.sub}</p>
          <ButtonLink href={SAMPLE_INVITE} variant="gold" className="min-h-[50px] px-6">{c.openSample}</ButtonLink>
        </Reveal>
        <Stagger as="ul" stagger={0.1} delay={0.15} className="grid flex-[1_1_480px] grid-cols-2 gap-4">
          {c.features.map((f, i) => {
            const Icon = guestIcons[i];
            return (
              <StaggerItem
                as="li"
                key={f.title}
                whileHover={{ y: -4, backgroundColor: "rgba(255,255,255,0.14)" }}
                className="rounded-[14px] border border-gold/50 bg-white/8 p-[18px]"
              >
                <Icon size={24} className="text-gold-light" />
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
  const c = useContent(landingContent).pricing;
  const { lang, t } = useLanguage();
  const basic = formatPrice(PLANS.basic.priceUsd, lang);
  const premium = formatPrice(PLANS.premium.priceUsd, lang);

  return (
    <section id="pricing" className="mx-auto max-w-[1200px] scroll-mt-20 px-5 py-7 lg:px-6 lg:py-[72px]">
      <Reveal className="mb-3.5 text-center lg:mb-8">
        <h2 className="mb-1 text-lg font-bold lg:text-[32px] lg:leading-[1.6]">{c.title}</h2>
        <p className="text-[13px] text-muted lg:text-base">{c.sub}</p>
      </Reveal>
      <Stagger stagger={0.12} className="flex flex-col gap-3 lg:flex-row lg:justify-center lg:gap-6">
        <StaggerItem whileHover={{ y: -6 }} className="rounded-card border border-line bg-white p-[18px] shadow-card lg:flex-[0_1_380px] lg:rounded-2xl lg:p-7">
          <h3 className="text-base font-bold lg:text-lg">{t.tier.basic}</h3>
          <div className="mt-1 mb-2.5 flex items-baseline gap-2 lg:mt-1.5 lg:mb-4">
            <span className="text-[30px] font-bold text-maroon lg:text-[44px]">{basic.usd}</span>
            <span className="text-sm text-muted lg:text-base">{basic.riel}<span className="hidden lg:inline"> · {c.once}</span></span>
          </div>
          <Features items={c.basic} checkClass="text-jade" />
          <ButtonLink href={START} variant="secondary" fullWidth className="mt-[18px] hidden lg:flex">{c.startBasic}</ButtonLink>
        </StaggerItem>
        <StaggerItem whileHover={{ y: -6 }} className="relative rounded-card bg-maroon p-[18px] text-ivory shadow-[0_6px_20px_rgba(122,31,43,0.25)] lg:flex-[0_1_380px] lg:rounded-2xl lg:p-7">
          <div className="absolute top-3.5 right-3.5 rounded-full bg-gold px-2.5 py-0.5 text-[11px] font-bold text-charcoal lg:top-5 lg:right-5 lg:text-xs">
            {c.popular}
          </div>
          <h3 className="text-base font-bold lg:text-lg">{t.tier.premium}</h3>
          <div className="mt-1 mb-2.5 flex items-baseline gap-2 lg:mt-1.5 lg:mb-4">
            <span className="text-[30px] font-bold text-gold-light lg:text-[44px]">{premium.usd}</span>
            <span className="text-sm opacity-85 lg:text-base">{premium.riel}<span className="hidden lg:inline"> · {c.once}</span></span>
          </div>
          <Features items={c.premium} checkClass="text-gold-light" />
          <ButtonLink href={START} variant="gold" fullWidth className="mt-[18px] hidden lg:flex">{c.startPremium}</ButtonLink>
        </StaggerItem>
      </Stagger>
    </section>
  );
}

function Features({ items, checkClass }: { items: string[]; checkClass: string }) {
  return (
    <ul className="flex flex-col lg:gap-1">
      {items.map((f) => (
        <li key={f} className="flex items-start gap-2 text-sm lg:gap-2.5 lg:text-base">
          <CheckIcon size={18} className={cn("mt-[3px] shrink-0", checkClass)} />
          <span>{f}</span>
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
      <Reveal as="h2" className="mb-3 text-center text-lg font-bold lg:mb-5 lg:text-[32px] lg:leading-[1.6]">{c.title}</Reveal>
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
                className="flex min-h-12 w-full cursor-pointer items-center justify-between gap-3 rounded-card bg-white px-4 py-3.5 text-left text-sm font-semibold lg:min-h-14 lg:px-5 lg:py-4 lg:text-base"
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
  const c = useContent(landingContent);
  const { lang } = useLanguage();
  return (
    <section className="mx-auto hidden max-w-[1200px] px-6 pb-[72px] lg:block">
      <Reveal className="rounded-[20px] border border-gold-light bg-gold-soft px-8 py-12 text-center">
        <h2 className={cn("mb-2 text-[26px] leading-[1.7] text-maroon", lang === "km" ? "font-moul font-normal" : "font-serif font-bold")}>{c.cta.title}</h2>
        <p className="mb-6 text-ink-soft">{c.cta.sub}</p>
        <ButtonLink href={START} className="min-h-[50px] px-6">{c.create}</ButtonLink>
      </Reveal>
    </section>
  );
}

function Footer() {
  const c = useContent(landingContent);
  return (
    <footer className="mt-7 bg-charcoal text-[13px] text-footer lg:mt-0 lg:text-sm">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-2.5 px-5 pt-6 pb-8 lg:flex-row lg:flex-wrap lg:justify-between lg:gap-6 lg:px-6 lg:py-10">
        <div>
          <div className="text-[15px] leading-[1.7] text-gold lg:text-base">
            <span lang="km" className="font-moul">ធៀបការ</span> <span lang="en" className="font-serif font-bold">TheabKa</span>
          </div>
          {/* Company details live in lib/company.ts. */}
          <div lang="en" className="mt-1.5">{COMPANY.name} · {COMPANY.cityEn}</div>
          <div lang="en">{COMPANY.email} · {COMPANY.phone}</div>
        </div>
        <div className="flex gap-4 lg:gap-5">
          <a href="https://t.me/" className="flex min-h-11 items-center text-gold-light">Telegram</a>
          <a href="https://facebook.com/" className="flex min-h-11 items-center text-gold-light">Facebook</a>
          <a href="#faq" className="hidden min-h-11 items-center text-gold-light lg:flex">{c.nav.faq}</a>
        </div>
        <nav aria-label={c.legal.label} className="flex flex-wrap gap-x-4 lg:gap-x-5">
          <Link href="/privacy" className="flex min-h-11 items-center text-gold-light">{c.legal.privacy}</Link>
          <Link href="/terms" className="flex min-h-11 items-center text-gold-light">{c.legal.terms}</Link>
        </nav>
        <div lang="en" className="mt-1 text-xs text-footer-muted lg:mt-0 lg:text-sm">© 2026 TheabKa</div>
      </div>
    </footer>
  );
}
