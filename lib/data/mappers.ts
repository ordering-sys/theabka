import type {
  InvitationRow,
  InvitationWritable,
  MusicTrackRow,
  PhotoRow,
  PlanRow,
  RsvpRow,
  TemplateRow,
} from "@/lib/supabase/database.types";
import { urlToRef } from "./storage-refs";
import type { Draft, Invitation, MusicTrack, Photo, Rsvp, ScheduleItem, Template } from "./types";

type Parents = Invitation["parents"];
type ParentPair = Parents["groom"];

const emptyPair: ParentPair = { fatherKm: "", motherKm: "", fatherEn: "", motherEn: "" };

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function toPair(v: unknown): ParentPair {
  if (!v || typeof v !== "object") return { ...emptyPair };
  const o = v as Record<string, unknown>;
  return { fatherKm: str(o.fatherKm), motherKm: str(o.motherKm), fatherEn: str(o.fatherEn), motherEn: str(o.motherEn) };
}

function toParents(v: unknown): Parents {
  const o = v && typeof v === "object" ? (v as Record<string, unknown>) : {};
  return { groom: toPair(o.groom), bride: toPair(o.bride) };
}

function toSchedule(v: unknown): ScheduleItem[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
    .map((x) => ({
      ...(typeof x.id === "string" ? { id: x.id } : {}),
      time: str(x.time),
      titleKm: str(x.titleKm),
      titleEn: str(x.titleEn),
    }));
}

/** Resolved URLs for the storage-backed fields (signed), keyed by the stored ref. */
export type ResolvedUrls = Map<string, string | null>;

function resolve(ref: string | null, urls: ResolvedUrls): string | null {
  if (!ref) return null;
  return urls.has(ref) ? (urls.get(ref) ?? null) : ref;
}

/**
 * musicMode "sentinel" (host editor): the uploaded song is shown as "custom:<name>",
 * the convention the editor already uses. "url" (guest page): a playable signed URL.
 */
export type MusicMode = "sentinel" | "url";

function musicUrlFor(row: InvitationRow, urls: ResolvedUrls, mode: MusicMode): string | null {
  if (!row.music_url) return null;
  if (row.music_url.startsWith("storage://")) {
    return mode === "sentinel" ? `custom:${row.custom_music_name ?? "song"}` : resolve(row.music_url, urls);
  }
  return row.music_url;
}

