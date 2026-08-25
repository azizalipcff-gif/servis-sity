/**
 * Private-field stripping for business rows returned to anonymous clients.
 *
 * The `businesses` table carries internal columns that must NEVER reach search
 * responses: `owner_id` (a profile FK), `status_note` (reviewer notes),
 * `embedding` / `searchable_text` (search internals — the latter is also a
 * multi-kilobyte vector that would otherwise bloat every payload), and `ean`.
 *
 * Used by both the /api/search route and the /search landing index feed so the
 * contract is enforced in exactly one place.
 */
export const PRIVATE_BUSINESS_KEYS = new Set<string>([
  "owner_id",
  "status_note",
  "searchable_text",
  "embedding",
  "ean",
]);

export function stripPrivateBusiness<T extends Record<string, unknown>>(
  obj: T,
): T {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (!PRIVATE_BUSINESS_KEYS.has(key)) out[key] = value;
  }
  return out as T;
}
