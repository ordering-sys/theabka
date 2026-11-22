"use client";

import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/lib/i18n";

export type BadgeTone = "maroon" | "gold" | "jade" | "rose" | "neutral" | "dark";

const tones: Record<BadgeTone, string> = {
  maroon: "bg-maroon text-white",
  gold: "bg-gold-soft text-gold-ink",
  jade: "bg-jade-soft text-jade-ink",
  rose: "bg-rose-soft text-maroon",
  neutral: "bg-sand text-muted",
  dark: "bg-charcoal text-white",
};

export function Badge({
  tone = "neutral", className, ...props
}: ComponentProps<"span"> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}

type Status = "draft" | "live" | "paid";
const statusTone: Record<Status, BadgeTone> = { draft: "neutral", live: "jade", paid: "gold" };

/** Draft / Live / Paid, in the current UI language. */
export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  const { t } = useLanguage();
  return (
    <Badge tone={statusTone[status]} className={className}>
      {status === "live" && <span aria-hidden className="size-1.5 rounded-full bg-jade" />}
      {t.status[status]}
    </Badge>
  );
}

/** Basic / Premium. */
export function TierBadge({ tier, className }: { tier: "basic" | "premium"; className?: string }) {
  const { t } = useLanguage();
  return (
    <Badge tone={tier === "premium" ? "maroon" : "jade"} className={className}>
      {t.tier[tier]}
    </Badge>
  );
}
