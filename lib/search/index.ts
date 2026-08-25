import { cache } from "react";
import {
  getCategories,
  getCities,
  getIndexBusinesses,
  getIndexCategoryCounts,
  getIndexProducts,
  getIndexServices,
} from "@/lib/queries";
import type { BusinessWithCategory } from "@/lib/queries";
import type { ProductWithBusiness, ServiceWithBusiness } from "@/lib/queries";
import { normalizeToken } from "@/lib/search-quality/normalize";
import type { SearchItem, SearchSeller } from "./types";
import { stripPrivateBusiness } from "./sanitize";

/**
 * City resolution — maps any free-text city (as it appears in the URL, the
 * AI parser output, or the header selector) to the canonical `cities.name_en`
 * value stored on rows. This is the single normalization point for the search
 * landing page and guarantees "Fès" → "Fes", "الدار البيضاء" → "Casablanca",
 * etc., so index feeds and legacy search always filter on canonical data.
 */
export const resolveCanonicalCity = cache(
  async (city?: string | null): Promise<{ name: string; slug: string; id: string } | null> => {
    if (!city) return null;
    const needle = normalizeToken(city);
    if (!needle) return null;
    const cities = await getCities();
    for (const c of cities) {
      const candidates = [c.name_en, c.name_fr, c.slug];
      for (const candidate of candidates) {
        if (candidate && normalizeToken(candidate) === needle) {
          return { name: c.name_en, slug: c.slug, id: c.id };
        }
      }
    }
    return null;
  },
);

export type SearchIndexCategory = {
  slug: string;
  name_ar: string;
  name_fr: string;
  name_en: string;
  icon: string | null;
  count: number;
};

export type SearchIndexData = {
  /** Canonical `cities.name_en` if a city scope was resolved, else null. */
  city: string | null;
  citySlug: string | null;
  scope: "city" | "global";
  popularBusinesses: SearchItem[];
  popularServices: SearchItem[];
  popularProducts: SearchItem[];
  trending: SearchItem[];
  highlyRated: SearchItem[];
  categories: SearchIndexCategory[];
};

export const getSearchIndex = cache(
  async (city?: string | null): Promise<SearchIndexData> => {
    const resolved = await resolveCanonicalCity(city);
    const canonicalCity = resolved?.name ?? null;

    const [
      popularBusinesses,
      popularServices,
      popularProducts,
      trending,
      highlyRated,
      counts,
      categories,
    ] = await Promise.all([
      getIndexBusinesses({ city: canonicalCity ?? undefined, limit: 6, sort: "reviews" }),
      getIndexServices({ city: canonicalCity ?? undefined, limit: 6 }),
      getIndexProducts({ city: canonicalCity ?? undefined, limit: 6 }),
      getIndexBusinesses({ city: canonicalCity ?? undefined, limit: 6, sort: "newest" }),
      getIndexBusinesses({ city: canonicalCity ?? undefined, limit: 4, sort: "rating" }),
      getIndexCategoryCounts(canonicalCity ?? undefined),
      getCategories(),
    ]);

    const categoryRows: SearchIndexCategory[] = categories
      .map((c) => ({
        slug: c.slug,
        name_ar: c.name_ar,
        name_fr: c.name_fr,
        name_en: c.name_en,
        icon: c.icon,
        count: counts[c.id] ?? 0,
      }))
      .filter((c) => c.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);

    return {
      city: canonicalCity,
      citySlug: resolved?.slug ?? null,
      scope: canonicalCity ? "city" : "global",
      popularBusinesses: popularBusinesses.map(fromBusiness),
      popularServices: popularServices.map(fromService),
      popularProducts: popularProducts.map(fromProduct),
      trending: trending.map(fromBusiness),
      highlyRated: highlyRated.map(fromBusiness),
      categories: categoryRows,
    };
  },
);

/**
 * Rows already carry the joined `categories` (full Category) and `city_slug`.
 * The raw row is the full `businesses` record, so private columns
 * (`owner_id`, `status_note`, `embedding`, `searchable_text`, `ean`) must be
 * stripped before this travels to the client as part of the search landing
 * feed (Part 4 / Part 12).
 */
function fromBusiness(b: BusinessWithCategory): SearchItem {
  return {
    kind: "business",
    ...stripPrivateBusiness(b as unknown as Record<string, unknown>),
  } as unknown as SearchItem;
}

function fromService(s: ServiceWithBusiness): SearchItem {
  return {
    kind: "service",
    id: s.id,
    name: s.name,
    slug: null,
    price: s.price,
    old_price: s.old_price,
    duration_minutes: s.duration_minutes,
    photo_url: s.photo_url,
    description: s.description,
    updated_at: s.updated_at,
    categories: null,
    business: toSeller(s.business),
    sellerName: s.business?.name ?? "",
  };
}

function fromProduct(p: ProductWithBusiness): SearchItem {
  return {
    kind: "product",
    id: p.id,
    slug: p.slug,
    name: p.name,
    price: p.price,
    compare_at_price: p.compare_at_price,
    stock: p.stock,
    images: p.images ?? [],
    description: p.description,
    created_at: p.created_at,
    updated_at: p.updated_at,
    categories: null,
    business: toSeller(p.business),
    sellerName: p.business?.name ?? "",
  };
}

type SellerRow = ServiceWithBusiness["business"] | ProductWithBusiness["business"];

function toSeller(b: SellerRow): SearchSeller {
  return {
    name: b?.name ?? "",
    slug: b?.slug ?? null,
    logo_url: b?.logo_url ?? null,
    verified: b?.verified ?? false,
    city: b?.city ?? null,
    city_slug: b?.city_slug ?? null,
    rating_avg: b?.rating_avg ?? 0,
    reviews_count: b?.reviews_count ?? 0,
    plan: b?.plan ?? "free",
  };
}