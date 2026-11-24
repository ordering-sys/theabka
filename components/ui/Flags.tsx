import { cn } from "@/lib/cn";

/**
 * Official flags for the language toggle, from Wikimedia Commons (public domain):
 * public/flags/kh.svg (Flag_of_Cambodia.svg) and public/flags/uk.svg
 * (Flag_of_the_United_Kingdom_(1-2).svg). Decorative: the button text names the language.
 */

type FlagProps = { className?: string; size?: "sm" | "md" };
const frame = "shrink-0 object-cover ring-1 ring-black/10";
// sm 16×11 (inline with text), md 24×16 (flag-only buttons).
const sizes = { sm: "h-[11px] w-4 rounded-[2px]", md: "h-4 w-6 rounded-[3px]" };

export function FlagKH({ className, size = "sm" }: FlagProps) {
  // eslint-disable-next-line @next/next/no-img-element -- tiny static SVG; next/image adds nothing here
  return <img src="/flags/kh.svg" alt="" aria-hidden width={16} height={11} className={cn(frame, sizes[size], className)} />;
}

export function FlagEN({ className, size = "sm" }: FlagProps) {
  // eslint-disable-next-line @next/next/no-img-element -- tiny static SVG; next/image adds nothing here
  return <img src="/flags/uk.svg" alt="" aria-hidden width={16} height={11} className={cn(frame, sizes[size], className)} />;
}
