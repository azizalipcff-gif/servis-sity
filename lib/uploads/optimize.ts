export type OptimizedImage = {
  blob: Blob;
  /** Output MIME type actually produced (WebP when supported). */
  mime: string;
  width: number;
  height: number;
  extension: string;
};

export type ValidationResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Browser-safe validation of a candidate image file against the shared bucket
 * rules. This mirrors backend checks and rejects dangerous files before they
 * are ever optimized or uploaded.
 */
export function validateImageFile(
  file: File,
  limits: { maxBytes: number; mimes: readonly string[]; extensions: readonly string[] },
): ValidationResult {
  const ext = (file.name.split(".").pop() ?? "").toLowerCase();
  if (!limits.extensions.includes(ext)) {
    return { ok: false, error: "invalid_extension" };
  }
  if (!limits.mimes.includes(file.type)) {
    return { ok: false, error: "invalid_mime" };
  }
  if (file.size === 0 || file.size > limits.maxBytes) {
    return { ok: false, error: "invalid_size" };
  }
  return { ok: true };
}

async function decodeDimensions(file: File): Promise<{
  image: ImageBitmap;
  width: number;
  height: number;
}> {
  const image = await createImageBitmap(file);
  return { image, width: image.width, height: image.height };
}

/**
 * Load, resize (downscale, never upscale) and re-encode a user-selected image
 * so only efficient, size-bounded WebP artifacts reach Storage. Falls back to
 * the original file when the browser cannot produce a WebP blob.
 */
export async function optimizeImageFile(
  file: File,
  limits: { maxDimension: number; quality: number },
): Promise<OptimizedImage> {
  const { image, width, height } = await decodeDimensions(file);

  // Never upscale.
  const scale = width > limits.maxDimension || height > limits.maxDimension
    ? Math.min(limits.maxDimension / width, limits.maxDimension / height, 1)
    : 1;
  const targetW = Math.max(1, Math.round(width * scale));
  const targetH = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    image.close();
    return { blob: file, mime: file.type, width, height, extension: extOf(file) };
  }
  ctx.drawImage(image, 0, 0, targetW, targetH);
  image.close();

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(
      (b) => resolve(b),
      "image/webp",
      Math.min(Math.max(limits.quality / 100, 0.4), 1),
    );
  });

  if (blob && blob.type === "image/webp") {
    return {
      blob,
      mime: "image/webp",
      width: targetW,
      height: targetH,
      extension: "webp",
    };
  }

  // WebP unsupported — fall back to the payload original.
  return { blob: file, mime: file.type, width, height, extension: extOf(file) };
}

export function extOf(file: File): string {
  const e = (file.name.split(".").pop() ?? "").toLowerCase();
  return e || "jpg";
}