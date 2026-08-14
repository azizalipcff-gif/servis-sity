/**
 * Deterministic term-overlap scoring used by the search-quality pipeline.
 *
 * The API composes this with (or mirrors it in) the `hybrid_search` RPC so
 * "recommended" order is consistent whether the query hits Postgres or the
 * in-memory fallback. Kept pure and dependency-free for unit tests.
 */

import { canonicalTokens } from "./normalize.ts";

export interface ScoreResult {
  /** Fraction of query tokens found anywhere in the document text. */
  overlap: number;
  /** True when the full query appears as a contiguous token phrase. */
  phrase: boolean;
  /** 0..1 composite — phrase hits weigh more than scattered overlap. */
  score: number;
}

/**
 * Composite score: 0.6 * overlap + 0.4 * phrase. `phrase` requires the query
 * tokens to appear contiguously (same order) in the document token stream.
 */
export function scoreQuery(query: string, text: string): ScoreResult {
  const qTokens = canonicalTokens(query).filter((t) => t.length > 0);
  if (qTokens.length === 0) return { overlap: 0, phrase: false, score: 0 };

  const docTokens = canonicalTokens(text);
  const docSet = new Set(docTokens);

  const hits = qTokens.filter((t) => docSet.has(t)).length;
  const overlap = hits / qTokens.length;

  // Phrase: contiguous run of the full query, in order.
  let phrase = false;
  if (docTokens.length >= qTokens.length) {
    for (let i = 0; i <= docTokens.length - qTokens.length; i += 1) {
      let ok = true;
      for (let j = 0; j < qTokens.length; j += 1) {
        if (docTokens[i + j] !== qTokens[j]) {
          ok = false;
          break;
        }
      }
      if (ok) {
        phrase = true;
        break;
      }
    }
  }

  const score = overlap * 0.6 + (phrase ? 0.4 : 0);
  return { overlap, phrase, score };
}

/** Stable sort of items by their query score, descending. */
export function rankByQuery<T>(
  items: T[],
  query: string,
  textOf: (item: T) => string,
): T[] {
  return items
    .map((item) => ({ item, score: scoreQuery(query, textOf(item)).score }))
    .sort((a, b) => b.score - a.score || 0)
    .map((x) => x.item);
}