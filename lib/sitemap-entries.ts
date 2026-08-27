import type { MetadataRoute } from "next";

export interface SitemapCategory {
  slug?: string | null;
}

export interface SitemapBusiness {
  slug: string | null | undefined;
  city?: string | null;
  city_id?: string | null;
  city_slug?: string | null;
  last_updated_at?: string | null;
}

export interface SitemapProduct {
  slug?: string | null;
  updated_at?: string | null;
}

export interface SitemapService {
  id?: string | null;
  updated_at?: string | null;
}

export interface SitemapCity {
  slug?: string | null;
}

export interface BuildSitemapInput {
  categories?: SitemapCategory[] | null;
  businesses?: SitemapBusiness[] | null;
  products?: SitemapProduct[] | null;
  services?: SitemapService[] | null;
  cities?: SitemapCity[] | null;
}

export interface BuildSitemapOptions {
  siteUrl: string;
  businessHref: (business: SitemapBusiness) => string;
  locales: readonly string[];
}

function isSafeSlug(s?: string | null): s is string {
  return (
    typeof s === "string" &&
    s.length > 0 &&
    s.trim() === s &&
    !s.includes("/")
  );
}

/**
 * Pure sitemap entry builder. No DB, no `@/` imports, so it can be unit-tested
 * directly with arbitrary (including invalid) data.
 *
 * Guarantee: every returned entry has a non-empty, canonical, query/hash-free
 * `url`; entries that cannot produce a valid URL (missing/unsafe slug, missing
 * id, non-canonical origin, duplicate) are dropped. It is therefore impossible
 * for this builder to emit `{}`, an entry without `url`, or anything that
 * Next.js would serialize as `<url></url>`.
 */
export function buildSitemapEntries(
  input: BuildSitemapInput,
  opts: BuildSitemapOptions,
): MetadataRoute.Sitemap {
  const categories = input.categories ?? [];
  const businesses = input.businesses ?? [];
  const products = input.products ?? [];
  const services = input.services ?? [];
  const cities = input.cities ?? [];
  const { siteUrl, businessHref, locales } = opts;

  const origin = siteUrl;
  const seen = new Set<string>();
  const entries: MetadataRoute.Sitemap = [];

  function loc(path = ""): string {
    return `${origin}${path}`;
  }

  function add(entry: MetadataRoute.Sitemap[number] | undefined): void {
    if (!entry || !entry.url) return;
    const url = String(entry.url);
    if (url !== origin && !url.startsWith(`${origin}/`)) return;
    if (url.includes("?") || url.includes("#")) return;
    if (seen.has(url)) return;
    seen.add(url);
    entries.push(entry);
  }

  for (const locale of locales) {
    add({
      url: loc(`/${locale}`),
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    });
  }

  const listingPaths = ["/business", "/products", "/services", "/pricing", "/help"];
  for (const path of listingPaths) {
    for (const locale of locales) {
      add({
        url: loc(`/${locale}${path}`),
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }
  }

  for (const category of categories) {
    if (!isSafeSlug(category?.slug)) continue;
    for (const locale of locales) {
      add({
        url: loc(`/${locale}/category/${category.slug}`),
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }
  }

  for (const business of businesses) {
    if (!isSafeSlug(business?.slug)) continue;
    for (const locale of locales) {
      add({
        url: loc(`/${locale}${businessHref(business)}`),
        lastModified: business.last_updated_at
          ? new Date(business.last_updated_at)
          : new Date(),
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
  }

  for (const product of products) {
    if (!isSafeSlug(product?.slug)) continue;
    for (const locale of locales) {
      add({
        url: loc(`/${locale}/product/${product.slug}`),
        lastModified: product.updated_at
          ? new Date(product.updated_at)
          : new Date(),
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
  }

  for (const service of services) {
    if (!service?.id) continue;
    for (const locale of locales) {
      add({
        url: loc(`/${locale}/service/${service.id}`),
        lastModified: service.updated_at
          ? new Date(service.updated_at)
          : new Date(),
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
  }

  for (const city of cities) {
    if (!isSafeSlug(city?.slug)) continue;
    for (const locale of locales) {
      add({
        url: loc(`/${locale}/city/${city.slug}`),
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
  }

  return entries;
}
