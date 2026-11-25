"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Whether the host chose to hide the gift ledger's money totals (cover, page totals and the
 * dashboard's Gifts tab), e.g. while someone else holds the phone at the gift table.
 * Remembered on this device and shared by every screen that shows the totals.
 */
const KEY = "theabka.giftTotalsHidden";
const EVENT = "theabka:gift-totals-hidden";
// Used when storage is blocked, so the switch still works for this visit.
let memory = false;

function read(): boolean {
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return memory;
  }
}

function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener(EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(EVENT, cb);
  };
}

export function useGiftTotalsHidden(): [boolean, (hidden: boolean) => void] {
  const hidden = useSyncExternalStore(subscribe, read, () => false);
  const setHidden = useCallback((next: boolean) => {
    memory = next;
    try {
      if (next) window.localStorage.setItem(KEY, "1");
      else window.localStorage.removeItem(KEY);
    } catch {
      // Storage blocked: `memory` keeps the choice for this visit.
    }
    window.dispatchEvent(new Event(EVENT));
  }, []);
  return [hidden, setHidden];
}
