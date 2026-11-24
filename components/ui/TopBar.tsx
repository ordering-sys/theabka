"use client";

import Link from "next/link";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/lib/i18n";
import { BackIcon } from "./Icons";
import { LanguageToggle } from "./LanguageToggle";

type TopBarProps = {
  backHref: string;
  title?: React.ReactNode;
  /** Show flags instead of KH/EN text in the language toggle (signed-in host screens). */
  flags?: boolean;
  /** Controls after the language toggle (e.g. the account menu). */
  end?: React.ReactNode;
};

/** Compact app bar for host screens: back link, optional title, language toggle. */
export function TopBar({ backHref, title, flags = false, end }: TopBarProps) {
  const { t } = useLanguage();
  return (
    <div className="flex items-center justify-between gap-2">
      <Link
        href={backHref}
        aria-label={t.common.back}
        className="flex size-11 shrink-0 items-center justify-center rounded-full text-charcoal hover:bg-sand"
      >
        <BackIcon size={22} />
      </Link>
      {title && <h1 className={cn("min-w-0 truncate text-[17px] font-bold", end != null && "max-sm:hidden")}>{title}</h1>}
      <div className="flex shrink-0 items-center gap-1.5 lg:gap-3">
        <LanguageToggle flags={flags} />
        {end}
      </div>
    </div>
  );
}
