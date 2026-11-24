import type { CSSProperties } from "react";
import { cn } from "@/lib/cn";
import { formatEnglishDate, formatKhmerDate, toKhmerNumerals } from "@/lib/khmer";
import { sampleInvitation as inv, type Template } from "@/lib/mock-data";
import { JasmineDivider, KbachCorners } from "./Kbach";

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
  lg: { pad: "p-2.5", lotus: 34, head: "text-[13px]", names: "text-2xl", date: "text-xs" },
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
        className="relative flex h-full flex-col items-center justify-center gap-0.5 rounded-md border p-1.5 text-center"
        style={{ borderColor: accent, color: fg }}
      >
        {size === "lg" && <KbachCorners color={accent} />}
        {s.lotus > 0 && <Lotus size={s.lotus} color={accent} />}
        <div lang="km" className={cn("font-moul leading-[1.9]", size === "lg" && "mt-1", s.head)} style={{ color: accent }}>
          {size === "sm" ? "សិរីមង្គល" : headingKm(template)}
        </div>
        <div lang="en" className={cn("font-serif italic leading-snug", s.names)}>{shortNamesEn}</div>
        {size === "lg" && <div aria-hidden className="my-2 h-px w-12" style={{ background: accent }} />}
        <div lang="km" className={s.date}>{shortDate}</div>
      </div>
    </div>
  );
}

/** Phone frame showing the sample invitation in the Royal Maroon style. */
export function PhoneMock({ size = "md", children }: { size?: "md" | "lg"; children?: React.ReactNode }) {
  if (size === "lg") return <PhoneMockLarge>{children}</PhoneMockLarge>;
  return (
    <div className="h-[400px] w-[220px] shrink-0 rounded-[34px] bg-charcoal p-[9px] shadow-[0_18px_40px_rgba(122,31,43,0.25)]">
      <div className="relative flex h-full flex-col items-center justify-center overflow-hidden rounded-[26px] bg-maroon p-5 text-center text-ivory">
        <div aria-hidden className="absolute inset-3 rounded-2xl border border-gold" />
        <Lotus size={28} color="var(--color-gold)" strokeWidth={1.3} />
        <div lang="km" className="mt-2 font-moul text-xs leading-[1.9] text-gold">សិរីមង្គលអាពាហ៍ពិពាហ៍</div>
        <div lang="km" className="mt-2.5 text-[15px] font-semibold">
          {inv.groomKm} &amp; {inv.brideKm}
        </div>
        <div lang="en" className="font-serif text-lg leading-snug italic">{shortNamesEn}</div>
        <div aria-hidden className="my-3 h-px w-[60px] bg-gold" />
        <div lang="km" className="text-[11px] leading-[1.9]">{formatKhmerDate(inv.eventDate)}</div>
        <div lang="en" className="text-[10px] opacity-85">{formatEnglishDate(inv.eventDate)}</div>
        {children ?? (
          <div className="mt-3.5 rounded-full bg-gold px-3.5 py-1.5 text-[11px] font-bold text-charcoal">RSVP</div>
        )}
      </div>
    </div>
  );
}

/**
 * Desktop hero version: the taller screen is filled top to bottom (heading, names
 * and date, venue and RSVP) and framed with light kbach corners.
 */
function PhoneMockLarge({ children }: { children?: React.ReactNode }) {
  return (
    <div className="h-[520px] w-[260px] shrink-0 rounded-[40px] bg-charcoal p-2.5 shadow-[0_18px_40px_rgba(122,31,43,0.25)]">
      <div className="relative flex h-full flex-col items-center justify-between overflow-hidden rounded-[31px] bg-maroon px-6 pt-9 pb-8 text-center text-ivory">
        <div aria-hidden className="absolute inset-3.5 rounded-[20px] border border-gold/70">
          <KbachCorners />
        </div>

        <div className="relative flex flex-col items-center">
          <Lotus size={36} color="var(--color-gold)" strokeWidth={1.3} />
          <div lang="km" className="mt-2 font-moul text-sm leading-[1.9] text-gold">សិរីមង្គលអាពាហ៍ពិពាហ៍</div>
        </div>

        <div className="relative flex flex-col items-center">
          <div lang="km" className="text-[17px] leading-[1.7] font-semibold">
            {inv.groomKm} &amp; {inv.brideKm}
          </div>
          <div lang="en" className="font-serif text-2xl leading-snug italic">{shortNamesEn}</div>
          <JasmineDivider className="my-3 w-[110px]" />
          <div lang="km" className="text-[13px] leading-[1.9]">{formatKhmerDate(inv.eventDate)}</div>
          <div lang="en" className="text-[11px] opacity-85">{formatEnglishDate(inv.eventDate)}</div>
        </div>

        <div className="relative flex flex-col items-center">
          <div lang="km" className="text-xs leading-[1.7] text-gold">{inv.venueNameKm}</div>
          <div lang="en" className="text-[10px] opacity-75">{inv.venueNameEn}</div>
          {children ?? (
            <div className="mt-3 rounded-full bg-gold px-[18px] py-2 text-[13px] font-bold text-charcoal">RSVP</div>
          )}
        </div>
      </div>
    </div>
  );
}
