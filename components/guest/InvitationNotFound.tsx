import Link from "next/link";
import { Lotus } from "@/components/invitation/TemplateArt";

/** 404 for guest links (States.dc.html). Both languages: guests may read only one. */
export function InvitationNotFound() {
  return (
    <main className="relative flex min-h-dvh items-center justify-center bg-maroon p-6 text-center text-ivory">
      <div aria-hidden className="pointer-events-none absolute inset-4 rounded-[20px] border border-gold" />
      <div className="relative flex max-w-[360px] flex-col items-center gap-3">
        <Lotus size={44} color="var(--color-gold)" />
        <div aria-hidden className="font-serif text-6xl text-gold-light italic">404</div>
        <h1>
          <span lang="km" className="block font-moul text-xl leading-[1.9] font-normal text-gold-light">រកមិនឃើញធៀបការនេះទេ</span>
          <span lang="en" className="mt-1 block font-serif text-lg italic">We couldn&apos;t find this invitation.</span>
        </h1>
        <p className="text-sm opacity-90">
          <span lang="km" className="block">តំណនេះប្រហែលជាវាយខុស ឬម្ចាស់កម្មវិធីបានដកវាចេញ។ សូមសួរអ្នកដែលបានផ្ញើវាមក។</span>
          <span lang="en" className="mt-1 block">The link may be mistyped, or the hosts may have taken it down. Please check with the person who sent it.</span>
        </p>
        <Link href="/" className="mt-2 flex min-h-12 items-center rounded-card bg-gold px-5 font-semibold text-charcoal no-underline hover:bg-gold-light">
          <span lang="km">ទៅទំព័រដើម</span>&nbsp;·&nbsp;<span lang="en">Go to TheabKa</span>
        </Link>
      </div>
    </main>
  );
}
