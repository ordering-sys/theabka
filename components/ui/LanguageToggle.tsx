"use client";

import { useLanguage, type Lang } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { FlagEN, FlagKH } from "./Flags";

// `name` is each language in its own script: the accessible name of the flag-only buttons.
const options: { value: Lang; label: string; name: string; Flag: typeof FlagKH }[] = [
  { value: "km", label: "KH", name: "ភាសាខ្មែរ", Flag: FlagKH },
  { value: "en", label: "EN", name: "English", Flag: FlagEN },
];

/**
 * `dark` sits on photos (guest invitation); default sits on ivory.
 * `flags` shows a flag instead of the KH/EN text (site navbars); the language name
 * stays available to screen readers via aria-label and as a hover tooltip.
 */
export function LanguageToggle({
  className,
  variant = "light",
  flags = false,
}: { className?: string; variant?: "light" | "dark"; flags?: boolean }) {
  const { lang, setLang, t } = useLanguage();
  const dark = variant === "dark";
  return (
    <div
      role="group"
      aria-label={t.common.languageToggle}
      className={cn("flex rounded-[10px] p-[3px]", dark ? "bg-charcoal/55 backdrop-blur-sm" : "bg-sand", className)}
    >
      {options.map(({ value, label, name, Flag }) => {
        const on = lang === value;
        return (
          <button
            key={value}
            type="button"
            aria-pressed={on}
            aria-label={flags ? name : undefined}
            title={flags ? name : undefined}
            lang={value}
            onClick={() => setLang(value)}
            // 44px tall tap area; the visible pill stays compact.
            className={cn(
              "relative flex min-h-8 min-w-11 cursor-pointer items-center justify-center rounded-lg text-xs font-bold transition-colors",
              "after:absolute after:inset-x-0 after:-inset-y-1.5 after:content-['']",
              flags && "px-2.5",
              on
                ? dark ? "bg-gold text-charcoal" : "bg-maroon text-white"
                : dark ? "bg-transparent text-ivory" : "bg-transparent text-muted hover:text-charcoal",
            )}
          >
            {flags ? (
              <Flag size="md" className={cn("transition-[filter,opacity]", !on && "opacity-70 grayscale-[35%]")} />
            ) : (
              label
            )}
          </button>
        );
      })}
    </div>
  );
}
