"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

type ToastContextValue = { showToast: (message: string) => void };

const ToastContext = createContext<ToastContextValue | null>(null);

const DURATION_MS = 2200;

/** One toast at a time, dark pill at the bottom, matching the prototypes. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const showToast = useCallback((message: string) => {
    clearTimeout(timer.current);
    setToast({ id: Date.now(), message });
    timer.current = setTimeout(() => setToast(null), DURATION_MS);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div aria-live="polite" role="status" className="pointer-events-none fixed inset-x-4 bottom-6 z-50 flex justify-center">
        {toast && (
          <div
            key={toast.id}
            className="flex w-full max-w-[420px] items-center gap-2 rounded-card bg-charcoal px-3.5 py-3 text-sm text-white animate-toast"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-jade-light" stroke="currentColor" strokeWidth="2.4" aria-hidden>
              <path d="M5 12l5 5 9-10" />
            </svg>
            {toast.message}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
