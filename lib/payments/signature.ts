import { createHmac, timingSafeEqual } from "node:crypto";
import { InvalidSignatureError } from "./types";

/**
 * Verify an HMAC signature over the exact raw request body.
 * Accepts hex or base64 digests, with or without a "sha256=" / "sha512=" prefix.
 * Throws InvalidSignatureError on any mismatch.
 */
export function verifyHmac(
  rawBody: string,
  signature: string | null,
  secret: string | undefined,
  algorithm: "sha256" | "sha512" = "sha256",
): void {
  if (!secret) throw new InvalidSignatureError("webhook_secret_not_configured");
  if (!signature) throw new InvalidSignatureError("missing_signature");
  const given = signature.trim().replace(/^sha(256|512)=/i, "");
  const digest = createHmac(algorithm, secret).update(rawBody, "utf8").digest();
  const candidates = [Buffer.from(given, "hex"), Buffer.from(given, "base64")];
  const ok = candidates.some((buf) => buf.length === digest.length && timingSafeEqual(buf, digest));
  if (!ok) throw new InvalidSignatureError();
}

/** For tests and the sandbox: the signature a sender should put in the header. */
export function signHmac(rawBody: string, secret: string, algorithm: "sha256" | "sha512" = "sha256"): string {
  return createHmac(algorithm, secret).update(rawBody, "utf8").digest("hex");
}

/** Name of the header carrying the webhook signature (configurable per provider). */
export function signatureHeaderName() {
  return (process.env.PAYMENT_WEBHOOK_SIGNATURE_HEADER || "x-signature").toLowerCase();
}