export function rowToInvitation(row: InvitationRow, urls: ResolvedUrls, musicMode: MusicMode = "sentinel"): Invitation {
  return {
    id: row.id,
    userId: row.user_id,
    templateId: row.template_id,
    slug: row.slug,
    status: row.status,
    brideKm: row.bride_km,
    brideEn: row.bride_en,
    groomKm: row.groom_km,
    groomEn: row.groom_en,
    parents: toParents(row.parents),
    eventDate: row.event_date ?? "",
    startTime: row.start_time ? row.start_time.slice(0, 5) : "",
    venueNameKm: row.venue_name_km,
    venueNameEn: row.venue_name_en,
    venueAddressKm: row.venue_address_km,
    venueAddressEn: row.venue_address_en,
    lat: row.lat ?? 0,
    lng: row.lng ?? 0,
    schedule: toSchedule(row.schedule),
    coverPhotoId: row.cover_photo_id,
    musicUrl: musicUrlFor(row, urls, musicMode),
    musicMutedDefault: row.music_muted_default,
    giftQrUrl: resolve(row.gift_qr_url, urls),
    giftNoteKm: row.gift_note_km,
    giftNoteEn: row.gift_note_en,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function rowToPhoto(row: Pick<PhotoRow, "id" | "invitation_id" | "storage_path" | "position">, urls: ResolvedUrls): Photo {
  return {
    id: row.id,
    invitationId: row.invitation_id,
    url: urls.get(`storage://photos/${row.storage_path}`) ?? "",
    position: row.position,
  };
}

export function rowToDraft(
  row: InvitationRow,
  photos: Pick<PhotoRow, "id" | "invitation_id" | "storage_path" | "position">[],
  urls: ResolvedUrls,
  musicMode: MusicMode = "sentinel",
): Draft {
  return {
    ...rowToInvitation(row, urls, musicMode),
    photos: photos
      .filter((p) => p.invitation_id === row.id)
      .sort((a, b) => a.position - b.position)
      .map((p) => rowToPhoto(p, urls)),
    customMusicName: row.custom_music_ref ? row.custom_music_name : null,
    paidTier: row.paid_tier,
    purgedAt: row.purged_at ?? null,
  };
}

/** Refs to sign for a set of invitations and photos. */
export function refsFor(
  rows: Pick<InvitationRow, "music_url" | "gift_qr_url">[],
  photos: Pick<PhotoRow, "storage_path">[],
  musicMode: MusicMode = "sentinel",
) {
  return [
    ...rows.flatMap((r) => [musicMode === "url" ? r.music_url : null, r.gift_qr_url]),
    ...photos.map((p) => `storage://photos/${p.storage_path}`),
  ];
}

/** True for values that only live in the browser (data:/blob: URLs from the prototype). */
function isLocalOnly(url: string | null | undefined) {
  return !!url && (url.startsWith("data:") || url.startsWith("blob:"));
}

/**
 * Host-editable columns from a Draft. Status, publish and payment fields are
 * never sent. Browser-only values (data:/blob: URLs) are skipped, so upload
 * files with uploadGiftQr()/uploadMusic() rather than storing data URLs.
 * "custom:<name>" in musicUrl selects the uploaded song (resolved by the DB).
 */
export function draftToWritable(d: Draft): Partial<InvitationWritable> {
  const out: Partial<InvitationWritable> = {
    template_id: d.templateId,
    slug: d.slug.trim().toLowerCase(),
    bride_km: d.brideKm,
    bride_en: d.brideEn,
    groom_km: d.groomKm,
    groom_en: d.groomEn,
    parents: d.parents,
    event_date: d.eventDate || null,
    start_time: d.startTime || null,
    venue_name_km: d.venueNameKm,
    venue_name_en: d.venueNameEn,
    venue_address_km: d.venueAddressKm,
    venue_address_en: d.venueAddressEn,
    lat: Number.isFinite(d.lat) ? d.lat : null,
    lng: Number.isFinite(d.lng) ? d.lng : null,
    schedule: d.schedule.map((s) => ({ ...s })),
    cover_photo_id: d.coverPhotoId && d.photos.some((p) => p.id === d.coverPhotoId) ? d.coverPhotoId : null,
    music_muted_default: d.musicMutedDefault,
    gift_note_km: d.giftNoteKm,
    gift_note_en: d.giftNoteEn,
  };
  if (!isLocalOnly(d.musicUrl)) out.music_url = urlToRef(d.musicUrl);
  if (!isLocalOnly(d.giftQrUrl)) out.gift_qr_url = urlToRef(d.giftQrUrl);
  return out;
}

export function rowToRsvp(row: RsvpRow): Rsvp {
  return {
    id: row.id,
    invitationId: row.invitation_id,
    guestName: row.guest_name,
    attending: row.attending,
    partySize: row.party_size,
    message: row.message,
    createdAt: toPhnomPenhDate(row.created_at),
    invitedGuestId: row.invited_guest_id ?? null,
  };
}

/** YYYY-MM-DD in Cambodia time (the mock Rsvp.createdAt format). */
export function toPhnomPenhDate(iso: string | Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Phnom_Penh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(typeof iso === "string" ? new Date(iso) : iso);
}

export function rowToTemplate(row: TemplateRow, plans: PlanRow[]): Template {
  const plan = plans.find((p) => p.tier === row.tier);
  const theme = (row.theme && typeof row.theme === "object" && !Array.isArray(row.theme) ? row.theme : {}) as Record<string, unknown>;
  return {
    id: row.id,
    nameKm: row.name_km,
    nameEn: row.name_en,
    eventType: row.event_type,
    tier: row.tier,
    priceUsd: plan ? plan.price_usd_cents / 100 : 0,
    thumbnailUrl: row.thumbnail_url,
    theme: {
      bg: str(theme.bg), fg: str(theme.fg), accent: str(theme.accent), ctaFg: str(theme.ctaFg),
      ...(theme.decor === "pavilion" ? { decor: "pavilion" as const } : {}),
    },
  };
}

export function rowToMusicTrack(row: MusicTrackRow): MusicTrack {
  return {
    id: row.id,
    nameKm: row.name_km,
    nameEn: row.name_en,
    styleKm: row.style_km,
    styleEn: row.style_en,
    duration: row.duration,
    url: row.url,
  };
}
