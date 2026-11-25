"use client";

import { EyeIcon, EyeOffIcon } from "@/components/ui/Icons";
import { cn } from "@/lib/cn";
import { useContent } from "@/lib/i18n";
import { dashboardContent } from "@/modules/dashboard/content";

/** A money total, or dots when the host hid the totals. Screen readers hear "Hidden". */
export function MaskedAmount({ hidden, children }: { hidden: boolean; children: React.ReactNode }) {
  const c = useContent(dashboardContent).detail.gifts;
  if (!hidden) return <>{children}</>;
  return (
    <>
      <span aria-hidden className="tracking-[0.15em]">••••••</span>
      <span className="sr-only">{c.hiddenValue}</span>
    </>
  );
}

/** "Hide totals" / "Show totals". `tone="dark"` sits on the maroon book cover. */
export function TotalsToggle({
  hidden,
  onToggle,
  tone = "light",
  className,
}: {
  hidden: boolean;
  onToggle: (hidden: boolean) => void;
  tone?: "light" | "dark";
  className?: string;
}) {
  const c = useContent(dashboardContent).detail.gifts;
  const Icon = hidden ? EyeIcon : EyeOffIcon;
  return (
    <button
      type="button"
      aria-pressed={hidden}
      onClick={() => onToggle(!hidden)}
      className={cn(
        "inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full px-3.5 text-[13px] leading-[1.6] font-semibold transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold",
        tone === "dark" ? "text-gold-light hover:bg-white/10" : "text-maroon hover:bg-sand-light",
        className,
      )}
    >
      <Icon size={16} />
      {hidden ? c.showTotals : c.hideTotals}
    </button>
  );
}
