"use client";

import { useId, useState } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { CloseIcon, TrashIcon, UserIcon } from "@/components/ui/Icons";
import { Select } from "@/components/ui/Select";
import { inputClass } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { useContent, useLanguage } from "@/lib/i18n";
import { addGiftEntry, updateGiftEntry, type GiftEntry, type InvitationGuest, type NewGiftEntry } from "@/lib/store";
import { dashboardContent } from "@/modules/dashboard/content";
import {
  GIFT_KINDS,
  kindNeedsAmount,
  parseAmountInput,
  toInputAmount,
  toStoredAmount,
  type GiftCurrency,
  type GiftKind,
  type GiftSide,
} from "@/modules/dashboard/lib/gift-ledger";
import { GUEST_TITLES, guestNameEn, guestNameKm, type GuestTitle } from "@/modules/guest/lib/greeting";
import { SOFT_BUTTON } from "./RowMenu";

type Props = {
  open: boolean;
  onClose: () => void;
  invitationId: string;
  /** The host's guest list, to pick the giver from (may be empty). */
  guests: InvitationGuest[];
  /** Set to edit an entry; null to add new ones. */
  editing: GiftEntry | null;
  /** Changes on every open, so the form starts fresh. */
  formKey: number;
  /** Currency the host used last, for new entries. */
  defaultCurrency: GiftCurrency;
  onSaved: (saved: GiftEntry[], mode: "add" | "edit") => void;
  onCurrencyUsed: (currency: GiftCurrency) => void;
  /** Edit mode: offers "Delete this gift" (the parent asks for confirmation). */
  onDelete?: (entry: GiftEntry) => void;
};

/** Add or edit a gift: bottom sheet on phones, centred dialog on desktop. */
export function GiftEntrySheet({ open, onClose, editing, formKey, ...rest }: Props) {
  const c = useContent(dashboardContent).detail.gifts;
  return (
    <BottomSheet open={open} onClose={onClose} title={editing ? c.editSheet : c.addSheet} closeLabel={c.cancel} dialogOnDesktop>
      <GiftForm key={formKey} editing={editing} onClose={onClose} {...rest} />
    </BottomSheet>
  );
}

const OTHER: Record<GiftCurrency, GiftCurrency> = { KHR: "USD", USD: "KHR" };

