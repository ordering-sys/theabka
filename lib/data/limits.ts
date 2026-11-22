/** Client-side pre-checks. The database and storage buckets enforce the same rules. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const GIFT_QR_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MUSIC_TYPES = ["audio/mpeg", "audio/mp4", "audio/x-m4a", "audio/aac", "audio/ogg", "audio/wav"];

/** Signed URL lifetimes, in seconds. */
export const HOST_URL_TTL = 12 * 60 * 60;
export const GUEST_URL_TTL = 7 * 24 * 60 * 60;
