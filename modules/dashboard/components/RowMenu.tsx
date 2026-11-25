"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

/** Quiet secondary button for dashboard lists: white, hairline border, charcoal text. Same height as Button size="sm". */
export const SOFT_BUTTON =
  "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-card border border-line-strong bg-white px-3.5 text-sm font-semibold text-charcoal transition-colors " +
  "hover:border-maroon/40 hover:bg-ivory focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold";

export type MenuItem = { label: string; icon: React.ReactNode; onSelect: () => void; danger?: boolean };

/** "⋯" button with a small menu of secondary actions. Closes on choice, outside click or Escape. */
export function RowMenu({ label, items }: { label: string; items: MenuItem[] }) {
  const [open, setOpen] = useState(false);
  // Opens upwards when there isn't room below the button (e.g. the last row near the screen's bottom).
  const [up, setUp] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
    const rect = button.current?.getBoundingClientRect();
    const menuHeight = items.length * 44 + 20;
    if (rect) setUp(window.innerHeight - rect.bottom < menuHeight && rect.top > menuHeight);
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    // Focus the first item so keyboard users land in the menu.
    root.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function onMenuKey(e: React.KeyboardEvent) {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const buttons = Array.from(root.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? []);
    const i = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const next = e.key === "ArrowDown" ? (i + 1) % buttons.length : (i - 1 + buttons.length) % buttons.length;
    buttons[next]?.focus();
  }

  return (
    <div ref={root} className="relative shrink-0">
      <button
        ref={button}
        type="button"
        aria-label={label}
        title={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={toggle}
        className={cn(
          "flex size-11 cursor-pointer items-center justify-center rounded-card text-ink-soft transition-colors hover:bg-sand-light",
          open && "bg-sand-light",
        )}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <circle cx="5" cy="12" r="1.8" />
          <circle cx="12" cy="12" r="1.8" />
          <circle cx="19" cy="12" r="1.8" />
        </svg>
      </button>
      {open && (
        <div
          role="menu"
          aria-label={label}
          onKeyDown={onMenuKey}
          className={cn(
            "absolute right-0 z-20 w-48 rounded-card bg-white p-1.5 shadow-lift ring-1 ring-line motion-safe:animate-fade-in",
            up ? "bottom-full mb-1.5" : "top-full mt-1.5",
          )}
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
              className={cn(
                "flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-left text-sm font-semibold outline-none hover:bg-sand-light focus-visible:bg-sand-light",
                item.danger ? "text-maroon hover:bg-rose-soft focus-visible:bg-rose-soft" : "text-charcoal",
              )}
            >
              <span aria-hidden className={item.danger ? "text-maroon" : "text-muted"}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