function GiftForm({
  editing,
  onClose,
  invitationId,
  guests,
  defaultCurrency,
  onSaved,
  onCurrencyUsed,
  onDelete,
}: Omit<Props, "open" | "formKey">) {
  const c = useContent(dashboardContent).detail.gifts;
  const { lang } = useLanguage();
  const id = useId();

  const [guestId, setGuestId] = useState<string | null>(editing?.invitedGuestId ?? null);
  const [title, setTitle] = useState<GuestTitle>(editing?.title ?? "");
  const [nameKm, setNameKm] = useState(editing?.nameKm ?? "");
  const [nameEn, setNameEn] = useState(editing?.nameEn ?? "");
  const [side, setSide] = useState<GiftSide>(editing?.side ?? "");
  const [kind, setKind] = useState<GiftKind>(editing?.kind ?? "cash");
  const [currency, setCurrency] = useState<GiftCurrency>(editing?.currency ?? defaultCurrency);
  const [amount, setAmount] = useState(editing ? toInputAmount(editing) : "");
  // Second amount in the other currency (an envelope with riel and dollars). New entries only.
  const [extra, setExtra] = useState<string | null>(null);
  const [description, setDescription] = useState(editing?.description ?? "");
  const [note, setNote] = useState(editing?.note ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const linked = guestId ? guests.find((g) => g.id === guestId) ?? null : null;
  const needsAmount = kindNeedsAmount(kind);
  const showDescription = !needsAmount;
  const canSplit = !editing && needsAmount;
  const suggestions = !linked && nameKm.trim() ? matchGuests(guests, nameKm).slice(0, 5) : [];

  function pick(g: InvitationGuest) {
    setGuestId(g.id);
    setTitle(g.title);
    setNameKm(g.nameKm);
    setNameEn(g.nameEn);
    setError("");
  }

  function unlink() {
    setGuestId(null);
    focus(`${id}-name`);
  }

  /** Clears the giver and amounts for the next envelope; side, gift type and currency stay. */
  function resetForNext() {
    setGuestId(null);
    setTitle("");
    setNameKm("");
    setNameEn("");
    setAmount("");
    setExtra(null);
    setDescription("");
    setNote("");
    focus(`${id}-name`);
  }

  function build(): NewGiftEntry[] | string {
    if (!nameKm.trim()) return c.needName;
    const main = parseAmountInput(amount);
    const second = extra !== null ? parseAmountInput(extra) : null;
    if (needsAmount && main === null && second === null) return c.needAmount;
    if (!needsAmount && main === null && !description.trim()) return c.needAmountOrDescription;
    const base = {
      invitedGuestId: linked?.id ?? null,
      title,
      nameKm,
      nameEn,
      side,
      kind,
      description: showDescription ? description : "",
      note,
    };
    const out: NewGiftEntry[] = [];
    if (main !== null || !needsAmount) {
      out.push({ ...base, currency: main === null ? null : currency, amount: main === null ? null : toStoredAmount(main, currency) });
    }
    if (second !== null) {
      const cur = OTHER[currency];
      out.push({ ...base, currency: cur, amount: toStoredAmount(second, cur) });
    }
    return out;
  }

  function failMessage(err: unknown) {
    const m = err instanceof Error ? err.message : "";
    if (m.includes("gift_limit_reached")) return c.limit;
    if (m.includes("invitation_ended")) return c.ended;
    return c.failed;
  }

  async function save(next: boolean) {
    if (saving) return;
    const entries = build();
    if (typeof entries === "string") {
      setError(entries);
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (editing) {
        const updated = await updateGiftEntry(editing.id, entries[0]);
        onSaved([updated], "edit");
        onClose();
      } else {
        // One at a time, so a failure part-way still reports what was saved.
        const saved: GiftEntry[] = [];
        try {
          for (const e of entries) saved.push(await addGiftEntry(invitationId, e));
        } finally {
          if (saved.length) onSaved(saved, "add");
          // The first amount saved but the second didn't: clear the first so a retry doesn't add it twice.
          if (saved.length && saved.length < entries.length) setAmount("");
        }
        if (needsAmount) onCurrencyUsed(currency);
        if (next) resetForNext();
        else onClose();
      }
    } catch (err) {
      setError(failMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const label = "text-[13px] font-semibold text-ink-soft";
  const field = cn(inputClass, "min-h-12 px-3 text-[15px]");

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void save(!editing);
      }}
      className="flex flex-col gap-3.5"
    >
      {/* Giver: picked from the guest list, or typed in */}
      {linked ? (
        <div className="flex flex-col gap-1">
          <span className={label}>{c.giver}</span>
          <div className="flex items-center gap-3 rounded-card bg-ivory px-3 py-2">
            <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gold-soft text-gold-ink">
              <UserIcon size={18} />
            </span>
            <span className="min-w-0 grow">
              <span lang="km" className="block truncate text-[15px] leading-[1.7] font-semibold text-charcoal">
                {guestNameKm({ ...linked, companion: "" })}
              </span>
              <span className="block truncate text-xs text-muted">
                <span lang="en">{guestNameEn({ ...linked, companion: "" })}</span> · {c.fromList}
              </span>
            </span>
            <button type="button" onClick={unlink} className={cn(SOFT_BUTTON, "shrink-0 px-3 text-[13px] leading-[1.6]")}>
              <CloseIcon size={14} />
              {c.unlink}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-1">
            <label htmlFor={`${id}-name`} className={label}>{c.giver}</label>
            <div className="flex gap-2">
              <Select<GuestTitle>
                value={title}
                onChange={setTitle}
                labelledBy={`${id}-title-label`}
                className="w-32 shrink-0"
                options={[
                  { value: "", label: c.noTitle, lang },
                  ...(Object.keys(GUEST_TITLES) as Exclude<GuestTitle, "">[]).map((k) => ({
                    value: k,
                    label: GUEST_TITLES[k].km,
                    hint: GUEST_TITLES[k].en,
                    lang: "km",
                  })),
                ]}
              />
              <span id={`${id}-title-label`} className="sr-only">{c.titleLabel}</span>
              <input
                id={`${id}-name`}
                lang="km"
                value={nameKm}
                onChange={(e) => {
                  setNameKm(e.target.value);
                  setError("");
                }}
                maxLength={100}
                autoFocus
                autoComplete="off"
                placeholder={c.giverPh}
                aria-invalid={error === c.needName || undefined}
                className={field}
              />
            </div>
          </div>
          {suggestions.length > 0 && (
            <ul aria-label={c.fromList} className="-mt-2 flex flex-col overflow-hidden rounded-card border border-line">
              {suggestions.map((g) => (
                <li key={g.id} className="border-t border-line first:border-t-0">
                  <button
                    type="button"
                    onClick={() => pick(g)}
                    className="flex min-h-11 w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-left hover:bg-ivory"
                  >
                    <UserIcon size={15} className="shrink-0 text-gold-deep" />
                    <span lang="km" className="truncate text-sm leading-[1.7] font-semibold text-charcoal">{guestNameKm({ ...g, companion: "" })}</span>
                    <span lang="en" className="truncate text-xs text-muted">{g.nameEn}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <label className={cn("flex flex-col gap-1", label)}>
            {c.nameEn}
            <input lang="en" value={nameEn} onChange={(e) => setNameEn(e.target.value)} maxLength={100} placeholder={c.nameEnPh} className={field} />
          </label>
        </>
      )}

      {/* Side */}
      <fieldset className="flex flex-col gap-1">
        <legend className={cn("mb-1", label)}>{c.side}</legend>
        <Segmented<GiftSide>
          value={side}
          onChange={setSide}
          options={[
            ["", c.sideNone],
            ["groom", c.sides.groom],
            ["bride", c.sides.bride],
          ]}
          className="grid-cols-3"
        />
      </fieldset>

      {/* Gift type */}
      <fieldset className="flex flex-col gap-1">
        <legend className={cn("mb-1", label)}>{c.kind}</legend>
        <Segmented<GiftKind>
          value={kind}
          onChange={(k) => {
            setKind(k);
            setError("");
            if (!kindNeedsAmount(k)) setExtra(null);
          }}
          options={GIFT_KINDS.map((k) => [k, c.kinds[k]] as const)}
          className="grid-cols-2 sm:grid-cols-4"
        />
      </fieldset>

      {/* Amount, with a ៛ / $ switch */}
      <div className="flex flex-col gap-1">
        <label htmlFor={`${id}-amount`} className={label}>{needsAmount ? c.amount : c.amountOptional}</label>
        <AmountField
          id={`${id}-amount`}
          value={amount}
          onChange={(v) => {
            setAmount(v);
            setError("");
          }}
          currency={currency}
          onCurrency={setCurrency}
          currencyLabel={c.currency}
          placeholder={c.amountPh[currency]}
          invalid={error === c.needAmount}
        />
        {canSplit && extra === null && (
          <button
            type="button"
            onClick={() => {
              setExtra("");
              focus(`${id}-extra`);
            }}
            className="min-h-11 cursor-pointer self-start text-sm font-semibold text-maroon underline"
          >
            {c.addCurrency[OTHER[currency]]}
          </button>
        )}
        {canSplit && extra !== null && (
          <div className="mt-1 flex items-center gap-2">
            <AmountField
              id={`${id}-extra`}
              value={extra}
              onChange={setExtra}
              currency={OTHER[currency]}
              placeholder={c.amountPh[OTHER[currency]]}
            />
            <button type="button" onClick={() => setExtra(null)} className={cn(SOFT_BUTTON, "shrink-0 px-3")} aria-label={c.removeCurrency}>
              <CloseIcon size={14} />
            </button>
          </div>
        )}
      </div>

      {showDescription && (
        <label className={cn("flex flex-col gap-1", label)}>
          {c.description}
          <input
            lang={lang}
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              setError("");
            }}
            maxLength={100}
            placeholder={c.descriptionPh}
            aria-invalid={error === c.needAmountOrDescription || undefined}
            className={field}
          />
        </label>
      )}

      <label className={cn("flex flex-col gap-1", label)}>
        {c.note}
        <input lang={lang} value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder={c.notePh} className={field} />
      </label>

      {error && (
        <p role="alert" className="rounded-card bg-rose-soft px-3 py-2 text-sm leading-[1.7] text-maroon">{error}</p>
      )}

      {editing ? (
        <div className="mt-1 grid grid-cols-2 gap-2.5">
          <button type="button" onClick={onClose} className={cn(SOFT_BUTTON, "min-h-12 text-[15px] leading-[1.6]")}>
            {c.cancel}
          </button>
          <Button type="submit" disabled={saving} className="leading-[1.6]">
            {c.save}
          </Button>
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(editing)}
              disabled={saving}
              className="col-span-2 flex min-h-11 cursor-pointer items-center justify-center gap-1.5 text-sm leading-[1.6] font-semibold text-maroon hover:underline"
            >
              <TrashIcon size={15} />
              {c.book.delete}
            </button>
          )}
        </div>
      ) : (
        <div className="mt-1 grid grid-cols-2 gap-2.5">
          <button type="button" onClick={() => void save(false)} disabled={saving} className={cn(SOFT_BUTTON, "min-h-12 text-[15px] leading-[1.6] disabled:opacity-50")}>
            {c.saveClose}
          </button>
          <Button type="submit" disabled={saving} className="leading-[1.6]">
            {c.saveNext}
          </Button>
        </div>
      )}
    </form>
  );
}

/** Guests whose Khmer or English name contains what was typed. */
function matchGuests(guests: InvitationGuest[], typed: string): InvitationGuest[] {
  const q = typed.trim().toLowerCase();
  return guests.filter((g) => g.nameKm.toLowerCase().includes(q) || g.nameEn.toLowerCase().includes(q));
}

function focus(elementId: string) {
  requestAnimationFrame(() => document.getElementById(elementId)?.focus());
}

/** A row of choices where one is on (radio behaviour), as large tap targets. */
function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: readonly (readonly [T, string])[];
  className?: string;
}) {
  return (
    <div role="radiogroup" className={cn("grid gap-1 rounded-card bg-sand-light p-1", className)}>
      {options.map(([v, text]) => {
        const on = v === value;
        return (
          <button
            key={v || "none"}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(v)}
            className={cn(
              "min-h-11 cursor-pointer rounded-[9px] px-2 text-[13px] leading-[1.6] font-semibold transition-colors",
              on ? "bg-white text-maroon shadow-card" : "text-muted hover:text-charcoal",
            )}
          >
            {text}
          </button>
        );
      })}
    </div>
  );
}

