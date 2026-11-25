/* eslint-disable @next/next/no-img-element -- user photos are data URLs in the prototype */
import { cn } from "@/lib/cn";
import { formatEnglishDate, formatKhmerDate, formatTime } from "@/lib/khmer";
import { getTemplate, templates, type Invitation, type Photo } from "@/lib/mock-data";
import { BlossomCanopy, PAVILION_SKY } from "./PavilionArt";
import { Lotus, headingKm } from "./TemplateArt";

type Props = {
  invitation: Invitation;
  photos?: Photo[];
  /** Compact sizing for the phone frame in the editor. */
  compact?: boolean;
  className?: string;
};

/**
 * The invitation's opening card in its template colours. Always bilingual:
 * Khmer first, English underneath, regardless of the host UI language.
 */
export function InvitationCover({ invitation: inv, photos = [], compact, className }: Props) {
  const template = getTemplate(inv.templateId) ?? templates[0];
  const { bg, fg, accent, ctaFg } = template.theme;
  const cover = photos.find((p) => p.id === inv.coverPhotoId) ?? photos[0];
  const groomShort = inv.groomEn.split(" ").at(-1) || inv.groomEn;
  const brideShort = inv.brideEn.split(" ").at(-1) || inv.brideEn;
  const pavilion = template.theme.decor === "pavilion";

  return (
    <div
      className={cn("relative flex h-full flex-col items-center overflow-y-auto text-center", compact ? "p-6" : "p-8", className)}
      style={{ background: pavilion ? PAVILION_SKY : bg, color: fg }}
    >
      {pavilion && <BlossomCanopy className={cn("absolute inset-x-0 top-0 w-full", compact ? "h-[110px]" : "h-[140px]")} />}
      <div aria-hidden className={cn("pointer-events-none absolute rounded-[20px] border", compact ? "inset-3.5" : "inset-4")} style={{ borderColor: accent }} />
      <div className="relative my-auto flex w-full flex-col items-center py-2">
        {cover ? (
          <img
            src={cover.url}
            alt=""
            className={cn("mb-3 rounded-full border-2 object-cover", compact ? "size-24" : "size-32")}
            style={{ borderColor: accent }}
          />
        ) : (
          <Lotus size={compact ? 36 : 44} color={accent} strokeWidth={1.3} />
        )}
        <div lang="km" className={cn("mt-2 font-moul leading-[1.9]", compact ? "text-[13px]" : "text-base")} style={{ color: accent }}>
          {headingKm(template)}
        </div>
        <div lang="km" className={cn("mt-3 font-semibold break-words", compact ? "text-[17px]" : "text-xl")}>
          {inv.groomKm || "—"} &amp; {inv.brideKm || "—"}
        </div>
        <div lang="en" className={cn("font-serif leading-[1.3] break-words italic", compact ? "text-2xl" : "text-[28px]")}>
          {groomShort || "—"} &amp; {brideShort || "—"}
        </div>
        <div aria-hidden className="my-3.5 h-px w-[70px]" style={{ background: accent }} />
        {inv.eventDate ? (
          <>
            <div lang="km" className={cn("leading-[1.9]", compact ? "text-[13px]" : "text-[15px]")}>{formatKhmerDate(inv.eventDate)}</div>
            <div lang="km" className={compact ? "text-xs" : "text-[13px]"}>{inv.startTime && formatTime(inv.startTime, "km")}</div>
            <div lang="en" className={cn("opacity-85", compact ? "text-[11px]" : "text-xs")}>
              {formatEnglishDate(inv.eventDate)}
              {inv.startTime && ` · ${formatTime(inv.startTime, "en")}`}
            </div>
          </>
        ) : (
          <div className="opacity-60">—</div>
        )}
        {(inv.venueNameKm || inv.venueNameEn) && (
          <>
            <div lang="km" className={cn("mt-3", compact ? "text-[13px]" : "text-sm")}>{inv.venueNameKm}</div>
            <div lang="en" className={cn("opacity-85", compact ? "text-[11px]" : "text-xs")}>{inv.venueNameEn}</div>
          </>
        )}
        <div className="mt-4 flex gap-2 text-xs font-bold">
          <span className="rounded-full px-4 py-1.5" style={{ background: accent, color: ctaFg }}>RSVP</span>
          {inv.giftQrUrl && (
            <span className="rounded-full border px-4 py-1.5" style={{ borderColor: accent }}>
              <span lang="km">ចំណងដៃ</span> · <span lang="en">Gift</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/** Phone-shaped frame for previews. */
export function PhoneFrame({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("h-[600px] w-[300px] shrink-0 rounded-[40px] bg-charcoal p-2.5 shadow-[0_18px_44px_rgba(122,31,43,0.22)]", className)}>
      <div className="h-full overflow-hidden rounded-[31px]">{children}</div>
    </div>
  );
}
