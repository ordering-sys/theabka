import Link from "next/link";
import { Lotus } from "@/components/invitation/TemplateArt";
import { Reveal } from "@/components/motion/Motion";
import { formatEnglishDate, formatKhmerDate } from "@/lib/khmer";
import type { EndedInvitation } from "@/lib/data/server";

/**
 * Shown on a guest link after the invitation's online period (data retention).
 * Same frame as InvitationNotFound. Both languages: guests may read only one.
 */
export function InvitationEnded({ invitation: inv }: { invitation: EndedInvitation }) {
  return (
    <main className="relative flex min-h-dvh items-center justify-center bg-maroon p-6 text-center text-ivory">
      <div aria-hidden className="pointer-events-none absolute inset-4 rounded-[20px] border border-gold" />
      <Reveal onMount className="relative flex max-w-[360px] flex-col items-center gap-3">
        <Reveal onMount variant="popIn" delay={0.2}>
          <Lotus size={44} color="var(--color-gold)" />
        </Reveal>
        <p>
          <span lang="km" className="block font-moul text-lg leading-[1.9] text-gold-light">
            {inv.groomKm} & {inv.brideKm}
          </span>
          <span lang="en" className="block font-serif text-lg italic">
            {inv.groomEn} & {inv.brideEn}
          </span>
        </p>
        {inv.eventDate && (
          <p className="text-sm">
            <span lang="km" className="block leading-[1.7]">{formatKhmerDate(inv.eventDate)}</span>
            <span lang="en" className="block text-xs opacity-80">{formatEnglishDate(inv.eventDate)}</span>
          </p>
        )}
        <h1 className="mt-2">
          <span lang="km" className="block text-xl leading-[1.8] font-bold text-gold-light">ធៀបការនេះបានបញ្ចប់ហើយ</span>
          <span lang="en" className="mt-1 block font-serif text-lg italic">This invitation has ended.</span>
        </h1>
        <p className="text-sm opacity-90">
          <span lang="km" className="block leading-[1.7]">សូមអរគុណដែលបានចូលរួមអបអរ។ ទំព័រនេះលែងបង្ហាញព័ត៌មានកម្មវិធីទៀតហើយ។</span>
          <span lang="en" className="mt-1 block">Thank you for celebrating with the couple. This page no longer shows the event details.</span>
        </p>
        <Link href="/" className="mt-2 flex min-h-12 items-center rounded-card bg-gold px-5 font-semibold text-charcoal no-underline hover:bg-gold-light">
          <span lang="km">ទៅទំព័រដើម</span>&nbsp;·&nbsp;<span lang="en">Go to TheabKa</span>
        </Link>
      </Reveal>
    </main>
  );
}
