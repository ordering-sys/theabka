import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { inputClass } from "@/components/ui/field";

// Light placeholders so sample text ("Sok Dara") never looks like a filled-in value.
export const fieldClass = cn(
  inputClass,
  "min-h-12 border-line bg-ivory/50 px-3.5 text-[15px] placeholder:text-muted/45 hover:border-line-strong focus:bg-white",
);

const labelClass = "mb-1.5 block text-[13px] font-semibold text-ink-soft";

/**
 * Label + input. `lang` on the input tells the browser which keyboard/spellcheck to use.
 * `requiredLabel` marks the field as needed to publish (red asterisk and aria-required).
 */
export function TextField({
  id, label, className, requiredLabel, ...props
}: ComponentProps<"input"> & { id: string; label: string; requiredLabel?: string }) {
  return (
    <div className={className}>
      <label htmlFor={id} className={labelClass}>
        {label}
        <RequiredMark label={requiredLabel} />
      </label>
      <input id={id} aria-required={requiredLabel !== undefined || undefined} className={fieldClass} {...props} />
    </div>
  );
}

export function TextArea({
  id, label, className, requiredLabel, ...props
}: ComponentProps<"textarea"> & { id: string; label: string; requiredLabel?: string }) {
  return (
    <div className={className}>
      <label htmlFor={id} className={labelClass}>
        {label}
        <RequiredMark label={requiredLabel} />
      </label>
      <textarea id={id} rows={3} aria-required={requiredLabel !== undefined || undefined} className={cn(fieldClass, "resize-none py-2.5")} {...props} />
    </div>
  );
}

/** Red asterisk after a label; the word ("Required") is read by screen readers. */
function RequiredMark({ label }: { label?: string }) {
  if (label === undefined) return null;
  return (
    <span className="ml-0.5 text-maroon" title={label}>
      <span aria-hidden>*</span>
      <span className="sr-only"> ({label})</span>
    </span>
  );
}

export function EditorCard({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-3 rounded-card bg-white p-4 shadow-card lg:p-6", className)} {...props} />;
}

/** Card heading: tinted icon tile + title, with a hairline under it. */
export function CardHeader({ icon, title, tone = "maroon", aside }: { icon: React.ReactNode; title: string; tone?: "maroon" | "gold"; aside?: React.ReactNode }) {
  return (
    <div className="-mx-4 -mt-1 mb-1 flex items-center gap-3 border-b border-line px-4 pb-3.5 lg:-mx-6 lg:px-6">
      <span
        aria-hidden
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-[10px]",
          tone === "maroon" ? "bg-rose-soft text-maroon" : "bg-gold-soft text-gold-ink",
        )}
      >
        {icon}
      </span>
      <h3 className="grow text-base leading-[1.6] font-bold">{title}</h3>
      {aside}
    </div>
  );
}

/** Small uppercase-style divider label inside a card ("Parents"). */
export function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-1 flex items-center gap-3 text-xs font-semibold text-gold-deep">
      <span>{children}</span>
      <span aria-hidden className="h-px grow bg-line" />
    </div>
  );
}

/** Inline error/notice box. */
export function Alert({
  title, children, onDismiss, dismissLabel,
}: { title?: string; children: React.ReactNode; onDismiss?: () => void; dismissLabel?: string }) {
  return (
    <div role="alert" className="flex items-start gap-2.5 rounded-card border border-maroon/25 bg-rose-soft p-3 text-[13px] text-maroon">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden className="mt-0.5 shrink-0">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v5M12 16h.01" />
      </svg>
      <div className="grow">
        {title && <b className="block">{title}</b>}
        {children}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label={dismissLabel}
          className="-m-1 flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full hover:bg-white/60"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      )}
    </div>
  );
}