/** Number field with the currency beside it. `onCurrency` makes the currency switchable. */
function AmountField({
  id,
  value,
  onChange,
  currency,
  onCurrency,
  currencyLabel,
  placeholder,
  invalid,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  currency: GiftCurrency;
  onCurrency?: (c: GiftCurrency) => void;
  currencyLabel?: string;
  placeholder: string;
  invalid?: boolean;
}) {
  return (
    <div className="flex w-full gap-2">
      <input
        id={id}
        inputMode="numeric"
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={16}
        placeholder={placeholder}
        aria-invalid={invalid || undefined}
        className={cn(inputClass, "min-h-12 px-3 text-[17px] font-semibold tabular-nums")}
      />
      {onCurrency ? (
        <div role="radiogroup" aria-label={currencyLabel} className="flex shrink-0 rounded-card bg-sand-light p-1">
          {(["KHR", "USD"] as const).map((cur) => {
            const on = cur === currency;
            return (
              <button
                key={cur}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => onCurrency(cur)}
                className={cn(
                  "min-h-10 min-w-11 cursor-pointer rounded-[9px] px-2 text-base font-bold transition-colors",
                  on ? "bg-white text-maroon shadow-card" : "text-muted hover:text-charcoal",
                )}
              >
                {cur === "KHR" ? "៛" : "$"}
              </button>
            );
          })}
        </div>
      ) : (
        <span aria-hidden className="flex min-w-11 shrink-0 items-center justify-center rounded-card bg-sand-light px-2 text-base font-bold text-maroon">
          {currency === "KHR" ? "៛" : "$"}
        </span>
      )}
    </div>
  );
}
