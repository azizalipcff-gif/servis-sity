import { z } from "zod";
import {
  SORT_KEYS,
  SEARCH_LIMIT_DEFAULT,
  SEARCH_LIMIT_MAX,
  SEARCH_TYPES,
  type SearchParams,
  type SearchResultType,
  type SortKey,
} from "./types";

/**
 * Validates raw URL search params (from `/search?...` or the API). Garbage is
 * coerced to safe defaults so a hand-edited URL can never crash the page.
 */
const searchParamsSchema = z.object({
  q: z.string().max(80).optional(),
  type: z.string().optional(),
  city: z.string().max(80).optional(),
  category: z.string().max(80).optional(),
  minRating: z.string().optional(),
  minPrice: z.string().optional(),
  maxPrice: z.string().optional(),
  verifiedOnly: z.string().optional(),
  premiumOnly: z.string().optional(),
  openNow: z.string().optional(),
  sort: z.string().optional(),
  offset: z.string().optional(),
  limit: z.string().optional(),
  lat: z.string().optional(),
  lng: z.string().optional(),
});

export function parseSearchParams(
  input: Record<string, string | string[] | undefined>,
): SearchParams {
  const raw: Record<string, string> = {};
  for (const [k, v] of Object.entries(input)) {
    if (typeof v === "string" && v.length > 0) raw[k] = v;
  }
  const { data } = searchParamsSchema.safeParse(raw);
  const use = data ?? {};

  const numberOrNull = (v: string | undefined): number | null => {
    if (v == null || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : null;
  };

  const sort = (SORT_KEYS as readonly string[]).includes(use.sort ?? "")
    ? (use.sort as SortKey)
    : "recommended";
  const type = (SEARCH_TYPES as readonly string[]).includes(use.type ?? "")
    ? (use.type as SearchResultType)
    : "all";
  const limitRaw = use.limit ? Number(use.limit) : SEARCH_LIMIT_DEFAULT;
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(Math.trunc(limitRaw), 1), SEARCH_LIMIT_MAX)
    : SEARCH_LIMIT_DEFAULT;
  const offsetRaw = use.offset ? Number(use.offset) : 0;
  const offset = Number.isFinite(offsetRaw)
    ? Math.max(Math.trunc(offsetRaw), 0)
    : 0;
  const ratingRaw = use.minRating ? Number(use.minRating) : 0;
  const minRating = Number.isFinite(ratingRaw)
    ? Math.min(Math.max(ratingRaw, 0), 5)
    : 0;

  return {
    q: (use.q ?? "").trim(),
    type,
    city: (use.city ?? "").trim(),
    category: (use.category ?? "").trim(),
    minRating,
    minPrice: numberOrNull(use.minPrice),
    maxPrice: numberOrNull(use.maxPrice),
    verifiedOnly: isTruthy(use.verifiedOnly),
    premiumOnly: isTruthy(use.premiumOnly),
    openNowOnly: isTruthy(use.openNow),
    sort,
    offset,
    limit,
    lat: numberOrNull(use.lat),
    lng: numberOrNull(use.lng),
  };
}

/** Serialize validated search state into a query string (SEO-friendly). */
export function buildSearchUrl(params: Partial<SearchParams>): string {
  const sp = new URLSearchParams();
  const p: SearchParams = {
    ...defaultSearchParams(),
    ...params,
    offset: 0,
    limit: SEARCH_LIMIT_DEFAULT,
  };

  if (p.q) sp.set("q", p.q);
  if (p.type && p.type !== "all") sp.set("type", p.type);
  if (p.city) sp.set("city", p.city);
  if (p.category) sp.set("category", p.category);
  if (p.minRating > 0) sp.set("minRating", String(p.minRating));
  if (p.minPrice != null) sp.set("minPrice", String(p.minPrice));
  if (p.maxPrice != null) sp.set("maxPrice", String(p.maxPrice));
  if (p.verifiedOnly) sp.set("verifiedOnly", "1");
  if (p.premiumOnly) sp.set("premiumOnly", "1");
  if (p.openNowOnly) sp.set("openNow", "1");
  if (p.sort !== "recommended") sp.set("sort", p.sort);
  const qstring = sp.toString();
  return qstring ? `/search?${qstring}` : "/search";
}

export function defaultSearchParams(): SearchParams {
  return {
    q: "",
    type: "all",
    city: "",
    category: "",
    minRating: 0,
    minPrice: null,
    maxPrice: null,
    verifiedOnly: false,
    premiumOnly: false,
    openNowOnly: false,
    sort: "recommended",
    offset: 0,
    limit: SEARCH_LIMIT_DEFAULT,
    lat: null,
    lng: null,
  };
}

function isTruthy(v: string | undefined): boolean {
  return v === "1" || v === "true";
}