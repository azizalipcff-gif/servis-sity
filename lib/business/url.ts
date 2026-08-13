import { slugify } from "@/lib/slug";

export const DEFAULT_CITY_SLUG = "maroc";

/** Directory slug used in the SEO-friendly /businesses/[city]/[slug] routes. */
export function businessCitySlug(city?: string | null): string {
  if (!city) return DEFAULT_CITY_SLUG;
  const out = slugify(city);
  return out.startsWith("business-") ? DEFAULT_CITY_SLUG : out;
}

/** Locale-relative link target for a business card.
 *  Pass through `Link` from @/i18n/navigation to keep the locale prefix.
 *  `slug` may be null for joined rows; callers guard before calling. */
export function businessHref(business: {
  slug: string | null | undefined;
  city?: string | null;
}): string {
  return `/businesses/${businessCitySlug(business.city)}/${business.slug ?? ""}`;
}

/** Fully qualified (already locale-prefixed) path, for canonical URLs & redirects. */
export function businessPath(
  locale: string,
  business: { slug: string; city?: string | null },
): string {
  return `/${locale}/businesses/${businessCitySlug(business.city)}/${business.slug}`;
}