/* eslint-disable @next/next/no-img-element -- sample photos are SVGs; real ones come from Supabase Storage */
import { Lotus, headingKm } from "@/components/invitation/TemplateArt";
import { JasmineDivider, KbachCorners } from "@/components/invitation/Kbach";
import { PinIcon } from "@/components/ui/Icons";
import { cn } from "@/lib/cn";
import { formatEnglishDate, formatKhmerDate, formatTime, toKhmerNumerals } from "@/lib/khmer";
import type { Invitation, Photo, Template } from "@/lib/mock-data";
import { guestNameEn, guestNameKm, type InvitedGuest } from "@/modules/guest/lib/greeting";
import { AddToCalendar, DirectionsLink, MadeWith } from "./islands";
import { GuestReveal, GuestStagger, GuestStaggerItem } from "./reveal";

/** `guest`: set on a personal link (/i/<slug>/<code>, Premium); the card greets them by name. */
type Props = { invitation: Invitation; photos: Photo[]; template: Template; url: string; guest?: InvitedGuest };

const INVITE_TEXT = {
  wedding: {
    km: "យើងខ្ញុំមានកិត្តិយសសូមគោរពអញ្ជើញ ឯកឧត្តម លោកជំទាវ លោក លោកស្រី អ្នកនាង កញ្ញា អញ្ជើញចូលរួមពិធីអាពាហ៍ពិពាហ៍ កូនប្រុស និងកូនស្រី របស់យើងខ្ញុំ",
    en: "Together with their families, we joyfully invite you to the wedding of",
  },
  engagement: {
    km: "យើងខ្ញុំមានកិត្តិយសសូមគោរពអញ្ជើញ ឯកឧត្តម លោកជំទាវ លោក លោកស្រី អ្នកនាង កញ្ញា អញ្ជើញចូលរួមពិធីភ្ជាប់ពាក្យ កូនប្រុស និងកូនស្រី របស់យើងខ្ញុំ",
    en: "Together with their families, we joyfully invite you to the engagement of",
  },
};

/** Section heading: Khmer in Moul over English in Playfair, framed by short ornament lines. */
function SectionTitle({ km, en, accent }: { km: string; en: string; accent: string }) {
  const line = { background: `linear-gradient(to right, transparent, ${accent})` };
  return (
    <h2 className="mb-4 flex items-center justify-center gap-3 text-center">
      <span aria-hidden className="h-px w-10" style={line} />
      <span className="flex flex-col">
        <span lang="km" className="font-moul text-base leading-[1.9] text-maroon">{km}</span>
        <span lang="en" className="font-serif text-[13px] text-muted italic">{en}</span>
      </span>
      <span aria-hidden className="h-px w-10 -scale-x-100" style={line} />
    </h2>
  );
}

