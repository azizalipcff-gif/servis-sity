import { z } from "zod";

export const BUSINESS_LIMIT_DEFAULT = 24;

export const BUSINESS_SORTS = ["newest", "rating", "reviews"] as const;
export type BusinessSort = (typeof BUSINESS_SORTS)[number];

/**
 * Validates raw URL search params for the business catalog (`/business?...`).
 * Lives in its own module on purpose — the business-first `/search` contract
 * in `lib/search/` is left untouched.
 */
const businessesSearchSchema = z.object({
  q: z.string().max(80).optional(),
  category: z.string().max(80).optional(),
  city: z.string().max(80).optional(),
  verified: z.string().optional(),
  sort: z.string().optional(),
  offset: z.string().optional(),
});

export type BusinessesFilterState = {
  q: string;
  category: string;
  city: string;
  verified: boolean;
  sort: BusinessSort;
  offset: number;
};

export function parseBusinessesParams(
  input: Record<string, string | string[] | undefined>,
): BusinessesFilterState {
  const raw: Record<string, string> = {};
  for (const [k, v] of Object.entries(input)) {
    if (typeof v === "string" && v.length > 0) raw[k] = v;
  }
  const { data } = businessesSearchSchema.safeParse(raw);
  const use = data ?? {};

  const sort = (BUSINESS_SORTS as readonly string[]).includes(use.sort ?? "")
    ? (use.sort as BusinessSort)
    : "newest";
  const offsetRaw = use.offset ? Number(use.offset) : 0;
  const offset = Number.isFinite(offsetRaw)
    ? Math.max(Math.trunc(offsetRaw), 0)
    : 0;

  return {
    q: (use.q ?? "").trim(),
    category: (use.category ?? "").trim(),
    city: (use.city ?? "").trim(),
    verified: use.verified === "1" || use.verified === "true",
    sort,
    offset,
  };
}

/** Serialize validated catalog state into a query string. */
export function buildBusinessesUrl(
  params: Partial<BusinessesFilterState>,
): string {
  const sp = new URLSearchParams();
  const p: BusinessesFilterState = {
    q: "",
    category: "",
    city: "",
    verified: false,
    sort: "newest",
    offset: 0,
    ...params,
  };

  if (p.q) sp.set("q", p.q);
  if (p.category) sp.set("category", p.category);
  if (p.city) sp.set("city", p.city);
  if (p.verified) sp.set("verified", "1");
  if (p.sort !== "newest") sp.set("sort", p.sort);
  if (p.offset > 0) sp.set("offset", String(p.offset));
  const qstring = sp.toString();
  return qstring ? `/business?${qstring}` : "/business";
}

export function hasActiveBusinessFilters(state: BusinessesFilterState): boolean {
  return Boolean(
    state.q ||
      state.category ||
      state.city ||
      state.verified ||
      state.sort !== "newest" ||
      state.offset > 0,
  );
}