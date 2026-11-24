import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export const fieldClass =
  "min-h-12 w-full min-w-0 rounded-card border-[1.5px] border-line-strong bg-white px-3 text-[15px] text-charcoal outline-none placeholder:text-muted/60 focus:border-maroon";

/** Label + input. `lang` on the input tells the browser which keyboard/spellcheck to use. */
export function TextField({
  id, label, className, ...props
}: ComponentProps<"input"> & { id: string; label: string }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-[13px] font-semibold text-ink-soft">{label}</label>
      <input id={id} className={fieldClass} {...props} />
    </div>
  );
}

export function TextArea({
  id, label, className, ...props
}: ComponentProps<"textarea"> & { id: string; label: string }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-[13px] font-semibold text-ink-soft">{label}</label>
      <textarea id={id} rows={3} className={cn(fieldClass, "resize-none py-2.5")} {...props} />
    </div>
  );
}

export function EditorCard({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-2.5 rounded-card bg-white p-3.5 shadow-card lg:p-5", className)} {...props} />;
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
