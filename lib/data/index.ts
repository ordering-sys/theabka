/**
 * Browser data-access layer backed by Supabase. Same names as lib/store.ts
 * (async, same Draft/Rsvp shapes); components go through lib/store.ts, not this file.
 * Everything here runs with the anon key under RLS; nothing
 * here can publish an invitation (only the payment webhook can).
 *
 * Server-side counterparts (getSession, getPublishedBySlug, publish) live in
 * lib/data/server.ts.
 */
import { blankInvitationContent } from "@/lib/mock-data";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { InvitationGuestRow, InvitationRow, PhotoRow } from "@/lib/supabase/database.types";
import {
  GIFT_QR_TYPES,
  HOST_URL_TTL,
  MAX_UPLOAD_BYTES,
  MUSIC_TYPES,
  PHOTO_TYPES,
} from "./limits";
import { draftToWritable, refsFor, rowToDraft, rowToMusicTrack, rowToRsvp, rowToTemplate } from "./mappers";
import { newObjectPath, parseRef, signRefs, toRef, type Bucket } from "./storage-refs";
import type {
  Draft,
  InvitationGuest,
  KhqrCharge,
  NewInvitationGuest,
  MusicTrack,
  PaymentCurrency,
  PaymentStatusResult,
  Photo,
  Rsvp,
  Session,
  Template,
  UploadError,
  UploadResult,
} from "./types";

export type * from "./types";

const PHOTO_COLUMNS = "id, invitation_id, storage_path, position";

function db() {
  return getSupabaseBrowserClient();
}

async function currentUserId(): Promise<string | null> {
  const { data } = await db().auth.getSession();
  return data.session?.user.id ?? null;
}

async function draftsFromRows(rows: InvitationRow[]): Promise<Draft[]> {
  if (rows.length === 0) return [];
  const { data: photos } = await db()
    .from("photos")
    .select(PHOTO_COLUMNS)
    .in("invitation_id", rows.map((r) => r.id))
    .order("position");
  const urls = await signRefs(db(), refsFor(rows, photos ?? []), HOST_URL_TTL);
  return rows.map((r) => rowToDraft(r, photos ?? [], urls));
}

// ---------------------------------------------------------------------------
// Session (browser). See lib/auth/client.ts for sign-in helpers.
// ---------------------------------------------------------------------------

/* ─── Personal invitation guests (Premium) ─────────────────────────── */

function rowToGuest(row: InvitationGuestRow): InvitationGuest {
  return {
    id: row.id,
    invitationId: row.invitation_id,
    title: row.title,
    nameKm: row.name_km,
    nameEn: row.name_en,
    companion: row.companion,
    code: row.code,
    sentAt: row.sent_at,
    openedAt: row.opened_at,
  };
}

/** The host's named guests for one invitation, in the order they were added. */
export async function listGuests(invitationId: string): Promise<InvitationGuest[]> {
  const { data, error } = await db()
    .from("invitation_guests")
    .select("*")
    .eq("invitation_id", invitationId)
    .order("created_at", { ascending: true });
  if (error || !data) return [];
  return data.map(rowToGuest);
}

/**
 * Add guests (one or many). Throws "guests_require_premium", "guest_limit_reached"
 * or "invitation_ended" from the database guard.
 */
export async function addGuests(invitationId: string, guests: NewInvitationGuest[]): Promise<InvitationGuest[]> {
  const rows = guests
    .map((g) => ({
      invitation_id: invitationId,
      title: g.title,
      name_km: g.nameKm.trim().slice(0, 100),
      name_en: g.nameEn.trim().slice(0, 100),
      companion: g.companion,
    }))
    .filter((r) => r.name_km.length > 0);
  if (!rows.length) return [];
  const { data, error } = await db().from("invitation_guests").insert(rows).select("*");
  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToGuest);
}

/** Change a guest's title, names or companion. Their code (and so their link) stays the same. */
export async function updateGuest(guestId: string, fields: NewInvitationGuest): Promise<InvitationGuest> {
  const nameKm = fields.nameKm.trim().slice(0, 100);
  if (!nameKm) throw new Error("name_required");
  const { data, error } = await db()
    .from("invitation_guests")
    .update({ title: fields.title, name_km: nameKm, name_en: fields.nameEn.trim().slice(0, 100), companion: fields.companion })
    .eq("id", guestId)
    .select("*")
    .single();
  if (error || !data) throw new Error(error?.message ?? "update_failed");
  return rowToGuest(data);
}

