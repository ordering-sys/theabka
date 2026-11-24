"use client";

import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Select } from "@/components/ui/Select";
import { Button, ButtonLink } from "@/components/ui/Button";
import { CopyIcon, EditIcon, LinkIcon, PlusIcon, SendIcon, TrashIcon, UserIcon } from "@/components/ui/Icons";
import { useToast } from "@/components/ui/Toast";
import { inputClass } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { useContent, useLanguage } from "@/lib/i18n";
import { formatNumber } from "@/lib/khmer";
import { getTemplate, templates } from "@/lib/mock-data";
import { addGuests, deleteGuest, listGuests, markGuestSent, updateGuest, type Draft, type InvitationGuest, type Rsvp } from "@/lib/store";
import { inviteUrl } from "@/lib/use-client";
import { dashboardContent } from "@/modules/dashboard/content";
import { GUEST_COMPANIONS, GUEST_TITLES, guestNameEn, guestNameKm, inviteMessage, type GuestCompanion, type GuestTitle } from "@/modules/guest/lib/greeting";

type Props = {
  invitation: Draft;
  /** The invitation's RSVPs, to show who replied from their personal link. */
  rsvps: Rsvp[];
  /** Premium and still online: guests can be added and links sent. */
  enabled: boolean;
  /** Basic and live: show the feature with an upgrade button instead. */
  canUpgrade: boolean;
  /** Inside the dashboard's tab card: no card or title of its own (the tab names it). */
  embedded?: boolean;
};

