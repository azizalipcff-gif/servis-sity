import { z } from "zod";

export const PRODUCT_LIMIT_DEFAULT = 24;

export const PRODUCT_SORTS = ["newest", "price_asc", "price_desc", "popular"] as const;
export type ProductSort = (typeof PRODUCT_SORTS)[number];

/**
 * Validates raw URL search params for the product catalog (`/products?...`).
 * Live in its own module on purpose — the business-first `/search` contract in
 * `lib/search/` is left untouched.
 */
const productsSearchSchema = z.object({
  q: z.string().max(80).optional(),
  category: z.string().max(80).optional(),
  inStock: z.string().optional(),
  minPrice: z.string().optional(),
  maxPrice: z.string().optional(),
  sort: z.string().optional(),
  offset: z.string().optional(),
});

export type ProductsFilterState = {
  q: string;
  category: string;
  inStock: boolean;
  minPrice: number | null;
  maxPrice: number | null;
  sort: ProductSort;
  offset: number;
};

export function parseProductsParams(
  input: Record<string, string | string[] | undefined>,
): ProductsFilterState {
  const raw: Record<string, string> = {};
  for (const [k, v] of Object.entries(input)) {
    if (typeof v === "string" && v.length > 0) raw[k] = v;
  }
  const { data } = productsSearchSchema.safeParse(raw);
  const use = data ?? {};

  const numberOrNull = (v: string | undefined): number | null => {
    if (v == null || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : null;
  };

  const sort = (PRODUCT_SORTS as readonly string[]).includes(use.sort ?? "")
    ? (use.sort as ProductSort)
    : "newest";
  const offsetRaw = use.offset ? Number(use.offset) : 0;
  const offset = Number.isFinite(offsetRaw)
    ? Math.max(Math.trunc(offsetRaw), 0)
    : 0;

  return {
    q: (use.q ?? "").trim(),
    category: (use.category ?? "").trim(),
    inStock: use.inStock === "1" || use.inStock === "true",
    minPrice: numberOrNull(use.minPrice),
    maxPrice: numberOrNull(use.maxPrice),
    sort,
    offset,
  };
}

/** Serialize validated catalog state into a query string. */
export function buildProductsUrl(params: Partial<ProductsFilterState>): string {
  const sp = new URLSearchParams();
  const p: ProductsFilterState = {
    q: "",
    category: "",
    inStock: false,
    minPrice: null,
    maxPrice: null,
    sort: "newest",
    offset: 0,
    ...params,
  };

  if (p.q) sp.set("q", p.q);
  if (p.category) sp.set("category", p.category);
  if (p.inStock) sp.set("inStock", "1");
  if (p.minPrice != null) sp.set("minPrice", String(p.minPrice));
  if (p.maxPrice != null) sp.set("maxPrice", String(p.maxPrice));
  if (p.sort !== "newest") sp.set("sort", p.sort);
  if (p.offset > 0) sp.set("offset", String(p.offset));
  const qstring = sp.toString();
  return qstring ? `/products?${qstring}` : "/products";
}

export function hasActiveProductFilters(state: ProductsFilterState): boolean {
  return Boolean(
    state.q ||
      state.category ||
      state.inStock ||
      state.minPrice != null ||
      state.maxPrice != null ||
      state.sort !== "newest" ||
      state.offset > 0,
  );
}