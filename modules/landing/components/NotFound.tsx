"use client";

import { Reveal, Stagger, StaggerItem } from "@/components/motion/Motion";
import { ButtonLink } from "@/components/ui/Button";
import { Header, LotusMark } from "@/components/ui/Header";
import { cn } from "@/lib/cn";
import { useContent, useLanguage } from "@/lib/i18n";
import { landingContent } from "@/modules/landing/content";

/** 404 for any unknown URL. Guest links have their own page in modules/guest. */
export function NotFound() {
  const c = useContent(landingContent).notFound;
  const { lang } = useLanguage();
  return (
    <>
      <Header />
      <main className="flex grow items-center justify-center px-6 py-16">
        <Stagger onMount stagger={0.08} className="flex max-w-[420px] flex-col items-center gap-3 text-center">
          <StaggerItem variant="popIn" className="flex size-16 items-center justify-center rounded-[18px] bg-maroon text-gold">
            <LotusMark size={34} />
          </StaggerItem>
          <StaggerItem aria-hidden className="font-serif text-6xl leading-none font-bold text-gold">404</StaggerItem>
          <StaggerItem
            as="h1"
            className={cn("text-maroon", lang === "km" ? "font-moul text-xl leading-[1.9] font-normal" : "font-serif text-2xl font-bold")}
          >
            {c.title}
          </StaggerItem>
          <StaggerItem as="p" className="text-sm text-muted">{c.body}</StaggerItem>
          <Reveal onMount delay={0.3} className="mt-2 flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row">
            <ButtonLink href="/">{c.home}</ButtonLink>
            <ButtonLink href="/app" variant="secondary">{c.app}</ButtonLink>
          </Reveal>
        </Stagger>
      </main>
    </>
  );
}
