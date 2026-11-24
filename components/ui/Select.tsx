"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { CheckIcon, ChevronRightIcon } from "./Icons";

export type SelectOption<T extends string> = {
  value: T;
  /** Main text (e.g. Khmer). */
  label: string;
  /** Smaller text beside it (e.g. English). */
  hint?: string;
  lang?: string;
};

type Props<T extends string> = {
  value: T;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  /** Id of the visible label element. */
  labelledBy: string;
  className?: string;
};

/**
 * Styled dropdown (a native <select> list can't be styled). Button + listbox:
 * arrow keys move, Enter/Space choose, Escape or a click outside closes.
 */
export function Select<T extends string>({ value, onChange, options, labelledBy, className }: Props<T>) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const id = useId();
  const selected = options.find((o) => o.value === value) ?? options[0];

  // Close on a click outside.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  // Keep the highlighted option in view.
  useEffect(() => {
    if (open) list.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  function show() {
    setActive(Math.max(0, options.findIndex((o) => o.value === value)));
    setOpen(true);
    requestAnimationFrame(() => list.current?.focus());
  }

  function choose(index: number) {
    onChange(options[index].value);
    setOpen(false);
    button.current?.focus();
  }

  function onListKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") setActive((i) => Math.min(options.length - 1, i + 1));
    else if (e.key === "ArrowUp") setActive((i) => Math.max(0, i - 1));
    else if (e.key === "Home") setActive(0);
    else if (e.key === "End") setActive(options.length - 1);
    else if (e.key === "Enter" || e.key === " ") choose(active);
    else if (e.key === "Escape" || e.key === "Tab") {
      // Escape inside a <dialog> would also close it; stop it here.
      if (e.key === "Escape") e.stopPropagation();
      setOpen(false);
      button.current?.focus();
      return;
    } else return;
    e.preventDefault();
  }

  return (
    <div ref={root} className={cn("relative", className)}>
      <button
        ref={button}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={`${labelledBy} ${id}-value`}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            show();
          }
        }}
        className={cn(
          "flex min-h-12 w-full cursor-pointer items-center gap-2 rounded-card border-[1.5px] bg-white px-3 text-left text-[15px] transition-colors",
          open ? "border-maroon ring-3 ring-maroon/10" : "border-line-strong hover:border-maroon/50",
        )}
      >
        <span id={`${id}-value`} className="flex min-w-0 grow items-baseline gap-2">
          <span lang={selected.lang} className="truncate leading-[1.6] font-semibold text-charcoal">{selected.label}</span>
          {selected.hint && <span lang="en" className="truncate text-[13px] text-muted">{selected.hint}</span>}
        </span>
        <ChevronRightIcon size={16} className={cn("shrink-0 text-muted transition-transform", open ? "-rotate-90" : "rotate-90")} />
      </button>

      {open && (
        <ul
          ref={list}
          role="listbox"
          tabIndex={-1}
          aria-labelledby={labelledBy}
          aria-activedescendant={`${id}-opt-${active}`}
          onKeyDown={onListKey}
          className="absolute inset-x-0 top-full z-30 mt-1.5 max-h-64 overflow-y-auto rounded-card bg-white p-1.5 shadow-lift ring-1 ring-line outline-none"
        >
          {options.map((o, i) => {
            const isSelected = o.value === value;
            return (
              <li
                key={o.value || "none"}
                id={`${id}-opt-${i}`}
                data-index={i}
                role="option"
                aria-selected={isSelected}
                onPointerEnter={() => setActive(i)}
                onClick={() => choose(i)}
                className={cn(
                  "flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-2.5",
                  i === active && "bg-sand-light",
                  isSelected && "text-maroon",
                )}
              >
                <span lang={o.lang} className={cn("leading-[1.6]", isSelected ? "font-bold" : "font-semibold text-charcoal")}>{o.label}</span>
                {o.hint && <span lang="en" className="text-[13px] text-muted">{o.hint}</span>}
                {isSelected && <CheckIcon size={16} className="ml-auto shrink-0 text-maroon" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