export async function deleteGuest(guestId: string): Promise<boolean> {
  const { error, count } = await db().from("invitation_guests").delete({ count: "exact" }).eq("id", guestId);
  return !error && count === 1;
}

/** The host shared this guest's link. */
export async function markGuestSent(guestId: string): Promise<void> {
  await db().from("invitation_guests").update({ sent_at: new Date().toISOString() }).eq("id", guestId).is("sent_at", null);
}

/** A guest opened their personal link (first time only; the database ignores repeats). */
export async function markGuestOpened(slug: string, code: string): Promise<void> {
  await db().rpc("mark_guest_opened", { p_slug: slug, p_code: code });
}

/** Same shape as getSessionMock(). Reads the locally stored session (no network). */
export async function getSession(): Promise<Session | null> {
  const { data } = await db().auth.getSession();
  const user = data.session?.user;
  if (!user) return null;
  const name = String(user.user_metadata?.full_name ?? user.user_metadata?.name ?? "").trim();
  return {
    userId: user.id,
    ...(user.email ? { email: user.email } : {}),
    ...(name ? { name } : {}),
    provider: user.app_metadata?.provider === "google" ? "google" : "email",
  };
}

// ---------------------------------------------------------------------------
// Invitations
// ---------------------------------------------------------------------------

/** The signed-in host's invitation with photos, or undefined if missing / not theirs. */
export async function getDraft(id: string): Promise<Draft | undefined> {
  const { data, error } = await db().from("invitations").select("*").eq("id", id).maybeSingle();
  if (error || !data) return undefined;
  const [draft] = await draftsFromRows([data]);
  return draft;
}

/**
 * Save the host-editable fields and sync photo order/deletions. Returns false
 * on any failure (network, RLS, plan rule). Never changes status: publishing
 * happens only through the payment webhook. Photos must be added with
 * uploadPhoto(); photos in the draft whose ids aren't in the DB are ignored.
 */
export async function saveDraft(draft: Draft): Promise<boolean> {
  const supabase = db();
  const { data: existing, error: listError } = await supabase
    .from("photos")
    .select("id, storage_path, position")
    .eq("invitation_id", draft.id);
  if (listError) return false;

  const order = new Map(draft.photos.map((p, i) => [p.id, i]));
  const removed = (existing ?? []).filter((p) => !order.has(p.id));
  const moved = (existing ?? []).filter((p) => order.has(p.id) && order.get(p.id) !== p.position);

  if (removed.length) {
    const { error } = await supabase.from("photos").delete().in("id", removed.map((p) => p.id));
    if (error) return false;
    // Best effort; orphaned files are harmless and can be cleaned up later.
    void supabase.storage.from("photos").remove(removed.map((p) => p.storage_path));
  }
  const moves = await Promise.all(
    moved.map((p) => supabase.from("photos").update({ position: order.get(p.id)! }).eq("id", p.id)),
  );
  if (moves.some((r) => r.error)) return false;

  const { error } = await supabase.from("invitations").update(draftToWritable(draft)).eq("id", draft.id);
  return !error;
}

/**
 * New, empty draft from a template (like createDraftMock): the host fills in
 * their own names, date and venue. No photos, no gift QR.
 * Throws if not signed in.
 */
export async function createDraft(templateId: string): Promise<Draft> {
  const userId = await currentUserId();
  if (!userId) throw new Error("not_signed_in");
  const s = blankInvitationContent;
  const { data, error } = await db()
    .from("invitations")
    .insert({
      user_id: userId,
      template_id: templateId,
      bride_km: s.brideKm,
      bride_en: s.brideEn,
      groom_km: s.groomKm,
      groom_en: s.groomEn,
      parents: s.parents,
      event_date: s.eventDate || null,
      start_time: s.startTime || null,
      venue_name_km: s.venueNameKm,
      venue_name_en: s.venueNameEn,
      venue_address_km: s.venueAddressKm,
      venue_address_en: s.venueAddressEn,
      lat: s.lat,
      lng: s.lng,
      schedule: s.schedule,
      music_url: s.musicUrl,
      music_muted_default: s.musicMutedDefault,
      gift_note_km: s.giftNoteKm,
      gift_note_en: s.giftNoteEn,
    })
    .select("*")
    .single();
  if (error || !data) {
    // Keep the Postgres/PostgREST code (e.g. 42501 permission denied) so the cause is visible.
    console.error("createDraft failed", error);
    throw new Error(error ? `${error.code ?? "db"}: ${error.message}` : "create_failed");
  }
  return rowToDraft(data, [], new Map());
}

