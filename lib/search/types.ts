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

/** Result-kind controls which catalog the search endpoint queries. */
export const SEARCH_TYPES = [
  "all",
  "business",
  "service",
  "product",
] as const;
export type SearchResultType = (typeof SEARCH_TYPES)[number];

/** Normalized, validated search state shared between client and server. */
export interface SearchParams {
  q: string;
  type: SearchResultType;
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
  items: SearchItem[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
  /** The resolved kind for this page (echoed from the request). */
  type: SearchResultType;
  /** Data source that produced this page — observability for AI search. */
  matchMethod: SearchMatchMethod;
  /** Pipeline version tag emitted in non-production only (observability). */
  searchVersion?: string;
  /** true when the data source was unreachable (e.g. unconfigured creds). */
  error?: boolean;
}

/** Which search engine produced the results on this request. */
export type SearchMatchMethod = "hybrid" | "legacy";

/**
 * Public-only projection of a business row. The raw `businesses` table carries
 * private/internal columns (owner_id, status_note, embedding, searchable_text,
 * ean) that must NEVER reach anonymous search clients. This contract declares
 * only safe fields so a leaked column is also a type error (Part 12).
 */
export type SearchBusiness = Omit<
  Business,
  "owner_id" | "status_note" | "searchable_text" | "embedding" | "ean"
> & {
  categories: Pick<
    Category,
    "slug" | "icon" | "name_ar" | "name_fr" | "name_en"
  > | null;
  /** Lowest service price, when services exist (used for "from {price}"). */
  starting_price?: number | null;
  open_now?: boolean;
  distance_km?: number | null;
  /** Canonical city slug resolved from the cities table (via `city_id`). */
  city_slug?: string | null;
};

/** A normalized seller/avatar block used by service & product results. */
export type SearchSeller = {
  name: string;
  slug: string | null;
  logo_url: string | null;
  verified: boolean;
  city: string | null;
  city_slug: string | null;
  rating_avg: number;
  reviews_count: number;
  plan: string;
};

/** Real catalog row as a service result. */
export type SearchServiceItem = {
  kind: "service";
  id: string;
  name: string;
  slug: string | null;
  price: number | null;
  old_price: number | null;
  duration_minutes: number | null;
  photo_url: string | null;
  description: string | null;
  updated_at: string;
  categories: Pick<
    Category,
    "slug" | "icon" | "name_ar" | "name_fr" | "name_en"
  > | null;
  business: SearchSeller;
  sellerName: string;
};

/** Real catalog row as a product result. */
export type SearchProductItem = {
  kind: "product";
  id: string;
  slug: string;
  name: string;
  price: number;
  compare_at_price: number | null;
  stock: number;
  images: string[];
  description: string | null;
  created_at: string;
  updated_at: string;
  categories: Pick<
    Category,
    "slug" | "icon" | "name_ar" | "name_fr" | "name_en"
  > | null;
  business: SearchSeller;
  sellerName: string;
};

/** Discriminated result item — one real row, one kind, one card design. */
export type SearchItem =
  | (SearchBusiness & { kind: "business" })
  | SearchServiceItem
  | SearchProductItem;

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