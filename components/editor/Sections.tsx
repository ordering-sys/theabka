"use client";
/* eslint-disable @next/next/no-img-element -- user uploads are data URLs in the prototype */

import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CloseIcon, PinIcon, PlayIcon } from "@/components/ui/Icons";
import { MockQr } from "@/components/invitation/MockQr";
import { cn } from "@/lib/cn";
import { MAX_UPLOAD_BYTES } from "@/lib/image";
import { uploadGiftQr, uploadMusic, uploadPhoto, type UploadError } from "@/lib/store";
import { useContent, useLanguage } from "@/lib/i18n";
import { formatEnglishDate, formatKhmerDate, formatNumber, formatTime } from "@/lib/khmer";
import { PLANS, musicTracks, sampleInvitation, type Tier } from "@/lib/mock-data";
import type { Draft } from "@/lib/store";
import { editorContent } from "./content";
import { Alert, EditorCard, TextArea, TextField, fieldClass } from "./fields";
import { newId } from "./useDraft";

export type SectionProps = {
  draft: Draft;
  update: (patch: Partial<Draft> | ((d: Draft) => Partial<Draft>)) => void;
  tier: Tier;
};

/* a. Couple */
export function CoupleSection({ draft, update }: SectionProps) {
  const c = useContent(editorContent).couple;
  const side = (who: "groom" | "bride") => {
    const p = draft.parents[who];
    const sample = sampleInvitation.parents[who];
    const setParent = (key: keyof typeof p, value: string) =>
      update((d) => ({ parents: { ...d.parents, [who]: { ...d.parents[who], [key]: value } } }));
    const nameKm = who === "groom" ? "groomKm" : "brideKm";
    const nameEn = who === "groom" ? "groomEn" : "brideEn";
    return (
      <EditorCard>
        <h3 className="font-bold text-maroon">{c[who]}</h3>
        <TextField id={`${who}-km`} label={c.nameKm} lang="km" placeholder={sampleInvitation[nameKm]} value={draft[nameKm]} onChange={(e) => update({ [nameKm]: e.target.value })} />
        <TextField id={`${who}-en`} label={c.nameEn} lang="en" autoCapitalize="words" placeholder={sampleInvitation[nameEn]} value={draft[nameEn]} onChange={(e) => update({ [nameEn]: e.target.value })} />
        <div className="grid gap-2.5 sm:grid-cols-2">
          <TextField id={`${who}-f-km`} label={c.fatherKm} lang="km" placeholder={sample.fatherKm} value={p.fatherKm} onChange={(e) => setParent("fatherKm", e.target.value)} />
          <TextField id={`${who}-m-km`} label={c.motherKm} lang="km" placeholder={sample.motherKm} value={p.motherKm} onChange={(e) => setParent("motherKm", e.target.value)} />
          <TextField id={`${who}-f-en`} label={c.fatherEn} lang="en" placeholder={sample.fatherEn} value={p.fatherEn} onChange={(e) => setParent("fatherEn", e.target.value)} />
          <TextField id={`${who}-m-en`} label={c.motherEn} lang="en" placeholder={sample.motherEn} value={p.motherEn} onChange={(e) => setParent("motherEn", e.target.value)} />
        </div>
      </EditorCard>
    );
  };
  return (
    <div className="grid gap-3.5 xl:grid-cols-2">
      {side("groom")}
      {side("bride")}
    </div>
  );
}

/* b. Date and time */
export function DateSection({ draft, update }: SectionProps) {
  const c = useContent(editorContent).date;
  return (
    <EditorCard className="max-w-[560px]">
      <TextField id="date" type="date" label={c.date} value={draft.eventDate} onChange={(e) => update({ eventDate: e.target.value })} />
      <div className="rounded-card bg-rose-soft/60 p-3 text-center" aria-live="polite">
        <div className="text-xs text-muted">{c.showsAs}</div>
        {draft.eventDate ? (
          <>
            <div lang="km" className="text-[17px] leading-[1.8] font-semibold text-maroon lg:text-lg">{formatKhmerDate(draft.eventDate)}</div>
            <div lang="en" className="text-xs text-muted lg:text-[13px]">{formatEnglishDate(draft.eventDate)}</div>
          </>
        ) : (
          <div className="text-lg text-maroon">—</div>
        )}
      </div>
      <TextField id="time" type="time" label={c.time} value={draft.startTime} onChange={(e) => update({ startTime: e.target.value })} />
      {draft.startTime && (
        <p className="-mt-1 text-[13px] text-muted">
          <span lang="km">{formatTime(draft.startTime, "km")}</span> · <span lang="en">{formatTime(draft.startTime, "en")}</span>
        </p>
      )}
    </EditorCard>
  );
}

