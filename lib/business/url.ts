import { slugify } from "../slug.ts";

export const DEFAULT_CITY_SLUG = "maroc";

/** City info carried by business rows that can drive the URL city segment. */
export type BusinessCitySource = {
  city?: string | null;
  /** Canonical city slug resolved from the cities table (via `city_id`). */
  city_slug?: string | null;
};

/**
 * Pure fallback used for legacy rows without a resolved `city_slug`:
 * slugify the free-text `city`. Rows created before `city_id` backfill carry
 * a canonicalized `cities.name_en` value, so slugifying it matches the
 * canonical `cities.slug` for every city except Tangier ("Tangier" → "tangier"
 * while `cities.slug = "tanger"`). The data layer prefers the canonical slug.
 */
export function citySlugFallback(city?: string | null): string {
  if (!city) return DEFAULT_CITY_SLUG;
  const out = slugify(city);
  return out.startsWith("business-") ? DEFAULT_CITY_SLUG : out;
}

/**
 * Canonical city segment used in /businesses/[city]/[slug] URLs.
 * Prefers the canonical `city_slug` resolved from the cities table, falling
 * back to slugifying the free-text `city` for legacy rows without a `city_id`.
 */
export function businessCitySlug(business: BusinessCitySource): string {
  if (business.city_slug?.trim()) return business.city_slug.trim();
  return citySlugFallback(business.city);
}

/**
 * Attach the canonical `city_slug` (resolved from the cities table via each
 * business's `city_id`) onto a search row, keyed by business `id`. The slug map
 * is built from ONE `cities!businesses_city_id_fkey(slug)` join — the same join
 * the legacy search path uses — so hybrid and legacy results carry identical
 * canonical slugs. This deliberately never slugifies the free-text `city` here:
 * rows without a canonical slug keep `city_slug = null`, and the URL layer only
 * slugs the display name for legacy rows that lack a `city_id` entirely.
 */
export function attachCanonicalCitySlug<
  Row extends { id?: string | number | null },
>(
  row: Row,
  slugByBusinessId: ReadonlyMap<string, string | null>,
): Row & { city_slug: string | null } {
  const slug =
    row.id != null ? (slugByBusinessId.get(String(row.id)) ?? null) : null;
  return { ...row, city_slug: slug };
}

/** Locale-relative link target for a business card.
 *  Pass through `Link` from @/i18n/navigation to keep the locale prefix.
 *  `slug` may be null for joined rows; callers guard before calling. */
export function businessHref(
  business: BusinessCitySource & { slug: string | null | undefined },
): string {
  return `/businesses/${businessCitySlug(business)}/${business.slug ?? ""}`;
}

/** Fully qualified (already locale-prefixed) path, for canonical URLs & redirects. */
export function businessPath(
  locale: string,
  business: BusinessCitySource & { slug: string },
): string {
  return `/${locale}/businesses/${businessCitySlug(business)}/${business.slug}`;
}