/**
 * Delete a draft and its files (live invitations can't be deleted by the client).
 * Files go first: they sit under <user_id>/<invitation_id>/ in each bucket, and the
 * owner's storage policies allow listing and removing them.
 */
export async function deleteDraft(id: string): Promise<boolean> {
  const supabase = db();
  const { data: row } = await supabase.from("invitations").select("user_id, status").eq("id", id).maybeSingle();
  if (!row || row.status !== "draft") return false;
  const folder = `${row.user_id}/${id}`;
  await Promise.all(
    (["photos", "music", "gift-qr"] as const).map(async (bucket) => {
      const { data } = await supabase.storage.from(bucket).list(folder, { limit: 1000 });
      const files = (data ?? []).filter((f) => f.id).map((f) => `${folder}/${f.name}`);
      if (files.length) await supabase.storage.from(bucket).remove(files);
    }),
  );
  const { error, count } = await supabase.from("invitations").delete({ count: "exact" }).eq("id", id);
  return !error && count === 1;
}

/** All of the signed-in host's invitations, newest first. `userId` is optional; RLS already scopes to the caller. */
export async function listInvitations(userId?: string): Promise<Draft[]> {
  let query = db().from("invitations").select("*").order("created_at", { ascending: false });
  if (userId) query = query.eq("user_id", userId);
  const { data, error } = await query;
  if (error || !data) return [];
  return draftsFromRows(data);
}

// ---------------------------------------------------------------------------
// Guest actions (anon key; RLS allows these for live invitations only)
// ---------------------------------------------------------------------------

/** Count an invitation open. Counted once per browser tab session. Never throws. */
export async function addView(invitationId: string): Promise<void> {
  const key = `theabka.viewed.${invitationId}`;
  try {
    if (window.sessionStorage.getItem(key)) return;
    window.sessionStorage.setItem(key, "1");
  } catch {
    // sessionStorage blocked: count anyway.
  }
  try {
    await db().from("views").insert({ invitation_id: invitationId });
  } catch {
    // Not critical.
  }
}

/** Host only: number of opens. */
export async function getViewCount(invitationId: string): Promise<number> {
  const { count, error } = await db()
    .from("views")
    .select("id", { count: "exact", head: true })
    .eq("invitation_id", invitationId);
  return error ? 0 : (count ?? 0);
}

/** Host only: RSVPs of one of their invitations, newest first. */
export async function getRsvps(invitationId: string): Promise<Rsvp[]> {
  const { data, error } = await db()
    .from("rsvps")
    .select("*")
    .eq("invitation_id", invitationId)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map(rowToRsvp);
}

/**
 * Guest RSVP. Unlike addRsvpMock this can fail (draft invitation, invalid
 * input, network): it throws, so the UI can decide whether to still show the
 * thank-you state. Guests can't read RSVPs back, so the row is built locally.
 */
export async function addRsvp(rsvp: Omit<Rsvp, "id" | "createdAt">): Promise<Rsvp> {
  const id = crypto.randomUUID();
  const guestName = rsvp.guestName.trim().slice(0, 80);
  const message = rsvp.message?.trim().slice(0, 500) || null;
  const partySize = Math.min(10, Math.max(1, Math.round(rsvp.partySize)));
  const { error } = await db().from("rsvps").insert({
    id,
    invitation_id: rsvp.invitationId,
    guest_name: guestName,
    attending: rsvp.attending,
    party_size: partySize,
    message,
    ...(rsvp.invitedGuestId ? { invited_guest_id: rsvp.invitedGuestId } : {}),
  });
  if (error) throw new Error(error.message);
  return {
    id,
    invitationId: rsvp.invitationId,
    guestName,
    attending: rsvp.attending,
    partySize,
    message,
    createdAt: new Date().toISOString().slice(0, 10),
  };
}

