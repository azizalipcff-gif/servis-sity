/**
 * Shared types for the deterministic search-quality pipeline. These modules
 * live apart from `lib/search` so they stay pure and runnable under plain
 * Node (type stripping) — the design target that shows calls into fetch URL
 * queries, RPC options, and the parser swap.
 *
 * `SearchParsedFilters` is structurally identical to `ParsedFilters` from
 * `lib/search/types` (the API keeps importing that one); the local shape exists
 * so this package has zero `@/`-alias dependencies.
 */

export type SearchLang = "ar" | "fr" | "en";

export interface SearchParsedFilters {
  /** Residual free-text query after structured intents are extracted. */
  q: string;
  city?: string;
  /** Canonical category slug (may fall back to a parent at the API layer). */
  category?: string;
  minRating?: number;
  minPrice?: number;
  maxPrice?: number;
  verifiedOnly?: boolean;
  premiumOnly?: boolean;
  openNow?: boolean;
}

/** A single word from the user query, keeping both spellings. */
export interface WordToken {
  /** Original spelling (accents preserved) — used to rebuild residual `q`. */
  orig: string;
  /** Canonical form — used for alias matching. */
  norm: string;
}