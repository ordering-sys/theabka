import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

/** White surface with the soft card shadow. Shadows belong on cards only. */
export function Card({
  className, padded = true, ...props
}: ComponentProps<"div"> & { padded?: boolean }) {
  return (
    <div
      className={cn("rounded-card bg-white shadow-card", padded && "p-4", className)}
      {...props}
    />
  );
}
