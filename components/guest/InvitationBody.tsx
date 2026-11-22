/* eslint-disable @next/next/no-img-element -- sample photos are SVGs; real ones come from Supabase Storage */
import { Lotus, headingKm } from "@/components/invitation/TemplateArt";
import { JasmineDivider, KbachCorners } from "@/components/invitation/Kbach";
import { PinIcon } from "@/components/ui/Icons";
import { formatEnglishDate, formatKhmerDate, formatTime, toKhmerNumerals } from "@/lib/khmer";
import type { Invitation, Photo, Template } from "@/lib/mock-data";
import { AddToCalendar, DirectionsLink, MadeWith } from "./islands";

type Props = { invitation: Invitation; photos: Photo[]; template: Template; url: string };

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

/** Section heading: Khmer in Moul, English beside it in Playfair. */
function SectionTitle({ km, en }: { km: string; en: string }) {
  return (
    <h2 className="mb-3.5 text-center text-base leading-[1.9] text-maroon">
      <span lang="km" className="font-moul">{km}</span>{" "}
      <span lang="en" className="font-serif text-muted italic">· {en}</span>
    </h2>
  );
}

export function InvitationBody({ invitation: inv, photos, template, url }: Props) {
  const { bg, fg, accent } = template.theme;
  const cover = photos.find((p) => p.id === inv.coverPhotoId) ?? photos[0];
  const text = INVITE_TEXT[template.eventType];
  const short = (full: string) => full.split(" ").at(-1) || full;
  const timeEn = inv.startTime ? ` · ${formatTime(inv.startTime, "en")}` : "";

  return (
    <div className="pb-28">
      {/* Cover */}
      <section className="relative flex h-[520px] items-end overflow-hidden" style={{ background: bg }}>
        {cover && <img src={cover.url} alt="" className="absolute inset-0 size-full object-cover" />}
        <div
          className="relative w-full px-5 pt-20 pb-7 text-center"
          style={{
            color: cover ? "var(--color-ivory)" : fg,
            background: cover ? "linear-gradient(to top, rgba(40,10,14,0.85), rgba(40,10,14,0))" : undefined,
          }}
        >
          <div lang="km" className="font-moul text-[15px] leading-[1.9]" style={{ color: cover ? "var(--color-gold-light)" : accent }}>
            {headingKm(template)}
          </div>
          <h1 lang="en" className="mt-1 font-serif text-[34px] leading-[1.2] italic">
            {short(inv.groomEn)} &amp; {short(inv.brideEn)}
          </h1>
          <div lang="km" className="mt-1.5 text-sm">{formatKhmerDate(inv.eventDate)}</div>
        </div>
      </section>

      {/* Invitation card */}
      <section className="relative mx-4 mt-5 rounded-card bg-white px-[22px] py-[34px] text-center shadow-card">
        <KbachCorners color={accent} />
        <div className="flex justify-center"><Lotus size={40} color={accent} strokeWidth={1.2} /></div>
        <p lang="km" className="mt-2.5 text-sm leading-[1.9] text-ink-soft">{text.km}</p>
        <p lang="en" className="mt-1.5 font-serif text-sm text-muted italic">{text.en}</p>

        <div className="mt-5 grid grid-cols-2 gap-3">
          {(["groom", "bride"] as const).map((who) => {
            const p = inv.parents[who];
            const isGroom = who === "groom";
            return (
              <div key={who}>
                <div className="text-xs text-muted">
                  <span lang="km">{isGroom ? "កូនកំលោះ" : "កូនក្រមុំ"}</span> · <span lang="en">{isGroom ? "Groom" : "Bride"}</span>
                </div>
                <div lang="km" className="font-moul text-[17px] leading-[1.9] text-maroon">{isGroom ? inv.groomKm : inv.brideKm}</div>
                <div lang="en" className="font-serif text-base">{isGroom ? inv.groomEn : inv.brideEn}</div>
                {(p.fatherKm || p.motherKm || p.fatherEn || p.motherEn) && (
                  <div className="mt-1.5 text-xs text-muted">
                    <span lang="km">{isGroom ? "កូនប្រុសរបស់" : "កូនស្រីរបស់"}</span> · <span lang="en">{isGroom ? "Son of" : "Daughter of"}</span>
                    {p.fatherKm && <div lang="km">{p.fatherKm}</div>}
                    {p.motherKm && <div lang="km">{p.motherKm}</div>}
                    {(p.fatherEn || p.motherEn) && (
                      <div lang="en" className="mt-0.5">{[p.fatherEn, p.motherEn].filter(Boolean).join(" & ")}</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <JasmineDivider color={accent} className="mt-[22px] mb-3.5" />
        <div lang="km" className="text-lg leading-[1.9] font-semibold text-maroon">{formatKhmerDate(inv.eventDate)}</div>
        {inv.startTime && <div lang="km" className="text-sm text-ink-soft">{formatTime(inv.startTime, "km")}</div>}
        <div lang="en" className="text-[13px] text-muted">{formatEnglishDate(inv.eventDate)}{timeEn}</div>
        <AddToCalendar invitation={inv} url={url} />
      </section>

      {/* Schedule */}
      {inv.schedule.length > 0 && (
        <section className="mx-4 mt-4 rounded-card bg-white p-5 shadow-card">
          <SectionTitle km="កម្មវិធី" en="Schedule" />
          <ol>
            {inv.schedule.map((ev, i) => (
              <li key={ev.id ?? i} className="flex gap-3.5">
                <div aria-hidden className="flex w-3.5 flex-col items-center">
                  <span className="mt-1.5 size-3 rounded-full border-2 border-gold-soft bg-gold" />
                  <span className={i < inv.schedule.length - 1 ? "w-0.5 grow bg-line" : "w-0.5 grow"} />
                </div>
                <div className="pb-4">
                  {ev.time && (
                    <div className="text-[13px] font-bold text-maroon">
                      <span lang="km">{formatTime(ev.time, "km")}</span> · <span lang="en">{formatTime(ev.time, "en")}</span>
                    </div>
                  )}
                  <div lang="km" className="text-[15px] font-semibold">{ev.titleKm}</div>
                  <div lang="en" className="text-[13px] text-muted">{ev.titleEn}</div>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Gallery */}
      {photos.length > 0 && (
        <section className="mt-4">
          <SectionTitle km="រូបភាពអនុស្សាវរីយ៍" en="Gallery" />
          <ul className="grid grid-cols-3 gap-1.5 px-4">
            {photos.map((p, i) => (
              <li key={p.id}>
                <img src={p.url} alt={`រូបថតទី${toKhmerNumerals(i + 1)} · Photo ${i + 1}`} loading="lazy" className="aspect-[3/4] w-full rounded-lg object-cover" />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Venue */}
      <section className="mx-4 mt-4 overflow-hidden rounded-card bg-white shadow-card">
        <div aria-hidden className="relative h-[150px] overflow-hidden bg-[#e8e4d8]">
          <span className="absolute -inset-x-5 top-[60px] h-[34px] -rotate-12 bg-[#b9d3dc]" />
          <span className="absolute inset-y-0 left-[60px] w-2.5 bg-white" />
          <span className="absolute inset-x-0 top-[118px] h-2 bg-white" />
          <span className="absolute top-[38px] left-1/2 -translate-x-1/2 text-maroon">
            <PinIcon size={34} fill="currentColor" stroke="white" strokeWidth={1.2} />
          </span>
        </div>
        <div className="flex flex-col gap-0.5 px-4 py-3.5">
          <div className="text-xs text-muted">
            <span lang="km">ទីកន្លែង</span> · <span lang="en">Venue</span>
          </div>
          <div lang="km" className="text-base font-bold">{inv.venueNameKm}</div>
          <div lang="en" className="text-sm">{inv.venueNameEn}</div>
          <div className="text-[13px] text-muted">
            <span lang="km">{inv.venueAddressKm}</span>
            {inv.venueAddressKm && inv.venueAddressEn && " · "}
            <span lang="en">{inv.venueAddressEn}</span>
          </div>
          <DirectionsLink invitation={inv} />
        </div>
      </section>

      <MadeWith />
    </div>
  );
}
