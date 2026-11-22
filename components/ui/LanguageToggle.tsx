"use client";

import { useLanguage, type Lang } from "@/lib/i18n";
import { cn } from "@/lib/cn";

const options: { value: Lang; label: string }[] = [
  { value: "km", label: "KH" },
  { value: "en", label: "EN" },
];

/** `dark` sits on photos (guest invitation); default sits on ivory. */
export function LanguageToggle({ className, variant = "light" }: { className?: string; variant?: "light" | "dark" }) {
  const { lang, setLang, t } = useLanguage();
  const dark = variant === "dark";
  return (
    <div
      role="group"
      aria-label={t.common.languageToggle}
      className={cn("flex rounded-[10px] p-[3px]", dark ? "bg-charcoal/55 backdrop-blur-sm" : "bg-sand", className)}
    >
      {options.map((o) => {
        const on = lang === o.value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => setLang(o.value)}
            // 44px tall tap area; the visible pill stays compact.
            className={cn(
              "relative min-h-8 min-w-11 cursor-pointer rounded-lg text-xs font-bold transition-colors",
              "after:absolute after:inset-x-0 after:-inset-y-1.5 after:content-['']",
              on
                ? dark ? "bg-gold text-charcoal" : "bg-maroon text-white"
                : dark ? "bg-transparent text-ivory" : "bg-transparent text-muted hover:text-charcoal",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