/* c. Venue — mock map; the real app uses the Google Maps place picker. */
const MAP_BOUNDS = { latMin: 11.55, latMax: 11.62, lngMin: 104.88, lngMax: 104.97 };

export function VenueSection({ draft, update }: SectionProps) {
  const c = useContent(editorContent).venue;
  const x = ((draft.lng - MAP_BOUNDS.lngMin) / (MAP_BOUNDS.lngMax - MAP_BOUNDS.lngMin)) * 100;
  const y = ((MAP_BOUNDS.latMax - draft.lat) / (MAP_BOUNDS.latMax - MAP_BOUNDS.latMin)) * 100;
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${draft.lat},${draft.lng}`;

  function movePin(e: React.MouseEvent<HTMLButtonElement>) {
    if (e.detail === 0) return; // Enter/Space: arrow keys handle keyboard users
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    update({
      lng: +(MAP_BOUNDS.lngMin + px * (MAP_BOUNDS.lngMax - MAP_BOUNDS.lngMin)).toFixed(5),
      lat: +(MAP_BOUNDS.latMax - py * (MAP_BOUNDS.latMax - MAP_BOUNDS.latMin)).toFixed(5),
    });
  }

  function nudgePin(e: React.KeyboardEvent<HTMLButtonElement>) {
    const step = 0.0015;
    const d = ({ ArrowUp: [step, 0], ArrowDown: [-step, 0], ArrowLeft: [0, -step], ArrowRight: [0, step] } as Record<string, number[]>)[e.key];
    if (!d) return;
    e.preventDefault();
    const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
    update({
      lat: +clamp(draft.lat + d[0], MAP_BOUNDS.latMin, MAP_BOUNDS.latMax).toFixed(5),
      lng: +clamp(draft.lng + d[1], MAP_BOUNDS.lngMin, MAP_BOUNDS.lngMax).toFixed(5),
    });
  }

  return (
    <div className="flex flex-col gap-3.5">
      <EditorCard>
        <div className="grid gap-2.5 lg:grid-cols-2">
          <TextField id="venue-km" lang="km" label={c.nameKm} placeholder={sampleInvitation.venueNameKm} value={draft.venueNameKm} onChange={(e) => update({ venueNameKm: e.target.value })} />
          <TextField id="venue-en" lang="en" label={c.nameEn} placeholder={sampleInvitation.venueNameEn} value={draft.venueNameEn} onChange={(e) => update({ venueNameEn: e.target.value })} />
          <TextField id="addr-km" lang="km" label={c.addressKm} placeholder={sampleInvitation.venueAddressKm} value={draft.venueAddressKm} onChange={(e) => update({ venueAddressKm: e.target.value })} />
          <TextField id="addr-en" lang="en" label={c.addressEn} placeholder={sampleInvitation.venueAddressEn} value={draft.venueAddressEn} onChange={(e) => update({ venueAddressEn: e.target.value })} />
        </div>
      </EditorCard>
      <EditorCard className="gap-0 overflow-hidden p-0 lg:p-0">
        <button
          type="button"
          onClick={movePin}
          onKeyDown={nudgePin}
          aria-label={c.mapLabel}
          aria-describedby="map-coords"
          className="relative h-[170px] w-full cursor-crosshair overflow-hidden bg-[#e8e4d8] lg:h-[220px]"
        >
          {/* Stylised river and roads */}
          <span aria-hidden className="absolute -inset-x-5 top-[70px] h-[34px] -rotate-12 bg-[#b9d3dc]" />
          <span aria-hidden className="absolute inset-y-0 left-[15%] w-2.5 bg-white" />
          <span aria-hidden className="absolute inset-x-0 top-[130px] h-2 bg-white" />
          <span aria-hidden className="absolute inset-y-0 left-[60%] w-2 bg-white" />
          <span aria-hidden className="absolute -translate-x-1/2 -translate-y-full text-maroon" style={{ left: `${x}%`, top: `${y}%` }}>
            <PinIcon size={34} fill="currentColor" stroke="white" strokeWidth={1.2} />
          </span>
          <span className="absolute right-2 bottom-2 rounded-lg bg-white px-2 py-1 text-[11px] text-ink-soft">{c.tapPin}</span>
        </button>
        <div className="flex items-center justify-between gap-2 px-3.5 py-3">
          <span id="map-coords" lang="en" aria-live="polite" className="text-[13px] text-muted">
            {draft.lat.toFixed(4)}° N, {draft.lng.toFixed(4)}° E
          </span>
          <a href={directions} target="_blank" rel="noreferrer" className="flex min-h-11 items-center text-[13px] font-semibold text-maroon">
            {c.directions}
          </a>
        </div>
      </EditorCard>
    </div>
  );
}

/* d. Schedule */
export function ScheduleSection({ draft, update }: SectionProps) {
  const c = useContent(editorContent).schedule;
  const { lang } = useLanguage();
  const listRef = useRef<HTMLDivElement>(null);
  const prevCount = useRef(draft.schedule.length);
  useEffect(() => {
    if (draft.schedule.length > prevCount.current) {
      const rows = listRef.current?.querySelectorAll<HTMLElement>("[data-row]");
      rows?.[rows.length - 1]?.querySelector("input")?.focus();
    }
    prevCount.current = draft.schedule.length;
  }, [draft.schedule.length]);
  const setItem = (i: number, key: "time" | "titleKm" | "titleEn", value: string) =>
    update((d) => ({ schedule: d.schedule.map((ev, j) => (j === i ? { ...ev, [key]: value } : ev)) }));

  return (
    <div ref={listRef} className="flex flex-col gap-2.5">
      {draft.schedule.length === 0 && <p className="rounded-card bg-white p-4 text-sm text-muted">{c.empty}</p>}
      {draft.schedule.map((ev, i) => {
        const n = formatNumber(i + 1, lang);
        return (
          <EditorCard key={ev.id ?? i} data-row className="flex-row items-start gap-2.5">
            <input
              type="time"
              value={ev.time}
              onChange={(e) => setItem(i, "time", e.target.value)}
              aria-label={`${c.time} ${n}`}
              className={cn(fieldClass, "w-28 shrink-0 px-2 lg:w-32")}
            />
            <div className="flex min-w-0 grow flex-col gap-1.5 lg:flex-row">
              <input lang="km" value={ev.titleKm} onChange={(e) => setItem(i, "titleKm", e.target.value)} aria-label={`${c.titleKm} ${n}`} className={cn(fieldClass, "lg:flex-1")} />
              <input lang="en" value={ev.titleEn} onChange={(e) => setItem(i, "titleEn", e.target.value)} aria-label={`${c.titleEn} ${n}`} className={cn(fieldClass, "text-[13px] lg:flex-1 lg:text-[15px]")} />
            </div>
            <button
              type="button"
              onClick={() => update((d) => ({ schedule: d.schedule.filter((_, j) => j !== i) }))}
              aria-label={`${c.remove} ${n}`}
              className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-card bg-sand-light text-maroon"
            >
              <CloseIcon size={16} />
            </button>
          </EditorCard>
        );
      })}
      <button
        type="button"
        onClick={() => update((d) => ({ schedule: [...d.schedule, { id: newId("ev"), time: "", titleKm: "", titleEn: "" }] }))}
        className="flex min-h-[50px] w-full cursor-pointer items-center justify-center gap-2 rounded-card border-[1.5px] border-dashed border-gold bg-white font-semibold text-maroon lg:w-auto lg:self-start lg:px-5"
      >
        <span aria-hidden className="text-lg">+</span>
        {c.add}
      </button>
    </div>
  );
}

/* e. Photos */
export function PhotosSection({ draft, update, tier }: SectionProps) {
  const c = useContent(editorContent).photos;
  const { lang } = useLanguage();
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<UploadError | null>(null);
  const [skipped, setSkipped] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const max = PLANS[tier].maxPhotos;
  const photos = draft.photos;
  const full = photos.length >= max;
  const overLimit = photos.length > max; // e.g. switched from a Premium to a Basic template
  const coverId = draft.coverPhotoId ?? photos[0]?.id;

  async function onFiles(files: FileList | null) {
    const list = files ? Array.from(files) : [];
    if (input.current) input.current.value = "";
    setError(null);
    const room = Math.max(max - photos.length, 0);
    setSkipped(list.length > room);
    setUploading(true);
    for (const [i, file] of list.slice(0, room).entries()) {
      const result = await uploadPhoto(draft.id, file, photos.length + i);
      if (!result.ok) {
        setError(result.error);
        break;
      }
      const photo = result.photo;
      // Re-check here: two uploads started together must not exceed the limit.
      update((d) =>
        d.photos.length >= max
          ? {}
          : {
              photos: [...d.photos, { ...photo, position: d.photos.length }],
              coverPhotoId: d.coverPhotoId ?? photo.id,
            },
      );
    }
    setUploading(false);
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= photos.length || from === to) return;
    update((d) => {
      const next = [...d.photos];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return { photos: next.map((p, i) => ({ ...p, position: i })) };
    });
  }

  function remove(id: string) {
    update((d) => {
      const next = d.photos.filter((p) => p.id !== id).map((p, i) => ({ ...p, position: i }));
      return { photos: next, coverPhotoId: d.coverPhotoId === id ? (next[0]?.id ?? null) : d.coverPhotoId };
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-between gap-2 text-[13px] text-muted">
        <span aria-live="polite">{c.count(formatNumber(photos.length, lang), formatNumber(max, lang))}</span>
        {photos.length > 1 && <span className="text-right">{c.tapCover}</span>}
      </div>

      <ul className="grid grid-cols-3 gap-2 lg:grid-cols-[repeat(auto-fill,minmax(140px,1fr))] lg:gap-3">
        {photos.map((p, i) => {
          const isCover = p.id === coverId;
          const n = formatNumber(i + 1, lang);
          return (
            <li
              key={p.id}
              draggable
              onDragStart={() => setDragIndex(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragIndex !== null) move(dragIndex, i);
                setDragIndex(null);
              }}
              onDragEnd={() => setDragIndex(null)}
              className={cn("group relative h-[110px] overflow-hidden rounded-card lg:h-40", dragIndex === i && "opacity-50", i >= max && "opacity-40")}
            >
              <button
                type="button"
                onClick={() => update({ coverPhotoId: p.id })}
                aria-label={`${c.photoLabel(n)}${isCover ? ` · ${c.cover}` : ` · ${c.makeCover}`}`}
                aria-pressed={isCover}
                className={cn("block size-full cursor-pointer", isCover && "outline-[3px] -outline-offset-[3px] outline-gold")}
              >
                <img src={p.url} alt="" className="size-full object-cover" />
              </button>
              {isCover && (
                <span className="pointer-events-none absolute bottom-1.5 left-1.5 rounded-full bg-gold px-2 text-[11px] font-bold text-charcoal">{c.cover}</span>
              )}
              <button
                type="button"
                onClick={() => remove(p.id)}
                aria-label={`${c.remove} ${n}`}
                className="absolute top-1 right-1 flex size-8 cursor-pointer items-center justify-center rounded-full bg-charcoal/70 text-white after:absolute after:-inset-1.5"
              >
                <CloseIcon size={14} />
              </button>
              {/* Keyboard/touch alternative to drag-and-drop */}
              <div className="absolute right-1 bottom-1 flex gap-1">
                {i > 0 && (
                  <button type="button" onClick={() => move(i, i - 1)} aria-label={`${c.moveLeft} ${n}`} className="relative flex size-8 cursor-pointer items-center justify-center rounded-full bg-white/85 text-charcoal after:absolute after:-inset-1.5">‹</button>
                )}
                {i < photos.length - 1 && (
                  <button type="button" onClick={() => move(i, i + 1)} aria-label={`${c.moveRight} ${n}`} className="relative flex size-8 cursor-pointer items-center justify-center rounded-full bg-white/85 text-charcoal after:absolute after:-inset-1.5">›</button>
                )}
              </div>
            </li>
          );
        })}
        {!full && (
          <li>
            <button
              type="button"
              onClick={() => input.current?.click()}
              disabled={uploading}
              aria-busy={uploading}
              aria-label={uploading ? c.uploading : c.addLabel}
              className="flex h-[110px] w-full cursor-pointer flex-col items-center justify-center rounded-card border-[1.5px] border-dashed border-gold bg-white text-maroon lg:h-40"
            >
              <span aria-hidden className="text-2xl leading-none">{uploading ? "…" : "+"}</span>
              <span className="text-xs font-semibold">{uploading ? c.uploading : c.add}</span>
            </button>
          </li>
        )}
      </ul>
      <input ref={input} type="file" accept="image/jpeg,image/png" multiple hidden onChange={(e) => onFiles(e.target.files)} />

      <p className="text-xs text-muted">{c.note} {photos.length > 1 && c.dragHint}</p>
      {(full || overLimit) && <p className="text-[13px] text-gold-ink">{c.limitReached(formatNumber(max, lang))}</p>}
      {skipped && <p role="status" className="text-[13px] text-gold-ink">{c.someSkipped(formatNumber(max, lang))}</p>}
      {error && (
        <Alert title={c.errTitle} onDismiss={() => setError(null)} dismissLabel={c.dismiss}>
          {c.errors[error]}
        </Alert>
      )}
    </div>
  );
}

/* f. Music */
export function MusicSection({ draft, update, tier }: SectionProps) {
  const c = useContent(editorContent).music;
  const { lang, t } = useLanguage();
  const input = useRef<HTMLInputElement>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canUpload = PLANS[tier].customMusic;
  const errs = useContent(editorContent).photos;
  const customSelected = !!draft.customMusicName && draft.musicUrl === `custom:${draft.customMusicName}`;

  const [uploading, setUploading] = useState(false);
  async function onFile(file: File | undefined) {
    if (input.current) input.current.value = "";
    setError(null);
    if (!file) return;
    if (!canUpload) return setError(c.premiumOnly);
    if (!file.type.startsWith("audio/")) return setError(c.notAudio);
    if (file.size > MAX_UPLOAD_BYTES) return setError(c.tooBig);
    setUploading(true);
    const r = await uploadMusic(draft.id, file);
    setUploading(false);
    if (!r.ok) return setError(r.error === "premium" ? c.premiumOnly : r.error === "size" ? c.tooBig : r.error === "type" ? c.notAudio : errs.errors[r.error]);
    update({ customMusicName: r.name, musicUrl: r.musicUrl });
  }

  return (
    <div className="flex max-w-[560px] flex-col gap-2">
      <ul aria-label={c.groupLabel} className="flex flex-col gap-2">
        {musicTracks.map((tr) => {
          const on = draft.musicUrl === tr.url;
          const isPlaying = playing === tr.id;
          return (
            <li key={tr.id} className={cn("flex min-h-14 items-center gap-3 rounded-card border-[1.5px] bg-white py-2 pr-3 pl-2", on ? "border-maroon bg-rose-soft/40" : "border-line-strong")}>
              {/* Preview playback is simulated until the audio files are added. */}
              <button
                type="button"
                onClick={() => setPlaying(isPlaying ? null : tr.id)}
                aria-label={`${c.play}: ${lang === "km" ? tr.nameKm : tr.nameEn}`}
                aria-pressed={isPlaying}
                className={cn("flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full", on ? "bg-maroon text-white" : "bg-sand text-maroon")}
              >
                {isPlaying ? <span aria-hidden className="text-sm font-bold">❚❚</span> : <PlayIcon size={16} />}
              </button>
              <button
                type="button"
                aria-pressed={on}
                aria-label={`${c.select}: ${lang === "km" ? tr.nameKm : tr.nameEn}`}
                onClick={() => update({ musicUrl: tr.url })}
                className="flex min-h-11 grow cursor-pointer flex-col justify-center text-left"
              >
                <span className="text-sm font-semibold">{lang === "km" ? tr.nameKm : tr.nameEn}</span>
                <span className="text-xs text-muted">
                  {lang === "km" ? tr.styleKm : tr.styleEn} · <span lang="en">{tr.duration}</span>
                </span>
              </button>
              {on && <Badge tone="maroon" className="text-[11px]">{c.selected}</Badge>}
            </li>
          );
        })}
        {draft.customMusicName && (
          <li>
          <button
            type="button"
            aria-pressed={customSelected}
            onClick={() => update({ musicUrl: `custom:${draft.customMusicName}` })}
            className={cn("flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-card border-[1.5px] bg-white px-3 py-2 text-left", customSelected ? "border-maroon bg-rose-soft/40" : "border-line-strong")}
          >
            <span className="grow">
              <span className="block text-sm font-semibold">{c.uploaded}</span>
              <span lang="en" className="block truncate text-xs text-muted">{draft.customMusicName}</span>
            </span>
            {customSelected && <Badge tone="maroon" className="text-[11px]">{c.selected}</Badge>}
          </button>
          </li>
        )}
      </ul>

      <button
        type="button"
        onClick={() => (canUpload ? input.current?.click() : setError(c.premiumOnly))}
        aria-disabled={!canUpload || uploading}
        aria-busy={uploading}
        className={cn(
          "flex min-h-[50px] w-full cursor-pointer items-center justify-center gap-2 rounded-card border-[1.5px] border-dashed border-gold bg-white px-4 font-semibold text-maroon",
          !canUpload && "opacity-70",
        )}
      >
        <span aria-hidden className="text-lg">♪</span>
        {uploading ? errs.uploading : c.upload}
        <Badge tone="maroon" className="text-[11px]">{t.tier.premium}</Badge>
      </button>
      <input ref={input} type="file" accept="audio/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />
      {error && <Alert onDismiss={() => setError(null)} dismissLabel={t.common.close}>{error}</Alert>}

      <EditorCard className="mt-1.5 flex-row items-center justify-between gap-3">
        <div>
          <div id="mute-label" className="text-sm font-semibold">{c.muteDefault}</div>
          <div id="mute-hint" className="text-xs text-muted">{c.muteHint}</div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={draft.musicMutedDefault}
          aria-labelledby="mute-label"
          aria-describedby="mute-hint"
          onClick={() => update((d) => ({ musicMutedDefault: !d.musicMutedDefault }))}
          className={cn("relative h-8 w-[52px] shrink-0 cursor-pointer rounded-full transition-colors after:absolute after:-inset-1.5", draft.musicMutedDefault ? "bg-jade" : "bg-line-strong")}
        >
          <span aria-hidden className={cn("absolute top-1 size-6 rounded-full bg-white transition-[left]", draft.musicMutedDefault ? "left-6" : "left-1")} />
        </button>
      </EditorCard>
    </div>
  );
}

/* g. Gift */
export function GiftSection({ draft, update }: SectionProps) {
  const c = useContent(editorContent).gift;
  const errs = useContent(editorContent).photos;
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<UploadError | null>(null);

  const [uploading, setUploading] = useState(false);
  async function onFile(file: File | undefined) {
    if (input.current) input.current.value = "";
    setError(null);
    if (!file) return;
    setUploading(true);
    const result = await uploadGiftQr(draft.id, file);
    setUploading(false);
    if (!result.ok) return setError(result.error);
    update({ giftQrUrl: result.url });
  }

  return (
    <div className="flex flex-col gap-3.5">
      <EditorCard className="items-center lg:flex-row lg:items-center lg:gap-5">
        <p className="text-center text-[13px] text-muted lg:order-2 lg:text-left lg:text-sm">{c.hint}</p>
        <div className="w-[180px] shrink-0 rounded-card border border-line bg-white p-3">
          {draft.giftQrUrl ? (
            <img src={draft.giftQrUrl} alt={c.qrAlt} className="w-full rounded-md" />
          ) : (
            <>
              <div className="rounded-t-md bg-khqr p-1 text-center text-xs font-bold text-white">KHQR</div>
              <MockQr className="pt-2 pb-1 opacity-40" />
              <div className="text-center text-[11px] text-ink-soft">{c.sample}</div>
            </>
          )}
        </div>
      </EditorCard>
      <div className="flex gap-2">
        <Button variant="secondary" fullWidth disabled={uploading} onClick={() => input.current?.click()}>
          {uploading ? errs.uploading : draft.giftQrUrl ? c.replace : c.upload}
        </Button>
        {draft.giftQrUrl && (
          <Button variant="ghost" onClick={() => update({ giftQrUrl: null })}>{c.remove}</Button>
        )}
      </div>
      <input ref={input} type="file" accept="image/jpeg,image/png" hidden onChange={(e) => onFile(e.target.files?.[0])} />
      {error && (
        <Alert title={errs.errTitle} onDismiss={() => setError(null)} dismissLabel={errs.dismiss}>
          {errs.errors[error]}
        </Alert>
      )}
      <div className="grid gap-2.5 lg:grid-cols-2">
        <TextArea id="gift-km" lang="km" label={c.noteKm} value={draft.giftNoteKm ?? ""} onChange={(e) => update({ giftNoteKm: e.target.value || null })} />
        <TextArea id="gift-en" lang="en" label={c.noteEn} value={draft.giftNoteEn ?? ""} onChange={(e) => update({ giftNoteEn: e.target.value || null })} />
      </div>
    </div>
  );
}
