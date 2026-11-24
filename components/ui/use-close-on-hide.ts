"use client";

import { useLayoutEffect, useRef, type RefObject } from "react";

/**
 * Closes a modal <dialog> when its route is hidden.
 *
 * With `cacheComponents`, Next.js keeps recently visited routes mounted inside a
 * hidden React <Activity> instead of unmounting them. A dialog opened with
 * showModal() would then stay open in the hidden page and make the *new* page
 * inert (nothing clickable until a reload). Activity runs layout-effect cleanups
 * when it hides a tree, so we close the dialog there.
 * See node_modules/next/dist/docs/01-app/02-guides/preserving-ui-state.md.
 */
export function useCloseOnHide(ref: RefObject<HTMLDialogElement | null>, onHide?: () => void) {
  const onHideRef = useRef(onHide);
  useLayoutEffect(() => {
    onHideRef.current = onHide;
  });
  useLayoutEffect(() => {
    const dialog = ref.current;
    return () => {
      if (dialog?.open) dialog.close();
      onHideRef.current?.();
    };
  }, [ref]);
}
