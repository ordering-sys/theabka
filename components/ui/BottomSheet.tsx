"use client";

import { motion, useAnimate, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef } from "react";
import { cn } from "@/lib/cn";

type BottomSheetProps = {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  /** Accessible name when there's no visible title. */
  label?: string;
  /** Accessible label for the close button, in the page's language. */
  closeLabel?: string;
  children: React.ReactNode;
  className?: string;
};

/**
 * Modal sheet that slides up from the bottom. Built on <dialog> so focus
 * trapping, Escape-to-close and the top layer come from the browser.
 * The panel springs in, and slides back down before the dialog closes.
 */
export function BottomSheet({
  open, onClose, title, label, closeLabel = "Close", children, className,
}: BottomSheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const [panel, animate] = useAnimate<HTMLDivElement>();
  const reduced = useReducedMotion();
  // dialog.close() fires "close" later, as a task. Only report closes while we still think we're open,
  // so switching from one sheet to another doesn't close the new one.
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  }, [open]);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || !panel.current) return;
    if (open && !dialog.open) {
      dialog.showModal();
      if (reduced) animate(panel.current, { y: "0%" }, { duration: 0 });
      else animate(panel.current, { y: ["100%", "0%"] }, { type: "spring", stiffness: 380, damping: 36 });
    }
    if (!open && dialog.open) {
      animate(panel.current, { y: "100%" }, { duration: reduced ? 0 : 0.22, ease: [0.4, 0, 1, 1] }).then(() => {
        // Re-opened while sliding away: keep it open.
        if (!openRef.current) dialog.close();
      });
    }
  }, [open, animate, panel, reduced]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={title ? titleId : undefined}
      aria-label={title ? undefined : label}
      onCancel={(e) => {
        // Escape: let the panel slide away first (the effect above closes the dialog).
        e.preventDefault();
        onClose();
      }}
      onClose={() => {
        if (openRef.current) onClose();
      }}
      onClick={(e) => {
        // Click on the backdrop (the dialog itself, outside the panel) closes it.
        if (e.target === e.currentTarget) onClose();
      }}
      className={cn(
        "m-0 mt-auto w-full max-w-none overflow-hidden bg-transparent p-0 backdrop:bg-scrim backdrop:animate-fade-in",
        "sm:mx-auto sm:max-w-[480px]",
      )}
    >
      <motion.div
        ref={panel}
        style={{ y: "100%" }}
        className={cn(
          "max-h-[90dvh] overflow-y-auto rounded-t-[22px] bg-white px-5 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-sheet",
          className,
        )}
      >
        <div aria-hidden className="mx-auto mb-3 h-1 w-10 rounded-full bg-line-strong" />
        <div className="mb-3 flex items-center justify-between gap-3">
          {title ? (
            <h2 id={titleId} className="text-lg font-bold">
              {title}
            </h2>
          ) : (
            <span />
          )}
          <motion.button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            whileTap={{ scale: 0.9, rotate: -90 }}
            className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-sand-light text-charcoal"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </motion.button>
        </div>
        {children}
      </motion.div>
    </dialog>
  );
}
