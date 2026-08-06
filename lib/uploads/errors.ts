export const KNOWN_UPLOAD_ERROR_KEYS = new Set([
  "invalid_extension",
  "invalid_mime",
  "invalid_size",
  "invalid_image",
  "invalid_dimensions",
]);

/**
 * Return the `uploadError.*` i18n key for a machine error, or `null` when the
 * error has no dedicated translation (callers should fall back to a generic
 * message).
 */
export function uploadErrorMessageKey(error: string): string | null {
  return KNOWN_UPLOAD_ERROR_KEYS.has(error) ? error : null;
}