export function InvitationBody({ invitation: inv, photos, template, url, guest }: Props) {
  const { bg, fg, accent } = template.theme;
  const cover = photos.find((p) => p.id === inv.coverPhotoId) ?? photos[0];
  const text = INVITE_TEXT[template.eventType];
  const short = (full: string) => full.split(" ").at(-1) || full;
  const timeEn = inv.startTime ? ` · ${formatTime(inv.startTime, "en")}` : "";
  // Gallery: the cover leads, the rest follow.
  const gallery = cover ? [cover, ...photos.filter((p) => p.id !== cover.id)] : photos;

  return (
    <div className="pb-28">
      {/* Cover */}
      <section className="relative flex h-[580px] items-end overflow-hidden" style={{ background: bg }}>
        {cover && (
          <GuestReveal onMount variant="zoomOut" className="absolute inset-0">
            <img src={cover.url} alt="" className="size-full object-cover" />
          </GuestReveal>
        )}
        {/* Thin frame in the template accent, inset from the edges. */}
        <div aria-hidden className="pointer-events-none absolute inset-3 rounded-[18px] border opacity-70" style={{ borderColor: cover ? "var(--color-gold-light)" : accent }} />

        {/* Names rise in as the doors finish opening. */}
        <GuestStagger
          onMount
          delay={0.55}
          stagger={0.14}
          className="relative w-full px-6 pt-28 pb-12 text-center"
          style={{
            color: cover ? "var(--color-ivory)" : fg,
            background: cover ? "linear-gradient(to top, rgba(40,10,14,0.9) 10%, rgba(40,10,14,0.55) 60%, rgba(40,10,14,0))" : undefined,
          }}
        >
          <GuestStaggerItem className="flex justify-center">
            <Lotus size={30} color={cover ? "var(--color-gold-light)" : accent} strokeWidth={1.3} />
          </GuestStaggerItem>
          <GuestStaggerItem lang="km" className="mt-1 font-moul text-[15px] leading-[1.9]" style={{ color: cover ? "var(--color-gold-light)" : accent }}>
            {headingKm(template)}
          </GuestStaggerItem>
          <GuestStaggerItem lang="km" className="mt-2 text-lg leading-[1.8] font-semibold">
            {inv.groomKm} &amp; {inv.brideKm}
          </GuestStaggerItem>
          <GuestStaggerItem as="h1" lang="en" className="font-serif text-[38px] leading-[1.15] italic">
            {short(inv.groomEn)} &amp; {short(inv.brideEn)}
          </GuestStaggerItem>
          <GuestStaggerItem>
            <div aria-hidden className="mx-auto my-3.5 h-px w-16" style={{ background: cover ? "var(--color-gold-light)" : accent }} />
            <div lang="km" className="text-sm leading-[1.8]">{formatKhmerDate(inv.eventDate)}</div>
            <div lang="en" className="text-xs opacity-80">{formatEnglishDate(inv.eventDate)}</div>
          </GuestStaggerItem>
        </GuestStagger>

        {/* Scroll cue */}
        <span aria-hidden className="absolute bottom-9 left-1/2 flex -translate-x-1/2 motion-safe:animate-bounce" style={{ color: cover ? "var(--color-gold-light)" : accent }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
      </section>

      {/* Invitation card */}
      <GuestReveal
        as="section"
        delay={0.4}
        className="relative mx-4 -mt-6 rounded-[18px] bg-white px-[22px] pt-10 pb-8 text-center shadow-lift ring-1"
        style={{ ["--tw-ring-color" as string]: `${accent}40` }}
      >
        <KbachCorners color={accent} />
        <div className="flex justify-center"><Lotus size={40} color={accent} strokeWidth={1.2} /></div>
        {guest && (
          // Personal link (Premium): who this invitation is for.
          <div className="mx-auto mt-3 max-w-75 rounded-card px-4 py-3" style={{ background: `${accent}14` }}>
            <p lang="km" className="text-xs leading-[1.7] text-muted">សូមគោរពអញ្ជើញ</p>
            <p lang="km" className="font-moul text-base leading-[1.9]" style={{ color: accent }}>{guestNameKm(guest)}</p>
            <p lang="en" className="font-serif text-sm text-ink-soft italic">Dear {guestNameEn(guest)}</p>
          </div>
        )}
        <p lang="km" className="mt-3 text-sm leading-[1.9] text-ink-soft">{text.km}</p>
        <p lang="en" className="mt-1.5 font-serif text-sm text-muted italic">{text.en}</p>

        {/* Groom | & | Bride */}
        <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-start gap-2">
          {(["groom", "bride"] as const).map((who, idx) => {
            const p = inv.parents[who];
            const isGroom = who === "groom";
            const side = (
              <div key={who} className="min-w-0">
                <div className="text-[11px] tracking-wide text-muted">
                  <span lang="km">{isGroom ? "កូនកំលោះ" : "កូនក្រមុំ"}</span> · <span lang="en">{isGroom ? "Groom" : "Bride"}</span>
                </div>
                <div lang="km" className="mt-0.5 font-moul text-[17px] leading-[1.9] text-maroon">{isGroom ? inv.groomKm : inv.brideKm}</div>
                <div lang="en" className="font-serif text-base italic">{isGroom ? inv.groomEn : inv.brideEn}</div>
                {(p.fatherKm || p.motherKm || p.fatherEn || p.motherEn) && (
                  <div className="mt-2.5 rounded-xl bg-ivory px-2 py-2 text-xs text-muted">
                    <span lang="km">{isGroom ? "កូនប្រុសរបស់" : "កូនស្រីរបស់"}</span> · <span lang="en">{isGroom ? "Son of" : "Daughter of"}</span>
                    {p.fatherKm && <div lang="km" className="text-ink-soft">{p.fatherKm}</div>}
                    {p.motherKm && <div lang="km" className="text-ink-soft">{p.motherKm}</div>}
                    {(p.fatherEn || p.motherEn) && (
                      <div lang="en" className="mt-0.5">{[p.fatherEn, p.motherEn].filter(Boolean).join(" & ")}</div>
                    )}
                  </div>
                )}
              </div>
            );
            return idx === 0 ? (
              [
                side,
                <div key="amp" aria-hidden className="flex flex-col items-center gap-1.5 self-stretch pt-6">
                  <span className="font-serif text-2xl italic" style={{ color: accent }}>&amp;</span>
                  <span className="w-px grow" style={{ background: `linear-gradient(to bottom, ${accent}, transparent)` }} />
                </div>,
              ]
            ) : side;
          })}
        </div>

        <JasmineDivider color={accent} className="mt-7 mb-4" />
        <div lang="km" className="text-lg leading-[1.9] font-semibold text-maroon">{formatKhmerDate(inv.eventDate)}</div>
        {inv.startTime && <div lang="km" className="text-sm text-ink-soft">{formatTime(inv.startTime, "km")}</div>}
        <div lang="en" className="text-[13px] text-muted">{formatEnglishDate(inv.eventDate)}{timeEn}</div>
        <AddToCalendar invitation={inv} url={url} />
      </GuestReveal>

      {/* Schedule */}
      {inv.schedule.length > 0 && (
        <GuestReveal as="section" className="mx-4 mt-5 rounded-[18px] bg-white px-5 pt-6 pb-3 shadow-card">
          <SectionTitle km="កម្មវិធី" en="Schedule" accent={accent} />
          <GuestStagger as="ol" stagger={0.1} delay={0.2}>
            {inv.schedule.map((ev, i) => (
              <GuestStaggerItem as="li" key={ev.id ?? i} className="flex gap-3.5">
                <div aria-hidden className="flex w-4 flex-col items-center">
                  <span className="mt-1 flex size-4 items-center justify-center rounded-full border-2 border-gold-soft bg-white">
                    <span className="size-1.5 rounded-full bg-gold" />
                  </span>
                  <span className={cn("w-px grow", i < inv.schedule.length - 1 && "bg-line-strong")} />
                </div>
                <div className="min-w-0 pb-5">
                  {ev.time && (
                    <div className="inline-flex rounded-full bg-gold-soft px-2.5 py-0.5 text-xs font-bold text-maroon">
                      <span lang="km">{formatTime(ev.time, "km")}</span>&nbsp;·&nbsp;<span lang="en">{formatTime(ev.time, "en")}</span>
                    </div>
                  )}
                  <div lang="km" className="mt-1 text-[15px] font-semibold">{ev.titleKm}</div>
                  <div lang="en" className="text-[13px] text-muted">{ev.titleEn}</div>
                </div>
              </GuestStaggerItem>
            ))}
          </GuestStagger>
        </GuestReveal>
      )}

      {/* Gallery: first photo large, the rest in a 3-column grid. */}
      {gallery.length > 0 && (
        <section className="mt-7">
          <GuestReveal>
            <SectionTitle km="រូបភាពអនុស្សាវរីយ៍" en="Gallery" accent={accent} />
          </GuestReveal>
          <GuestStagger as="ul" stagger={0.08} className="grid grid-cols-3 gap-2 px-4">
            {gallery.map((p, i) => (
              <GuestStaggerItem as="li" variant="popIn" key={p.id} className={cn(i === 0 && "col-span-2 row-span-2")}>
                <img
                  src={p.url}
                  alt={`រូបថតទី${toKhmerNumerals(i + 1)} · Photo ${i + 1}`}
                  loading="lazy"
                  className="size-full min-h-full rounded-xl object-cover shadow-card ring-1 ring-black/5"
                  style={{ aspectRatio: i === 0 ? undefined : "3 / 4" }}
                />
              </GuestStaggerItem>
            ))}
          </GuestStagger>
        </section>
      )}

      {/* Venue */}
      <section className="mt-7">
        <GuestReveal>
          <SectionTitle km="ទីកន្លែង" en="Venue" accent={accent} />
        </GuestReveal>
        <GuestReveal className="mx-4 overflow-hidden rounded-[18px] bg-white shadow-card">
          <div aria-hidden className="relative h-[160px] overflow-hidden bg-map-land">
            <span className="absolute -inset-x-5 top-[64px] h-[34px] -rotate-12 bg-map-road" />
            <span className="absolute inset-y-0 left-[60px] w-2.5 bg-white" />
            <span className="absolute inset-x-0 top-[126px] h-2 bg-white" />
            {/* Pin with a soft pulse ring. */}
            <span className="absolute top-[42px] left-1/2 -translate-x-1/2">
              <span className="absolute top-[26px] left-1/2 size-8 -translate-x-1/2 rounded-full bg-maroon/25 motion-safe:animate-ping" />
              <span className="relative text-maroon">
                <PinIcon size={36} fill="currentColor" stroke="white" strokeWidth={1.2} />
              </span>
            </span>
          </div>
          <div className="flex flex-col gap-0.5 px-5 py-4">
            <div lang="km" className="text-base font-bold">{inv.venueNameKm}</div>
            <div lang="en" className="text-sm">{inv.venueNameEn}</div>
            <div className="mt-1 text-[13px] text-muted">
              <span lang="km">{inv.venueAddressKm}</span>
              {inv.venueAddressKm && inv.venueAddressEn && " · "}
              <span lang="en">{inv.venueAddressEn}</span>
            </div>
            <DirectionsLink invitation={inv} />
          </div>
        </GuestReveal>
      </section>

      <MadeWith />
    </div>
  );
}
