/**
 * Supabase Storage helpers.
 *
 * Rules enforced across the whole app:
 *   - PostgreSQL stores ONLY image URLs — never binary/BLOB/Base64 data.
 *   - Every image lives in a dedicated Storage bucket under
 *     `{owner_uid}/{kind}/{file}` so RLS can scope writes to the owner.
 *   - URLs referenced by this file are always served from Storage's public
 *     endpoint so they can be rendered directly with <img>/Next Image and
 *     cached by the CDN.
 */

export type StorageImageBucket =
  | "business-logos"
  | "business-covers"
  | "business-gallery"
  | "user-avatars"
  | "category-images";

export const STORAGE_IMAGE_BUCKETS: readonly StorageImageBucket[] = [
  "business-logos",
  "business-covers",
  "business-gallery",
  "user-avatars",
  "category-images",
];

/** Public base URL for a Storage bucket object, e.g. .../storage/v1/object/public */
export function storageBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return `${url.replace(/\/$/, "")}/storage/v1/object/public`;
}

/** Build the public URL for an object. */
export function publicStorageUrl(bucket: string, key: string): string {
  return `${storageBaseUrl()}/${bucket}/${key.replace(/^\/+/, "")}`;
}

/**
 * Given a stored URL, decompose it into `{ bucket, key }` when it points to a
 * public object in THIS Supabase project. Returns null for external/demo URLs
 * so we never attempt to delete a non-ours image. The key drops the bucket
 * name and leading slash so it can be fed straight to Storage `.remove()`.
 */
export function parseStoredUrl(
  url: string | null | undefined,
): { bucket: StorageImageBucket | string; key: string } | null {
  if (!url) return null;
  const base = storageBaseUrl();
  if (!url.startsWith(base + "/")) return null;
  const rest = url.slice(base.length + 1);
  const slash = rest.indexOf("/");
  if (slash <= 0) return null;
  const bucket = rest.slice(0, slash);
  const key = rest.slice(slash + 1);
  if (!bucket || !key) return null;
  return { bucket, key };
}

/** Whether a URL belongs to this project's public Storage. */
export function isStoredUrl(url: string | null | undefined): boolean {
  return parseStoredUrl(url) !== null;
}