import { z } from "zod";

export const SERVICE_LIMIT_DEFAULT = 24;

export const SERVICE_SORTS = ["newest", "price_asc", "price_desc"] as const;
export type ServiceSort = (typeof SERVICE_SORTS)[number];

/**
 * Validates raw URL search params for the service catalog (`/services?...`).
 * Lives in its own module on purpose — the business-first `/search` contract
 * in `lib/search/` is left untouched.
 */
const servicesSearchSchema = z.object({
  q: z.string().max(80).optional(),
  category: z.string().max(80).optional(),
  city: z.string().max(80).optional(),
  minPrice: z.string().optional(),
  maxPrice: z.string().optional(),
  sort: z.string().optional(),
  offset: z.string().optional(),
});

export type ServicesFilterState = {
  q: string;
  category: string;
  city: string;
  minPrice: number | null;
  maxPrice: number | null;
  sort: ServiceSort;
  offset: number;
};

export function parseServicesParams(
  input: Record<string, string | string[] | undefined>,
): ServicesFilterState {
  const raw: Record<string, string> = {};
  for (const [k, v] of Object.entries(input)) {
    if (typeof v === "string" && v.length > 0) raw[k] = v;
  }
  const { data } = servicesSearchSchema.safeParse(raw);
  const use = data ?? {};

  const numberOrNull = (v: string | undefined): number | null => {
    if (v == null || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : null;
  };

  const sort = (SERVICE_SORTS as readonly string[]).includes(use.sort ?? "")
    ? (use.sort as ServiceSort)
    : "newest";
  const offsetRaw = use.offset ? Number(use.offset) : 0;
  const offset = Number.isFinite(offsetRaw)
    ? Math.max(Math.trunc(offsetRaw), 0)
    : 0;

  return {
    q: (use.q ?? "").trim(),
    category: (use.category ?? "").trim(),
    city: (use.city ?? "").trim(),
    minPrice: numberOrNull(use.minPrice),
    maxPrice: numberOrNull(use.maxPrice),
    sort,
    offset,
  };
}

/** Serialize validated catalog state into a query string. */
export function buildServicesUrl(params: Partial<ServicesFilterState>): string {
  const sp = new URLSearchParams();
  const p: ServicesFilterState = {
    q: "",
    category: "",
    city: "",
    minPrice: null,
    maxPrice: null,
    sort: "newest",
    offset: 0,
    ...params,
  };

  if (p.q) sp.set("q", p.q);
  if (p.category) sp.set("category", p.category);
  if (p.city) sp.set("city", p.city);
  if (p.minPrice != null) sp.set("minPrice", String(p.minPrice));
  if (p.maxPrice != null) sp.set("maxPrice", String(p.maxPrice));
  if (p.sort !== "newest") sp.set("sort", p.sort);
  if (p.offset > 0) sp.set("offset", String(p.offset));
  const qstring = sp.toString();
  return qstring ? `/services?${qstring}` : "/services";
}

export function hasActiveServiceFilters(state: ServicesFilterState): boolean {
  return Boolean(
    state.q ||
      state.category ||
      state.city ||
      state.minPrice != null ||
      state.maxPrice != null ||
      state.sort !== "newest" ||
      state.offset > 0,
  );
}