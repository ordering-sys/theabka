import { cn } from "@/lib/cn";

/**
 * Thin gold kbach-style corner. Invitation pages only, never host-app chrome.
 * Place four inside a `relative` card: `<KbachCorners />`.
 */
function Corner({ className, color }: { className: string; color: string }) {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none" stroke={color} strokeWidth="1.3" aria-hidden className={cn("pointer-events-none absolute", className)}>
      <path d="M2 42V12Q2 2 12 2h30" />
      <path d="M8 30V14q0-6 6-6h16" />
      <path d="M14 20q0-6 6-6 4 0 4 4t-4 4q-3 0-3-3" />
    </svg>
  );
}

export function KbachCorners({ color = "var(--color-gold)" }: { color?: string }) {
  return (
    <>
      <Corner color={color} className="top-2 left-2" />
      <Corner color={color} className="top-2 right-2 -scale-x-100" />
      <Corner color={color} className="bottom-2 left-2 -scale-y-100" />
      <Corner color={color} className="right-2 bottom-2 -scale-100" />
    </>
  );
}

/** Gold rule with a small jasmine flower in the middle. */
export function JasmineDivider({ color = "var(--color-gold)", className }: { color?: string; className?: string }) {
  return (
    <div aria-hidden className={cn("flex items-center gap-2.5", className)}>
      <span className="h-px grow" style={{ background: color }} />
      <svg width="16" height="16" viewBox="0 0 24 24" fill={color}>
        <path d="M12 2c1.5 2.5 1.5 5 0 7.5C10.5 7 10.5 4.5 12 2zM22 12c-2.5 1.5-5 1.5-7.5 0 2.5-1.5 5-1.5 7.5 0zM12 22c-1.5-2.5-1.5-5 0-7.5 1.5 2.5 1.5 5 0 7.5zM2 12c2.5-1.5 5-1.5 7.5 0C7 13.5 4.5 13.5 2 12z" />
        <circle cx="12" cy="12" r="2" />
      </svg>
      <span className="h-px grow" style={{ background: color }} />
    </div>
  );
}
