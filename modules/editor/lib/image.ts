"use client";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const IMAGE_TYPES = ["image/jpeg", "image/png"];

export type UploadError = "type" | "size" | "read";

/**
 * Check and shrink an image to a small JPEG data URL so a few photos fit in
 * localStorage. Phase 7 uploads the original to Supabase Storage instead.
 */
export async function prepareImage(file: File, maxSide = 900): Promise<{ url: string } | { error: UploadError }> {
  if (!IMAGE_TYPES.includes(file.type)) return { error: "type" };
  if (file.size > MAX_UPLOAD_BYTES) return { error: "size" };
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    // PNG keeps sharp edges for QR codes; photos compress well as JPEG.
    const type = file.type === "image/png" && maxSide <= 600 ? "image/png" : "image/jpeg";
    return { url: canvas.toDataURL(type, 0.82) };
  } catch {
    return { error: "read" };
  }
}
