"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { saveDraft, type Draft } from "@/lib/store";

export type SaveStatus = "saved" | "saving" | "error";

const DEBOUNCE_MS = 600;

export const newId = (prefix: string) => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

/** Schedule rows need stable keys so focus doesn't jump when one is removed. */
function withScheduleIds(d: Draft): Draft {
  return d.schedule.every((ev) => ev.id) ? d : { ...d, schedule: d.schedule.map((ev) => ({ ...ev, id: ev.id ?? newId("ev") })) };
}

/**
 * Editor state with debounced autosave (Supabase or localStorage).
 * Saves run one at a time in order; edits made during a save are saved next.
 */
export function useDraft(initial: Draft) {
  const [draft, setDraft] = useState(() => withScheduleIds(initial));
  const [status, setStatus] = useState<SaveStatus>("saved");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const latest = useRef(draft);
  const dirty = useRef(false);
  const queue = useRef<Promise<unknown>>(Promise.resolve());

  useEffect(() => {
    latest.current = draft;
  }, [draft]);

  const flush = useCallback(() => {
    clearTimeout(timer.current);
    if (!dirty.current) return queue.current;
    dirty.current = false;
    const snapshot = latest.current;
    queue.current = queue.current.then(async () => {
      const ok = await saveDraft(snapshot).catch(() => false);
      // Failed: stay dirty so the next change, pagehide or unmount retries it.
      if (!ok) dirty.current = true;
      setStatus(!ok ? "error" : dirty.current ? "saving" : "saved");
    });
    return queue.current;
  }, []);

  const update = useCallback(
    (patch: Partial<Draft> | ((d: Draft) => Partial<Draft>)) => {
      setDraft((d) => ({ ...d, ...(typeof patch === "function" ? patch(d) : patch) }));
      dirty.current = true;
      setStatus("saving");
      clearTimeout(timer.current);
      timer.current = setTimeout(flush, DEBOUNCE_MS);
    },
    [flush],
  );

  // Save pending edits if the tab closes or the editor unmounts.
  useEffect(() => {
    const onHide = () => void flush();
    window.addEventListener("pagehide", onHide);
    return () => {
      window.removeEventListener("pagehide", onHide);
      void flush();
    };
  }, [flush]);

  return { draft, update, status, flush };
}
