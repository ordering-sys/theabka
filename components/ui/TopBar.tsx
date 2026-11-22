"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/i18n";
import { BackIcon } from "./Icons";
import { LanguageToggle } from "./LanguageToggle";

/** Compact app bar for host screens: back link, optional title, language toggle. */
export function TopBar({ backHref, title }: { backHref: string; title?: React.ReactNode }) {
  const { t } = useLanguage();
  return (
    <div className="flex items-center justify-between">
      <Link
        href={backHref}
        aria-label={t.common.back}
        className="flex size-11 items-center justify-center rounded-full text-charcoal hover:bg-sand"
      >
        <BackIcon size={22} />
      </Link>
      {title && <h1 className="text-[17px] font-bold">{title}</h1>}
      <LanguageToggle />
    </div>
  );
}
