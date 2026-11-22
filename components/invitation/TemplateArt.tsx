import type { CSSProperties } from "react";
import { cn } from "@/lib/cn";
import { formatEnglishDate, formatKhmerDate, toKhmerNumerals } from "@/lib/khmer";
import { sampleInvitation as inv, type Template } from "@/lib/mock-data";

/** Lotus ornament. Invitation artwork only, never host-app chrome. */
export function Lotus({ size = 28, color, strokeWidth = 1.4 }: { size?: number; color?: string; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color ?? "currentColor"} strokeWidth={strokeWidth} aria-hidden>
      <path d="M12 3c2 3 2 6 0 9-2-3-2-6 0-9z" />
      <path d="M12 12c3-2 6-2 8 0-3 2-6 2-8 0z" />
      <path d="M12 12c-3-2-6-2-8 0 3 2 6 2 8 0z" />
    </svg>
  );
}

export function headingKm(template: Template) {
  return template.eventType === "wedding" ? "សិរីមង្គលអាពាហ៍ពិពាហ៍" : "ពិធីភ្ជាប់ពាក្យ";
}

const shortNamesEn = `${inv.groomEn.split(" ").at(-1)} & ${inv.brideEn.split(" ").at(-1)}`;
const shortDate = toKhmerNumerals("13 · 12 · 2026");

type ThumbSize = "sm" | "md" | "lg";

const thumbSizes: Record<ThumbSize, { pad: string; lotus: number; head: string; names: string; date: string }> = {
  sm: { pad: "p-1.5", lotus: 0, head: "text-[8px]", names: "text-sm", date: "hidden" },
  md: { pad: "p-2", lotus: 22, head: "text-[9px]", names: "text-[15px]", date: "text-[9px]" },
  lg: { pad: "p-2.5", lotus: 28, head: "text-[11px]", names: "text-xl", date: "text-[11px]" },
};

/**
 * The small invitation artwork used on template cards. Colours come from the
 * template's own palette (data), so they're inline styles, not theme tokens.
 */
export function TemplateThumb({
  template, size = "md", className, style,
}: { template: Template; size?: ThumbSize; className?: string; style?: CSSProperties }) {
  const s = thumbSizes[size];
  const { bg, fg, accent } = template.theme;
  return (
    <div className={cn("rounded-lg", s.pad, className)} style={{ background: bg, ...style }} aria-hidden>
      <div
        className="flex h-full flex-col items-center justify-center gap-0.5 rounded-md border p-1.5 text-center"
        style={{ borderColor: accent, color: fg }}
      >
        {s.lotus > 0 && <Lotus size={s.lotus} color={accent} />}
        <div lang="km" className={cn("font-moul leading-[1.9]", s.head)} style={{ color: accent }}>
          {size === "sm" ? "សិរីមង្គល" : headingKm(template)}
        </div>
        <div lang="en" className={cn("font-serif italic leading-snug", s.names)}>{shortNamesEn}</div>
        <div lang="km" className={s.date}>{shortDate}</div>
      </div>
    </div>
  );
}

/** Phone frame showing the sample invitation in the Royal Maroon style. */
export function PhoneMock({ size = "md", children }: { size?: "md" | "lg"; children?: React.ReactNode }) {
  const lg = size === "lg";
  return (
    <div
      className={cn(
        "shrink-0 bg-charcoal shadow-[0_18px_40px_rgba(122,31,43,0.25)]",
        lg ? "h-[520px] w-[260px] rounded-[40px] p-2.5" : "h-[400px] w-[220px] rounded-[34px] p-[9px]",
      )}
    >
      <div
        className={cn(
          "relative flex h-full flex-col items-center justify-center overflow-hidden bg-maroon text-center text-ivory",
          lg ? "rounded-[31px] p-6" : "rounded-[26px] p-5",
        )}
      >
        <div aria-hidden className={cn("absolute border border-gold", lg ? "inset-3.5 rounded-[20px]" : "inset-3 rounded-2xl")} />
        <Lotus size={lg ? 36 : 28} color="var(--color-gold)" strokeWidth={1.3} />
        <div lang="km" className={cn("mt-2 font-moul leading-[1.9] text-gold", lg ? "text-sm" : "text-xs")}>
          សិរីមង្គលអាពាហ៍ពិពាហ៍
        </div>
        <div lang="km" className={cn("mt-2.5 font-semibold", lg ? "text-[17px]" : "text-[15px]")}>
          {inv.groomKm} &amp; {inv.brideKm}
        </div>
        <div lang="en" className={cn("font-serif italic leading-snug", lg ? "text-2xl" : "text-lg")}>{shortNamesEn}</div>
        <div aria-hidden className={cn("my-3 h-px bg-gold", lg ? "w-[70px]" : "w-[60px]")} />
        <div lang="km" className={cn("leading-[1.9]", lg ? "text-[13px]" : "text-[11px]")}>{formatKhmerDate(inv.eventDate)}</div>
        <div lang="en" className={cn("opacity-85", lg ? "text-[11px]" : "text-[10px]")}>{formatEnglishDate(inv.eventDate)}</div>
        {children ?? (
          <div className={cn("mt-3.5 rounded-full bg-gold font-bold text-charcoal", lg ? "px-[18px] py-2 text-[13px]" : "px-3.5 py-1.5 text-[11px]")}>
            RSVP
          </div>
        )}
      </div>
    </div>
  );
}