/** Premium "special guests": invite people by name, each with a personal link. */
export function GuestList({ invitation: inv, rsvps, enabled, canUpgrade, embedded = false }: Props) {
  const c = useContent(dashboardContent).detail.guests;
  const { lang, t } = useLanguage();
  const { showToast } = useToast();
  const fmt = (n: number) => formatNumber(n, lang);

  const [guests, setGuests] = useState<InvitationGuest[] | null>(null);
  const [title, setTitle] = useState<GuestTitle>("");
  const [nameKm, setNameKm] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [companion, setCompanion] = useState<GuestCompanion>("family");
  const [bulk, setBulk] = useState("");
  const [sheet, setSheet] = useState<null | "one" | "many">(null);
  // Set while the "one" sheet is editing an existing guest instead of adding a new one.
  const [editing, setEditing] = useState<InvitationGuest | null>(null);
  const [saving, setSaving] = useState(false);
  // The guest waiting for the host to confirm removal. Kept after closing so the modal
  // doesn't go blank while it animates away.
  const [removing, setRemoving] = useState<InvitationGuest | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    listGuests(inv.id).then((list) => alive && setGuests(list), () => alive && setGuests([]));
    return () => {
      alive = false;
    };
  }, [inv.id, enabled]);

  if (!enabled && !canUpgrade) return null;

  if (!enabled && embedded) {
    // Basic: what the feature does, and the way to get it.
    return (
      <div className="flex flex-col items-center gap-2 border-t border-line px-6 py-8 text-center">
        <span aria-hidden className="flex size-12 items-center justify-center rounded-full bg-gold-soft text-gold-ink">
          <UserIcon size={22} />
        </span>
        <h3 className="mt-1 flex items-center gap-2 text-base leading-[1.6] font-bold">
          {c.emptyTitle}
          <Badge tone="gold">{t.tier.premium}</Badge>
        </h3>
        <p className="max-w-90 text-sm leading-[1.7] text-muted">{c.sub}</p>
        <p className="text-xs text-muted">{c.premiumOnly}</p>
        <ButtonLink href={`/app/${inv.id}/pay`} className="mt-2">{c.upgrade}</ButtonLink>
      </div>
    );
  }

  if (!enabled) {
    return (
      <section aria-labelledby="guests-title" className="rounded-card bg-white p-4 shadow-card lg:px-5">
        <div className="flex items-center justify-between gap-3">
          <h2 id="guests-title" className="text-base leading-[1.6] font-bold lg:text-lg">{c.title}</h2>
          <Badge tone="gold">{t.tier.premium}</Badge>
        </div>
        <p className="mt-1 text-sm leading-[1.7] text-muted">{c.sub}</p>
        <p className="mt-1 text-xs text-muted">{c.premiumOnly}</p>
        <ButtonLink href={`/app/${inv.id}/pay`} size="sm" className="mt-3">{c.upgrade}</ButtonLink>
      </section>
    );
  }

  const template = getTemplate(inv.templateId) ?? templates[0];
  const short = (s: string) => s.split(" ").at(-1) || s;
  const couple = { km: `${inv.groomKm} & ${inv.brideKm}`, en: `${short(inv.groomEn)} & ${short(inv.brideEn)}` };
  const linkFor = (g: InvitationGuest) => `${inviteUrl(inv.slug)}/${g.code}`;
  const messageFor = (g: InvitationGuest) => inviteMessage(g, couple, template.eventType, linkFor(g));
  const bulkNames = bulk.split("\n").map((s) => s.trim()).filter(Boolean);

  function failMessage(err: unknown) {
    return err instanceof Error && err.message.includes("guest_limit_reached") ? c.limit : c.failed;
  }

  function openSheet(kind: "one" | "many") {
    // Coming from an edit: don't carry that guest's title and companion into a new guest.
    if (editing) {
      setTitle("");
      setCompanion("family");
    }
    setEditing(null);
    setNameKm("");
    setNameEn("");
    setBulk("");
    setSheet(kind);
  }

  /** Same form as "Add a guest", filled in with this guest. */
  function openEdit(g: InvitationGuest) {
    setEditing(g);
    setTitle(g.title);
    setNameKm(g.nameKm);
    setNameEn(g.nameEn);
    setCompanion(g.companion);
    setSheet("one");
  }

  async function saveEdit() {
    if (!editing || !nameKm.trim() || saving) return;
    setSaving(true);
    try {
      const updated = await updateGuest(inv.id, editing.id, { title, nameKm, nameEn, companion });
      setGuests((list) => list?.map((x) => (x.id === updated.id ? updated : x)) ?? null);
      setSheet(null);
      showToast(c.saved);
    } catch {
      showToast(c.failed);
    } finally {
      setSaving(false);
    }
  }

  /** "Add" closes the sheet; "Add & next" keeps it open with the title and companion kept. */
  async function add(next: boolean) {
    if (!nameKm.trim() || saving) return;
    setSaving(true);
    try {
      const added = await addGuests(inv.id, [{ title, nameKm, nameEn, companion }]);
      setGuests((list) => [...(list ?? []), ...added]);
      setNameKm("");
      setNameEn("");
      if (next) {
        showToast(c.added(fmt(added.length)));
        document.getElementById("guest-name-km")?.focus();
      } else {
        setSheet(null);
      }
    } catch (err) {
      showToast(failMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function addBulk() {
    if (!bulkNames.length || saving) return;
    setSaving(true);
    try {
      const added = await addGuests(inv.id, bulkNames.map((n) => ({ title: "" as const, nameKm: n, nameEn: "", companion: "family" as const })));
      setGuests((list) => [...(list ?? []), ...added]);
      setBulk("");
      setSheet(null);
      showToast(c.added(fmt(added.length)));
    } catch (err) {
      showToast(failMessage(err));
    } finally {
      setSaving(false);
    }
  }

  function markSent(g: InvitationGuest) {
    if (g.sentAt) return;
    void markGuestSent(g.id);
    setGuests((list) => list?.map((x) => (x.id === g.id ? { ...x, sentAt: new Date().toISOString() } : x)) ?? null);
  }

  async function send(g: InvitationGuest) {
    const text = messageFor(g);
    // Phones: the share sheet (Telegram, Messenger, SMS…). Desktop: Telegram's share page.
    if (navigator.share) {
      try {
        await navigator.share({ text });
        markSent(g);
      } catch {
        // cancelled
      }
      return;
    }
    const body = text.split("\n").slice(0, -1).join("\n");
    window.open(`https://t.me/share/url?url=${encodeURIComponent(linkFor(g))}&text=${encodeURIComponent(body)}`, "_blank", "noopener");
    markSent(g);
  }

  async function copy(g: InvitationGuest) {
    try {
      await navigator.clipboard.writeText(messageFor(g));
    } catch {
      // Clipboard blocked: the toast still says what to do.
    }
    showToast(c.copied);
    markSent(g);
  }

  async function copyLink(g: InvitationGuest) {
    try {
      await navigator.clipboard.writeText(linkFor(g));
    } catch {
      // Clipboard blocked: the toast still says what happened.
    }
    showToast(c.linkCopied);
    markSent(g);
  }

  /** Runs after the host confirms in the "Remove this guest?" modal. */
  async function confirmRemove() {
    const g = removing;
    if (!g || deleting) return;
    setDeleting(true);
    const ok = await deleteGuest(inv.id, g.id).catch(() => false);
    setDeleting(false);
    if (ok) {
      setGuests((list) => list?.filter((x) => x.id !== g.id) ?? null);
      setConfirmOpen(false);
    } else {
      showToast(c.failed);
    }
  }

  /** Where this guest is: a coloured dot and a word. */
  function status(g: InvitationGuest): { label: string; dot: string; text: string } {
    const reply = rsvps.find((r) => r.invitedGuestId === g.id);
    if (reply) {
      return reply.attending
        ? { label: c.status.coming(fmt(reply.partySize)), dot: "bg-jade", text: "text-jade-ink" }
        : { label: c.status.notComing, dot: "bg-maroon", text: "text-maroon" };
    }
    if (g.openedAt) return { label: c.status.opened, dot: "bg-gold", text: "text-gold-ink" };
    if (g.sentAt) return { label: c.status.sent, dot: "bg-ink-soft/50", text: "text-ink-soft" };
    return { label: c.status.notSent, dot: "bg-line-strong", text: "text-muted" };
  }

  const hasGuests = !!guests && guests.length > 0;
  const Wrapper = embedded ? "div" : "section";

  return (
    <Wrapper
      aria-labelledby={embedded ? undefined : "guests-title"}
      className={cn(!embedded && "overflow-hidden rounded-card bg-white shadow-card")}
    >
      {/* Header: the add button appears here once the list has guests. Embedded, the tab is the title. */}
      <div
        className={cn(
          "flex items-center justify-between gap-3 px-3.5 lg:px-5",
          embedded ? "border-t border-line bg-sand-light/60 py-2.5" : "py-3 lg:py-4",
          embedded && !hasGuests && "hidden",
        )}
      >
        {embedded ? (
          hasGuests && (
            <p className="min-w-0 text-sm leading-[1.6] font-semibold text-charcoal">{c.count(fmt(guests!.length))}</p>
          )
        ) : (
          <h2 id="guests-title" className="flex items-center gap-2 text-base leading-[1.6] font-bold lg:text-lg">
            {c.title}
            {hasGuests && (
              <span className="rounded-full bg-maroon px-2 text-xs leading-[1.7] font-semibold text-white">{fmt(guests!.length)}</span>
            )}
          </h2>
        )}
        {hasGuests && (
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" onClick={() => openSheet("many")} className={cn(SOFT_BUTTON, "hidden sm:inline-flex")}>
              <ListIcon />
              <span lang={lang} className="leading-[1.6]">{c.addMany}</span>
            </button>
            <Button size="sm" onClick={() => openSheet("one")} className="leading-[1.6]">
              <PlusIcon size={16} />
              {c.add}
            </Button>
          </div>
        )}
      </div>

      {guests === null ? (
        <div aria-busy className="mx-3.5 mb-4 h-16 motion-safe:animate-pulse rounded-card bg-sand lg:mx-5" />
      ) : guests.length === 0 ? (
        // Empty state: one main action, no form until the host asks for it.
        <div className="flex flex-col items-center gap-2 border-t border-line px-6 py-8 text-center">
          <span aria-hidden className="flex size-12 items-center justify-center rounded-full bg-gold-soft text-gold-ink">
            <UserIcon size={22} />
          </span>
          <h3 className="mt-1 text-base leading-[1.6] font-bold">{c.emptyTitle}</h3>
          <p className="max-w-90 text-sm leading-[1.7] text-muted">{c.sub}</p>
          <Button onClick={() => openSheet("one")} className="mt-2">
            <PlusIcon size={16} />
            {c.add}
          </Button>
          <button type="button" onClick={() => openSheet("many")} className="min-h-11 cursor-pointer text-sm font-semibold text-maroon underline">
            {c.addMany}
          </button>
        </div>
      ) : (
        <ul className="divide-y divide-line border-t border-line">
          {guests.map((g) => {
            const s = status(g);
            const sent = !!g.sentAt;
            return (
              <li key={g.id} className="flex items-center gap-3 px-3.5 py-3 transition-colors last:rounded-b-card hover:bg-ivory/60 lg:px-5">
                {/* Initial avatar */}
                <span aria-hidden lang="km" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gold-soft text-[15px] font-bold text-gold-ink">
                  {Array.from(g.nameKm.trim())[0] ?? "?"}
                </span>

                {/* Name, English name, and (on phones) the status under them */}
                <div className="min-w-0 grow">
                  <p lang="km" className="truncate text-[15px] leading-[1.7] font-semibold text-charcoal">{guestNameKm(g)}</p>
                  <p lang="en" className="truncate text-xs text-muted">{guestNameEn(g)}</p>
                  <p className={cn("mt-1 flex items-center gap-1.5 text-xs font-semibold sm:hidden", s.text)}>
                    <span aria-hidden className={cn("size-2 rounded-full", s.dot)} />
                    {s.label}
                  </p>
                </div>

                {/* Status (from tablet up) */}
                <p className={cn("hidden w-32 shrink-0 items-center gap-1.5 text-[13px] font-semibold sm:flex", s.text)}>
                  <span aria-hidden className={cn("size-2 shrink-0 rounded-full", s.dot)} />
                  <span className="truncate">{s.label}</span>
                </p>

                {/* One clear action, the rest in the ⋯ menu */}
                {sent ? (
                  // Already sent: a quiet button, so guests still waiting for their link stand out.
                  <button type="button" onClick={() => send(g)} aria-label={c.sendAgain} className={cn(SOFT_BUTTON, "shrink-0")}>
                    <SendIcon size={15} className="text-maroon" />
                    <span lang={lang} className="hidden leading-[1.6] sm:inline">{c.sendAgain}</span>
                  </button>
                ) : (
                  <Button size="sm" onClick={() => send(g)} className="shrink-0 leading-[1.6]">
                    <SendIcon size={15} />
                    <span lang={lang}>{c.send}</span>
                  </Button>
                )}
                <RowMenu
                  label={c.more}
                  items={[
                    { label: c.edit, icon: <EditIcon size={16} />, onSelect: () => openEdit(g) },
                    { label: c.copy, icon: <CopyIcon size={16} />, onSelect: () => void copy(g) },
                    { label: c.copyLink, icon: <LinkIcon size={16} />, onSelect: () => void copyLink(g) },
                    { label: c.remove, icon: <TrashIcon size={16} />, onSelect: () => {
                        setRemoving(g);
                        setConfirmOpen(true);
                      },
                      danger: true,
                    },
                  ]}
                />
              </li>
            );
          })}
        </ul>
      )}

      {/* Add one guest: bottom sheet on phones, centred dialog on desktop. */}
      <BottomSheet open={sheet === "one"} onClose={() => setSheet(null)} title={editing ? c.editSheet : c.addSheet} closeLabel={c.cancel} dialogOnDesktop>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void (editing ? saveEdit() : add(false));
          }}
          className="flex flex-col gap-3.5"
        >
          <div className="flex flex-col gap-1">
            <span id="guest-title-label" className="text-[13px] font-semibold text-ink-soft">{c.titleLabel}</span>
            <Select<GuestTitle>
              value={title}
              onChange={setTitle}
              labelledBy="guest-title-label"
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
          </div>
          <label className="flex flex-col gap-1 text-[13px] font-semibold text-ink-soft">
            {c.nameKm}
            <input
              id="guest-name-km"
              lang="km"
              value={nameKm}
              onChange={(e) => setNameKm(e.target.value)}
              maxLength={100}
              required
              autoFocus
              placeholder={c.nameKmPh}
              className={cn(inputClass, "min-h-12 px-3 text-[15px]")}
            />
          </label>
          <label className="flex flex-col gap-1 text-[13px] font-semibold text-ink-soft">
            {c.nameEn}
            <input lang="en" value={nameEn} onChange={(e) => setNameEn(e.target.value)} maxLength={100} placeholder={c.nameEnPh} className={cn(inputClass, "min-h-12 px-3 text-[15px]")} />
          </label>
          <div className="flex flex-col gap-1">
            <span id="guest-companion-label" className="text-[13px] font-semibold text-ink-soft">{c.companionLabel}</span>
            <Select<GuestCompanion>
              value={companion}
              onChange={setCompanion}
              labelledBy="guest-companion-label"
              options={[
                { value: "", label: c.noCompanion, lang },
                ...(Object.keys(GUEST_COMPANIONS) as Exclude<GuestCompanion, "">[]).map((k) => ({
                  value: k,
                  label: GUEST_COMPANIONS[k].km,
                  hint: GUEST_COMPANIONS[k].en,
                  lang: "km",
                })),
              ]}
            />
          </div>
          {nameKm.trim() && (
            // Preview of how the invitation will greet them.
            <p className="rounded-card bg-ivory px-3 py-2 text-center text-sm leading-[1.8]">
              <span lang="km" className="block">{guestNameKm({ title, nameKm: nameKm.trim(), companion })}</span>
              <span lang="en" className="block text-xs text-muted">{guestNameEn({ title, nameKm: nameKm.trim(), nameEn, companion })}</span>
            </p>
          )}
          {editing ? (
            <>
              <p className="text-xs leading-[1.7] text-muted">{c.editHint}</p>
              <div className="mt-1 grid grid-cols-2 gap-2.5">
                <button type="button" onClick={() => setSheet(null)} className={cn(SOFT_BUTTON, "min-h-12 text-[15px]")}>
                  {c.cancel}
                </button>
                <Button type="submit" disabled={!nameKm.trim() || saving} className="leading-[1.6]">
                  {c.save}
                </Button>
              </div>
            </>
          ) : (
            <div className="mt-1 grid grid-cols-2 gap-2.5">
              <Button type="button" variant="secondary" onClick={() => void add(true)} disabled={!nameKm.trim() || saving}>
                {c.addNext}
              </Button>
              <Button type="submit" disabled={!nameKm.trim() || saving}>
                {c.addOne}
              </Button>
            </div>
          )}
        </form>
      </BottomSheet>

      {/* Confirm removing a guest (replaces the browser's confirm box). */}
      <BottomSheet
        open={confirmOpen}
        onClose={() => !deleting && setConfirmOpen(false)}
        label={c.removeTitle}
        closeLabel={c.cancel}
        dialogOnDesktop
      >
        {removing && (
          <div className="flex flex-col items-center gap-2 text-center">
            <span aria-hidden className="flex size-14 items-center justify-center rounded-full bg-rose-soft text-maroon">
              <TrashIcon size={24} />
            </span>
            <h2 className="mt-1 text-lg leading-[1.6] font-bold">{c.removeTitle}</h2>
            <div className="w-full rounded-card bg-ivory px-3 py-2.5">
              <p lang="km" className="text-[15px] leading-[1.7] font-semibold text-charcoal">{guestNameKm(removing)}</p>
              <p lang="en" className="text-xs text-muted">{guestNameEn(removing)}</p>
            </div>
            <p className="text-sm leading-[1.7] text-muted">{c.removeBody}</p>
            <div className="mt-3 grid w-full grid-cols-2 gap-2.5">
              <button type="button" onClick={() => setConfirmOpen(false)} disabled={deleting} className={cn(SOFT_BUTTON, "min-h-12 text-[15px]")}>
                {c.cancel}
              </button>
              <Button onClick={confirmRemove} disabled={deleting} className="leading-[1.6]">
                <TrashIcon size={16} />
                {deleting ? c.removing : c.remove}
              </Button>
            </div>
          </div>
        )}
      </BottomSheet>

      {/* Paste a list */}
      <BottomSheet open={sheet === "many"} onClose={() => setSheet(null)} title={c.addMany} closeLabel={c.cancel} dialogOnDesktop>
        <div className="flex flex-col gap-2.5">
          <textarea
            id="guest-bulk"
            lang="km"
            rows={7}
            value={bulk}
            onChange={(e) => setBulk(e.target.value)}
            placeholder={c.addManyPh}
            aria-label={c.addMany}
            className={cn(inputClass, "px-3 py-2 text-[15px] leading-[1.8]")}
          />
          <p className="text-xs leading-[1.7] text-muted">{c.addManyHint}</p>
          <Button onClick={addBulk} disabled={!bulkNames.length || saving} fullWidth className="mt-1">
            {c.addManyCta(fmt(bulkNames.length))}
          </Button>
        </div>
      </BottomSheet>
    </Wrapper>
  );
}

/** Quiet secondary button for this list: white, hairline border, charcoal text. Same height as Button size="sm". */
const SOFT_BUTTON =
  "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-card border border-line-strong bg-white px-3.5 text-sm font-semibold text-charcoal transition-colors " +
  "hover:border-maroon/40 hover:bg-ivory focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold";

function ListIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden className="shrink-0 text-maroon">
      <path d="M9 6h11M9 12h11M9 18h11" />
      <circle cx="4.5" cy="6" r="1" fill="currentColor" />
      <circle cx="4.5" cy="12" r="1" fill="currentColor" />
      <circle cx="4.5" cy="18" r="1" fill="currentColor" />
    </svg>
  );
}

type MenuItem = { label: string; icon: React.ReactNode; onSelect: () => void; danger?: boolean };

/** "⋯" button with a small menu of secondary actions. Closes on choice, outside click or Escape. */
function RowMenu({ label, items }: { label: string; items: MenuItem[] }) {
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
