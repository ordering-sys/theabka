import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "gold";
type Size = "md" | "sm";

const base =
  "inline-flex items-center justify-center gap-2 rounded-card font-semibold no-underline transition-colors cursor-pointer " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:cursor-not-allowed disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary: "bg-maroon text-white hover:bg-maroon-dark",
  secondary: "bg-white text-maroon border-[1.5px] border-maroon hover:bg-sand-light",
  ghost: "bg-transparent text-maroon hover:bg-sand",
  gold: "bg-gold text-charcoal hover:bg-gold-light",
};

// Both sizes keep a 44px+ tap target.
const sizes: Record<Size, string> = {
  md: "min-h-12 px-5 text-[15px]",
  sm: "min-h-11 px-4 text-sm",
};

type StyleProps = { variant?: Variant; size?: Size; fullWidth?: boolean };

function classes({ variant = "primary", size = "md", fullWidth }: StyleProps, className?: string) {
  return cn(base, variants[variant], sizes[size], fullWidth && "w-full", className);
}

export function Button({
  variant, size, fullWidth, className, type = "button", ...props
}: ComponentProps<"button"> & StyleProps) {
  return <button type={type} className={classes({ variant, size, fullWidth }, className)} {...props} />;
}

export function ButtonLink({
  variant, size, fullWidth, className, ...props
}: ComponentProps<typeof Link> & StyleProps) {
  return <Link className={classes({ variant, size, fullWidth }, className)} {...props} />;
}
