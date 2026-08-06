import type { StorageImageBucket } from "@/lib/supabase/storage";

export type ImageBucketConfig = {
  bucket: StorageImageBucket;
  folder: string;
  maxBytes: number;
  maxDimension: number;
  quality: number;
  /** MIME types accepted on input. */
  mimes: readonly string[];
  /** File extensions accepted on input. */
  extensions: readonly string[];
};

export const IMAGE_BUCKET_CONFIG: Record<StorageImageBucket, ImageBucketConfig> = {
  "business-logos": {
    bucket: "business-logos",
    folder: "business-logos",
    maxBytes: 3 * 1024 * 1024,
    maxDimension: 1024,
    quality: 82,
    mimes: ["image/jpeg", "image/png", "image/webp"],
    extensions: ["jpg", "jpeg", "png", "webp"],
  },
  "business-covers": {
    bucket: "business-covers",
    folder: "business-covers",
    maxBytes: 6 * 1024 * 1024,
    maxDimension: 2048,
    quality: 80,
    mimes: ["image/jpeg", "image/png", "image/webp"],
    extensions: ["jpg", "jpeg", "png", "webp"],
  },
  "business-gallery": {
    bucket: "business-gallery",
    folder: "business-gallery",
    maxBytes: 6 * 1024 * 1024,
    maxDimension: 2048,
    quality: 80,
    mimes: ["image/jpeg", "image/png", "image/webp"],
    extensions: ["jpg", "jpeg", "png", "webp"],
  },
  "user-avatars": {
    bucket: "user-avatars",
    folder: "user-avatars",
    maxBytes: 2 * 1024 * 1024,
    maxDimension: 512,
    quality: 80,
    mimes: ["image/jpeg", "image/png", "image/webp"],
    extensions: ["jpg", "jpeg", "png", "webp"],
  },
  "category-images": {
    bucket: "category-images",
    folder: "category-images",
    maxBytes: 4 * 1024 * 1024,
    maxDimension: 1024,
    quality: 80,
    mimes: ["image/jpeg", "image/png", "image/webp"],
    extensions: ["jpg", "jpeg", "png", "webp"],
  },
};

/** Output MIME we always re-encode to when the browser supports WebP. */
export const OUTPUT_MIME = "image/webp";

export function getBucketConfig(bucket: StorageImageBucket): ImageBucketConfig {
  return IMAGE_BUCKET_CONFIG[bucket];
}