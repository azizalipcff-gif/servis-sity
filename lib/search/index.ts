import { cache } from "react";
import {
  getCategories,
  getIndexBusinesses,
  getIndexCategoryCounts,
  getIndexProducts,
  getIndexServices,
} from "@/lib/queries";
import { getCities } from "@/lib/home-queries";
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
      getIndexBusinesses({ city: canonicalCity ?? undefined, limit: 6, sort: "rating" }),
      getIndexCategoryCounts(canonicalCity ?? undefined),
      getCategories(),
    ]);

    const categoryRows = categories.map((category) => ({
      slug: category.slug,
      name_ar: category.name_ar,
      name_fr: category.name_fr,
      name_en: category.name_en,
      icon: category.icon ?? null,
      count: counts[category.id] ?? 0,
    }));

    return {
      city: canonicalCity,
      citySlug: resolved?.slug ?? null,
      scope: canonicalCity ? "city" : "global",
      popularBusinesses: popularBusinesses.map(stripPrivateBusiness),
      popularServices: popularServices.map((item) => stripPrivateBusiness(item)),
      popularProducts: popularProducts.map((item) => stripPrivateBusiness(item)),
      trending: trending.map(stripPrivateBusiness),
      highlyRated: highlyRated.map(stripPrivateBusiness),
      categories: categoryRows,
    };
  },
);
