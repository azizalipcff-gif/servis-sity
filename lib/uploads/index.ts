import { createClient } from "@/lib/supabase/client";
import {
  parseStoredUrl,
  publicStorageUrl,
  type StorageImageBucket,
} from "@/lib/supabase/storage";
import { getBucketConfig } from "./config";
import { optimizeImageFile, validateImageFile } from "./optimize";

export type UploadOptions = {
  bucket: StorageImageBucket;
  /** Owning profile id — becomes the first path segment (RLS scope). */
  ownerId: string;
  file: File;
};

export type UploadResult =
  | { ok: true; url: string; key: string; bucket: StorageImageBucket }
  | { ok: false; error: string };

/**
 * Validate → optimize (resize + WebP) → write to Supabase Storage → return the
 * public URL. Only this URL is ever persisted by callers. A unique object key
 * avoids collisions/overwrites.
 */
export async function uploadImage(opts: UploadOptions): Promise<UploadResult> {
  const client = createClient();
  const cfg = getBucketConfig(opts.bucket);

  const meta = validateImageFile(opts.file, cfg);
  if (!meta.ok) return { ok: false, error: meta.error };

  let optimized;
  try {
    optimized = await optimizeImageFile(opts.file, cfg);
  } catch {
    return { ok: false, error: "invalid_image" };
  }

  const key = `${opts.ownerId}/${cfg.folder}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}.${optimized.extension}`;

  const { error } = await client.storage.from(opts.bucket).upload(key, optimized.blob, {
    upsert: false,
    contentType: optimized.mime,
  });

  if (error) return { ok: false, error: "upload_failed" };
  return {
    ok: true,
    url: publicStorageUrl(opts.bucket, key),
    key,
    bucket: opts.bucket,
  };
}

/** Remove a previously stored object by its public URL (owner-scoped RLS). */
export async function deleteStoredUrl(
  url: string | null | undefined,
): Promise<{ ok: boolean }> {
  const parsed = parseStoredUrl(url);
  if (!parsed) return { ok: true }; // nothing of ours to remove
  const client = createClient();
  const { error } = await client.storage.from(parsed.bucket).remove([parsed.key]);
  if (error) return { ok: false };
  return { ok: true };
}