import type { Business, Category } from "@/lib/supabase/database.types";

/**
 * The set of sort orders exposed to users. The API maps these onto a
 * server-side comparator (see lib/search/ranking.ts).
 */
export const SORT_KEYS = [
  "recommended",
  "rating",
  "newest",
  "popular",
  "premium",
  "recently_active",
] as const;
export type SortKey = (typeof SORT_KEYS)[number];

/** Normalized, validated search state shared between client and server. */
export interface SearchParams {
  q: string;
  city: string;
  category: string;
  minRating: number;
  minPrice: number | null;
  maxPrice: number | null;
  verifiedOnly: boolean;
  premiumOnly: boolean;
  openNowOnly: boolean;
  sort: SortKey;
  offset: number;
  limit: number;
  /** Optional user coordinates for distance-aware ranking. */
  lat: number | null;
  lng: number | null;
}

export interface SearchResponse {
  items: SearchBusiness[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
  /** true when the data source was unreachable (e.g. unconfigured creds). */
  error?: boolean;
}

export type SearchBusiness = Business & {
  categories: Pick<
    Category,
    "slug" | "icon" | "name_ar" | "name_fr" | "name_en"
  > | null;
  /** Lowest service price, when services exist (used for "from {price}"). */
  starting_price?: number | null;
  open_now?: boolean;
  distance_km?: number | null;
};

/** A normalized set of filters extracted from a natural-language query. */
export interface ParsedFilters {
  q: string;
  city?: string;
  category?: string;
  minRating?: number;
  minPrice?: number;
  maxPrice?: number;
  verifiedOnly?: boolean;
  premiumOnly?: boolean;
  openNow?: boolean;
}

export const SEARCH_LIMIT_DEFAULT = 12;
export const SEARCH_LIMIT_MAX = 48;