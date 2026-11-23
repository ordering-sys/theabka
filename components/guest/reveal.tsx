"use client";

import { createContext, useContext } from "react";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/Motion";

/**
 * True once the guest taps the doors. Sections sit behind the doors until then,
 * so their entrance animations wait for it. Defaults to true outside GuestShell.
 */
export const DoorsOpenContext = createContext(true);

type Props = React.ComponentProps<typeof Reveal>;

/** Fades a section in when it scrolls into view, but only after the doors open. */
export function GuestReveal(props: Props) {
  const opened = useContext(DoorsOpenContext);
  return <Reveal when={opened} {...props} />;
}

export function GuestStagger(props: React.ComponentProps<typeof Stagger>) {
  const opened = useContext(DoorsOpenContext);
  return <Stagger when={opened} {...props} />;
}

export { StaggerItem as GuestStaggerItem };
