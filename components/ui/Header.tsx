"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/lib/i18n";
import { LanguageToggle } from "./LanguageToggle";

export function LotusMark({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden className={className}>
      <path d="M12 3c2 3 2 6 0 9-2-3-2-6 0-9z" />
      <path d="M12 12c3-2 6-2 8 0-3 2-6 2-8 0z" />
      <path d="M12 12c-3-2-6-2-8 0 3 2 6 2 8 0z" />
      <path d="M6 17h12" />
      <path d="M8 20h8" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  const { t } = useLanguage();
  return (
    <Link
      href="/"
      aria-label={`${t.brand.nameKm} ${t.brand.name}`}
      className={cn(
        "group flex min-h-11 items-center gap-2.5 rounded-xl no-underline",
        "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold",
        className,
      )}
    >
      <span className="relative flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-linear-to-br from-maroon to-maroon-dark text-gold ring-1 ring-gold/30 ring-inset lg:size-[38px]">
        <LotusMark size={21} className="transition-transform duration-500 ease-out group-hover:-translate-y-px group-hover:scale-110" />
      </span>
      <span className="flex flex-col">
        <span lang="km" className="font-moul text-[15px] leading-[1.6] text-maroon lg:text-base">
          {t.brand.nameKm}
        </span>
        <span lang="en" className="-mt-1 font-sans text-[10.5px] leading-none font-semibold tracking-[0.14em] text-muted transition-colors group-hover:text-gold-deep">
          THEABKA
        </span>
      </span>
    </Link>
  );
}

type HeaderProps = {
  /** Extra controls on the right, before the language toggle. */
  actions?: React.ReactNode;
  /** Controls after the language toggle (e.g. the account menu). */
  end?: React.ReactNode;
  /** Show the "Sign in" link (landing page). */
  showSignIn?: boolean;
};

export function Header({ actions, end, showSignIn = false }: HeaderProps) {
  const { t } = useLanguage();
  // Flat at the top of the page; a border and a light blur once content scrolls under it.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        // On a white page the bottom line is what separates the bar from the content, so it's always shown.
        "sticky top-0 z-30 border-b border-line transition-[background-color,box-shadow] duration-300",
        scrolled ? "bg-white/90 shadow-[0_4px_16px_-8px_rgba(43,43,43,0.12)] backdrop-blur-md" : "bg-white",
      )}
    >
      <div
        className={cn(
          "mx-auto flex max-w-[1200px] items-center justify-between gap-3 px-4 transition-[padding] duration-300 lg:px-6",
          scrolled ? "py-2" : "py-3",
        )}
      >
        <Logo />
        <div className="flex items-center gap-1.5 lg:gap-3">
          {actions}
          <LanguageToggle flags />
          {showSignIn && (
            <>
              <span aria-hidden className="hidden h-6 w-px bg-line lg:block" />
              <Link
                href="/signin"
                className="flex min-h-11 items-center rounded-xl px-3 text-[13px] font-semibold text-maroon no-underline transition-colors hover:bg-sand-light hover:text-maroon-dark lg:text-sm"
              >
                {t.common.signIn}
              </Link>
            </>
          )}
          {end}
        </div>
      </div>
    </header>
  );
}
