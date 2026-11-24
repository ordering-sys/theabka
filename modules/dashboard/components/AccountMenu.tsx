"use client";

import { useContent } from "@/lib/i18n";
import { signOut as storeSignOut, type Session } from "@/lib/store";
import { dashboardContent } from "@/modules/dashboard/content";

/** Avatar button with the host's name/email and "Sign out". Used in every host navbar. */
export function AccountMenu({ session }: { session: Session }) {
  const c = useContent(dashboardContent);
  const avatar = (session.name || session.email || "?").charAt(0).toUpperCase();

  async function signOut() {
    await storeSignOut();
    // Full reload so no page kept alive by navigation still holds this user's data.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/";
  }

  return (
    <details className="relative">
      <summary aria-label={c.account} className="flex size-11 cursor-pointer list-none items-center justify-center rounded-full [&::-webkit-details-marker]:hidden">
        <span aria-hidden className="flex size-9 items-center justify-center rounded-full bg-gold text-sm font-bold text-charcoal ring-2 ring-white">
          {avatar}
        </span>
      </summary>
      <div className="absolute right-0 z-20 mt-1 min-w-52 rounded-card bg-white p-1.5 shadow-card ring-1 ring-line">
        <div className="px-3 pt-2 pb-1">
          {session.name && <div className="truncate text-sm font-semibold">{session.name}</div>}
          <div lang="en" className="truncate text-xs text-muted">{session.email ?? "Google"}</div>
        </div>
        <div aria-hidden className="my-1 h-px bg-line" />
        <button type="button" onClick={signOut} className="flex min-h-11 w-full cursor-pointer items-center rounded-lg px-3 text-left text-sm font-semibold text-maroon hover:bg-sand-light">
          {c.signOut}
        </button>
      </div>
    </details>
  );
}
