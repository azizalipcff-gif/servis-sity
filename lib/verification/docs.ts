import { createClient } from "@/lib/supabase/client";

/**
 * Verification document uploads (private bucket).
 *
 * Files are stored in the PRIVATE `verification-documents` bucket under
 * `{owner_uid}/docs/…`. There is no public read policy; owners and admins view
 * documents through short-lived server-minted signed URLs only.
 */

export const VERIFICATION_BUCKET = "verification-documents";

export const VERIFICATION_MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export const VERIFICATION_ALLOWED_EXT = [
  "pdf",
  "png",
  "jpg",
  "jpeg",
] as const;

export const VERIFICATION_ALLOWED_MIME = [
  "application/pdf",
  "image/png",
  "image/jpeg",
] as const;

export type VerificationDocField =
  | "id_document"
  | "activity_document"
  | "license"
  | "tax";

/** DB columns that store the uploads (existing columns kept for URLs). */
export const VERIFICATION_FIELD_COLUMNS: Record<VerificationDocField, string> = {
  id_document: "id_document_url",
  activity_document: "activity_document_url",
  license: "license_url",
  tax: "tax_document_url",
};

export function verificationFileExt(
  name: string,
): (typeof VERIFICATION_ALLOWED_EXT)[number] | null {
  const match = /\.([a-zA-Z0-9]+)$/.exec(name);
  if (!match) return null;
  const ext = match[1].toLowerCase();
  return (VERIFICATION_ALLOWED_EXT as readonly string[]).includes(ext)
    ? (ext as (typeof VERIFICATION_ALLOWED_EXT)[number])
    : null;
}

/** Bucket-inclusive path persisted in verification_requests (+ validation). */
export function verificationPath(bucket: string, key: string): string {
  return `${bucket}/${key.replace(/^\/+/, "")}`;
}

/** Split a stored path into its storage bucket + object key (null if not ours). */
export function parseVerificationPath(
  path: string | null | undefined,
): { bucket: string; key: string } | null {
  if (!path) return null;
  const parts = path.split("/");
  if (parts.length < 3 || parts[0] !== VERIFICATION_BUCKET) return null;
  const key = parts.slice(1).join("/");
  if (!key) return null;
  return { bucket: parts[0], key };
}

export type VerificationUploadResult =
  | { ok: true; path: string; key: string }
  | { ok: false; error: string };

/**
 * Validate + upload one document with the signed-in session client. The
 * storage RLS policy scopes writes to the caller's own
 * `{auth.uid()}/docs/…` folder, so an uploaded object can never be written
 * into another owner's folder.
 */
export async function uploadVerificationDoc(
  field: VerificationDocField,
  file: File,
  ownerId: string,
): Promise<VerificationUploadResult> {
  const ext = verificationFileExt(file.name);
  if (!ext) return { ok: false, error: "bad_extension" };
  if (
    !(VERIFICATION_ALLOWED_MIME as readonly string[]).includes(file.type)
  ) {
    return { ok: false, error: "bad_mime" };
  }
  if (file.size > VERIFICATION_MAX_SIZE_BYTES) {
    return { ok: false, error: "too_large" };
  }

  const key = `${ownerId}/docs/${field}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}.${ext}`;

  const client = createClient();
  const { error } = await client.storage
    .from(VERIFICATION_BUCKET)
    .upload(key, file, { upsert: false, contentType: file.type });

  if (error) return { ok: false, error: "upload_failed" };
  return { ok: true, path: verificationPath(VERIFICATION_BUCKET, key), key };
}