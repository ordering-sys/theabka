"use client";

import { useEffect, useRef, useState } from "react";
import {
  MotionConfig, animate, motion, useInView, useReducedMotion,
  type HTMLMotionProps, type Transition, type Variants,
} from "motion/react";

/**
 * Shared Framer Motion (`motion` package) building blocks. Screens use these
 * instead of ad-hoc values so timing stays consistent across the app.
 */

/** Soft "settle" curve used for every entrance. */
export const EASE = [0.22, 1, 0.36, 1] as const;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.5, ease: EASE } },
};

export const popIn: Variants = {
  hidden: { opacity: 0, scale: 0.4 },
  show: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 380, damping: 18 } },
};

/** Spring for small UI pieces (active pills, indicators). */
export const SPRING: Transition = { type: "spring", stiffness: 420, damping: 34 };

/** Honours the OS "reduce motion" setting for every motion component. */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

const TAGS = {
  div: motion.div,
  section: motion.section,
  header: motion.header,
  main: motion.main,
  ul: motion.ul,
  ol: motion.ol,
  li: motion.li,
  p: motion.p,
  span: motion.span,
  h1: motion.h1,
  h2: motion.h2,
} as const;
type Tag = keyof typeof TAGS;

type TriggerProps = {
  as?: Tag;
  /** Animate as soon as it mounts instead of when it scrolls into view. */
  onMount?: boolean;
  /** Extra gate: stays hidden until true (e.g. the guest doors have opened). */
  when?: boolean;
};

function useShow(onMount: boolean, when: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -60px 0px" });
  return [ref, (onMount || inView) && when ? "show" : "hidden"] as const;
}

type RevealProps = Omit<HTMLMotionProps<"div">, "ref"> & TriggerProps & {
  delay?: number;
  variant?: VariantName;
};

/** Slow settle for cover photos. */
export const zoomOut: Variants = {
  hidden: { scale: 1.12 },
  show: { scale: 1, transition: { duration: 2.4, ease: EASE } },
};

const VARIANTS = { fadeUp, fadeIn, popIn, zoomOut };
type VariantName = keyof typeof VARIANTS;

/** Fades (and lifts) its content in once it scrolls into view. */
export function Reveal({ as = "div", onMount = false, when = true, delay = 0, variant = "fadeUp", ...props }: RevealProps) {
  const [ref, state] = useShow(onMount, when);
  const Comp = TAGS[as] as typeof motion.div;
  const base = VARIANTS[variant];
  const variants: Variants = delay
    ? { hidden: base.hidden, show: { ...(base.show as object), transition: { ...((base.show as { transition?: Transition }).transition), delay } } }
    : base;
  return <Comp ref={ref} variants={variants} initial="hidden" animate={state} {...props} />;
}

type StaggerProps = Omit<HTMLMotionProps<"div">, "ref"> & TriggerProps & {
  /** Seconds between children. */
  stagger?: number;
  delay?: number;
};

/** Container that reveals its <StaggerItem> children one after another. */
export function Stagger({ as = "div", onMount = false, when = true, stagger = 0.07, delay = 0, ...props }: StaggerProps) {
  const [ref, state] = useShow(onMount, when);
  const Comp = TAGS[as] as typeof motion.div;
  const variants: Variants = { hidden: {}, show: { transition: { staggerChildren: stagger, delayChildren: delay } } };
  return <Comp ref={ref} variants={variants} initial="hidden" animate={state} {...props} />;
}

export function StaggerItem({ as = "div", variant = "fadeUp", ...props }: Omit<HTMLMotionProps<"div">, "ref"> & { as?: Tag; variant?: VariantName }) {
  const Comp = TAGS[as] as typeof motion.div;
  return <Comp variants={VARIANTS[variant]} {...props} />;
}

/** Counts up to `value` when it first scrolls into view. `format` renders each frame (e.g. Khmer numerals). */
export function CountUp({ value, format, className }: { value: number; format: (n: number) => string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(0);
  const from = useRef(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(from.current, value, {
      duration: reduced ? 0 : 0.9,
      ease: EASE,
      onUpdate: (v) => {
        from.current = v;
        setShown(Math.round(v));
      },
    });
    return () => controls.stop();
  }, [inView, value, reduced]);

  return <span ref={ref} className={className}>{format(shown)}</span>;
}