// ---------------------------------------------------------------------------
// Uploads (Supabase Storage; buckets are private, URLs are signed)
// ---------------------------------------------------------------------------

function precheck(file: Blob, types: string[]): UploadError | null {
  if (!types.includes(file.type)) return "type";
  if (file.size > MAX_UPLOAD_BYTES) return "size";
  return null;
}

function mapError(message: string | undefined): UploadError {
  const m = message ?? "";
  if (m.includes("photo_limit_reached")) return "limit";
  if (m.includes("custom_music_requires_premium")) return "premium";
  if (m.includes("row-level security") || m.includes("Unauthorized") || m.includes("JWT")) return "auth";
  if (m.toLowerCase().includes("mime") || m.includes("invalid_mime_type")) return "type";
  if (m.toLowerCase().includes("size") || m.includes("Payload too large")) return "size";
  return "network";
}

async function putObject(
  bucket: Bucket,
  invitationId: string,
  file: File | Blob,
): Promise<{ path: string } | { error: UploadError }> {
  const userId = await currentUserId();
  if (!userId) return { error: "auth" };
  const path = newObjectPath(userId, invitationId, { name: (file as File).name, type: file.type });
  const { error } = await db().storage.from(bucket).upload(path, file, {
    contentType: file.type,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) return { error: mapError(error.message) };
  return { path };
}

async function signOne(bucket: Bucket, path: string) {
  const { data } = await db().storage.from(bucket).createSignedUrl(path, HOST_URL_TTL);
  return data?.signedUrl ?? null;
}

/**
 * Upload a photo and add it to the invitation (appended unless `position` is given).
 * The plan's photo limit is enforced by the database ("limit" error).
 */
export async function uploadPhoto(
  invitationId: string,
  file: File | Blob,
  position?: number,
): Promise<UploadResult<{ photo: Photo }>> {
  const bad = precheck(file, PHOTO_TYPES);
  if (bad) return { ok: false, error: bad };
  const put = await putObject("photos", invitationId, file);
  if ("error" in put) return { ok: false, error: put.error };

  let pos = position;
  if (pos === undefined) {
    const { count } = await db()
      .from("photos")
      .select("id", { count: "exact", head: true })
      .eq("invitation_id", invitationId);
    pos = count ?? 0;
  }
  const { data, error } = await db()
    .from("photos")
    .insert({ invitation_id: invitationId, storage_path: put.path, position: pos })
    .select(PHOTO_COLUMNS)
    .single();
  if (error || !data) {
    void db().storage.from("photos").remove([put.path]);
    return { ok: false, error: mapError(error?.message) };
  }
  const row = data as Pick<PhotoRow, "id" | "invitation_id" | "storage_path" | "position">;
  return {
    ok: true,
    photo: { id: row.id, invitationId: row.invitation_id, url: (await signOne("photos", put.path)) ?? "", position: row.position },
  };
}

/** Remove one photo (row and file). saveDraft() also does this for photos dropped from the draft. */
export async function deletePhoto(photoId: string): Promise<boolean> {
  const { data, error } = await db().from("photos").delete().eq("id", photoId).select("storage_path").maybeSingle();
  if (error || !data) return false;
  void db().storage.from("photos").remove([data.storage_path]);
  return true;
}

async function replaceRefColumn(
  invitationId: string,
  column: "gift_qr_url" | "custom_music_ref",
  ref: string | null,
  extra: { custom_music_name?: string | null; music_url?: string | null } = {},
) {
  const { data: before } = await db().from("invitations").select(column).eq("id", invitationId).maybeSingle();
  const { error } = await db()
    .from("invitations")
    .update({ [column]: ref, ...extra })
    .eq("id", invitationId);
  if (error) return error;
  const old = parseRef((before as Record<string, string | null> | null)?.[column]);
  if (old && toRef(old.bucket, old.path) !== ref) void db().storage.from(old.bucket).remove([old.path]);
  return null;
}

/**
 * Upload the host's own gift KHQR image and save it on the invitation.
 * Returns a signed URL to put in draft.giftQrUrl (saveDraft maps it back to the stored file).
 */
export async function uploadGiftQr(invitationId: string, file: File | Blob): Promise<UploadResult<{ url: string }>> {
  const bad = precheck(file, GIFT_QR_TYPES);
  if (bad) return { ok: false, error: bad };
  const put = await putObject("gift-qr", invitationId, file);
  if ("error" in put) return { ok: false, error: put.error };
  const error = await replaceRefColumn(invitationId, "gift_qr_url", toRef("gift-qr", put.path));
  if (error) {
    void db().storage.from("gift-qr").remove([put.path]);
    return { ok: false, error: mapError(error.message) };
  }
  return { ok: true, url: (await signOne("gift-qr", put.path)) ?? "" };
}

/**
 * Premium only: upload a custom song, store it and select it. Returns
 * `musicUrl` ("custom:<name>", the editor's convention), the file `name`, and a
 * playable signed `url` for previews.
 */
export async function uploadMusic(
  invitationId: string,
  file: File,
): Promise<UploadResult<{ url: string; name: string; musicUrl: string }>> {
  const bad = precheck(file, MUSIC_TYPES);
  if (bad) return { ok: false, error: bad };
  const put = await putObject("music", invitationId, file);
  if ("error" in put) return { ok: false, error: put.error };
  const name = file.name.slice(0, 200);
  const ref = toRef("music", put.path);
  const error = await replaceRefColumn(invitationId, "custom_music_ref", ref, { custom_music_name: name, music_url: ref });
  if (error) {
    void db().storage.from("music").remove([put.path]);
    return { ok: false, error: mapError(error.message) };
  }
  return { ok: true, name, musicUrl: `custom:${name}`, url: (await signOne("music", put.path)) ?? "" };
}

/** Remove the uploaded song (the selection falls back to no music). */
export async function removeCustomMusic(invitationId: string): Promise<boolean> {
  return (await replaceRefColumn(invitationId, "custom_music_ref", null)) === null;
}

/** Playable signed URL of the uploaded song, for the editor preview. */
export async function getCustomMusicUrl(invitationId: string): Promise<string | null> {
  const { data } = await db().from("invitations").select("custom_music_ref").eq("id", invitationId).maybeSingle();
  const ref = parseRef(data?.custom_music_ref);
  return ref ? signOne(ref.bucket, ref.path) : null;
}

// ---------------------------------------------------------------------------
// Catalogue
// ---------------------------------------------------------------------------

export async function listTemplates(): Promise<Template[]> {
  const [{ data: rows }, { data: plans }] = await Promise.all([
    db().from("templates").select("*").order("position"),
    db().from("plans").select("*"),
  ]);
  return (rows ?? []).map((r) => rowToTemplate(r, plans ?? []));
}

export async function listMusicTracks(): Promise<MusicTrack[]> {
  const { data } = await db().from("music_tracks").select("*").order("position");
  return (data ?? []).map(rowToMusicTrack);
}

// ---------------------------------------------------------------------------
// Payment (KHQR). The server computes the amount; the client only polls.
// ---------------------------------------------------------------------------

async function json<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string }).error ?? `http_${res.status}`);
  return body as T;
}

/**
 * Create a KHQR charge for publishing. Errors (thrown as Error.message):
 * not_signed_in, not_found, already_live, incomplete, too_many_photos,
 * custom_music_requires_premium, provider_error.
 */
/** `upgrade`: pay the difference to raise a live Basic invitation to Premium. */
export async function startKhqrPayment(invitationId: string, currency: PaymentCurrency = "USD", upgrade = false): Promise<KhqrCharge> {
  return json<KhqrCharge>(
    await fetch("/api/payments/khqr", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ invitationId, currency, ...(upgrade ? { upgrade: true } : {}) }),
    }),
  );
}

/** Poll every 2-3 s while the pay sheet is open; stop on paid/expired. */
export async function getPaymentStatus(paymentId: string): Promise<PaymentStatusResult> {
  return json<PaymentStatusResult>(
    await fetch(`/api/payments/status?id=${encodeURIComponent(paymentId)}`, { cache: "no-store" }),
  );
}
