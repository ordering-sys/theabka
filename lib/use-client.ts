"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

/** True only in the browser, after hydration. Use before reading localStorage-backed mock data. */
export function useIsClient() {
  return useSyncExternalStore(noop, () => true, () => false);
}

/** The public link for an invitation on this deployment. */
export function inviteUrl(slug: string) {
  const origin = typeof window === "undefined" ? (process.env.NEXT_PUBLIC_SITE_URL ?? "") : window.location.origin;
  return `${origin}/i/${slug}`;
}
