"use client";

import { useEffect, useRef } from "react";
import { CloseIcon } from "@/components/ui/Icons";
import { useCloseOnHide } from "@/components/ui/use-close-on-hide";
import type { Invitation, Photo } from "@/lib/mock-data";
import { InvitationCover } from "./InvitationCover";

/** Full-screen invitation preview for hosts (editor and pay screens). */
export function PreviewDialog({
  open, onClose, invitation, photos, label, closeLabel,
}: { open: boolean; onClose: () => void; invitation: Invitation; photos: Photo[]; label: string; closeLabel: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  useCloseOnHide(ref);

  return (
    <dialog ref={ref} onClose={onClose} aria-label={label} className="m-0 h-dvh max-h-none w-full max-w-none bg-transparent p-0 backdrop:bg-scrim">
      {open && (
        <div className="relative mx-auto h-full max-w-[480px] animate-sheet-up">
          <InvitationCover invitation={invitation} photos={photos} />
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="absolute top-3 left-3 flex size-11 cursor-pointer items-center justify-center rounded-full bg-charcoal/60 text-white"
          >
            <CloseIcon />
          </button>
        </div>
      )}
    </dialog>
  );
}
