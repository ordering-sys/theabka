"use client";

import Link from "next/link";
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

export function Logo() {
  const { t } = useLanguage();
  return (
    <Link href="/" className="flex items-center gap-2 no-underline" aria-label={`${t.brand.nameKm} ${t.brand.name}`}>
      <span className="flex size-[34px] items-center justify-center rounded-[10px] bg-maroon text-gold">
        <LotusMark />
      </span>
      <span className="leading-[1.1]">
        <span lang="km" className="block font-moul text-sm leading-[1.6] text-maroon">
          {t.brand.nameKm}
        </span>
        <span lang="en" className="block font-sans text-[11px] font-semibold tracking-[0.08em] text-muted">
          THEABKA
        </span>
      </span>
    </Link>
  );
}

type HeaderProps = {
  /** Extra controls on the right, before the language toggle. */
  actions?: React.ReactNode;
  /** Show the "Sign in" link (landing page). */
  showSignIn?: boolean;
};

export function Header({ actions, showSignIn = false }: HeaderProps) {
  const { t } = useLanguage();
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-ivory/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 lg:px-8">
        <Logo />
        <div className="flex items-center gap-2">
          {actions}
          <LanguageToggle />
          {showSignIn && (
            <Link
              href="/signin"
              className="flex min-h-11 items-center px-1 text-[13px] font-semibold text-maroon no-underline hover:text-maroon-dark"
            >
              {t.common.signIn}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
