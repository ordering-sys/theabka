"use client";

import Link from "next/link";
import { PinIcon } from "@/components/ui/Icons";
import { useToast } from "@/components/ui/Toast";
import { buildIcs, directionsUrl } from "@/modules/guest/lib/calendar";
import { useContent } from "@/lib/i18n";
import type { Invitation } from "@/lib/mock-data";
import { guestContent } from "@/modules/guest/content";

/** Small client pieces inside the server-rendered invitation (labels follow the KH/EN toggle). */

export function AddToCalendar({ invitation, url }: { invitation: Invitation; url: string }) {
  const c = useContent(guestContent);
  const { showToast } = useToast();
  function download() {
    const blob = new Blob([buildIcs(invitation, url)], { type: "text/calendar;charset=utf-8" });
    const href = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), { href, download: `theabka-${invitation.slug}.ics` });
    a.click();
    // Some browsers start the download asynchronously; revoke afterwards.
    setTimeout(() => URL.revokeObjectURL(href), 1000);
    showToast(c.calDone);
  }
  return (
    <button
      type="button"
      onClick={download}
      className="mx-auto mt-3.5 flex min-h-11 cursor-pointer items-center gap-2 rounded-card border-[1.5px] border-maroon bg-white px-5 text-[13px] font-semibold text-maroon hover:bg-sand-light"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M3 10h18M8 3v4M16 3v4M12 13v5M9.5 15.5h5" />
      </svg>
      {c.cal}
    </button>
  );
}

export function DirectionsLink({ invitation }: { invitation: Invitation }) {
  const c = useContent(guestContent);
  return (
    <a
      href={directionsUrl(invitation)}
      target="_blank"
      rel="noreferrer"
      className="mt-2.5 flex min-h-[46px] items-center justify-center gap-2 rounded-card bg-maroon px-5 text-[15px] font-semibold text-white no-underline hover:bg-maroon-dark"
    >
      <PinIcon size={18} />
      {c.directions}
    </a>
  );
}

export function MadeWith() {
  const c = useContent(guestContent);
  return (
    <div className="px-4 pt-[22px] pb-2 text-center text-xs text-muted">
      {c.madeWith}{" "}
      <Link href="/" className="text-maroon no-underline">
        <span lang="km" className="font-moul">ធៀបការ</span> <span lang="en">TheabKa</span>
      </Link>
    </div>
  );
}
