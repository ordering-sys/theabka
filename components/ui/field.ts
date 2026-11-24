/**
 * Shared look for text inputs and textareas: line border, maroon border and a
 * soft gold ring on focus, maroon border when `aria-invalid`. Add height,
 * padding and font size at the call site.
 */
export const inputClass =
  "w-full min-w-0 rounded-card border-[1.5px] border-line-strong bg-white text-charcoal outline-none " +
  "transition-[border-color,box-shadow] duration-150 placeholder:text-muted " +
  "focus:border-maroon focus:ring-3 focus:ring-gold/40 aria-invalid:border-maroon";
