import type { SearchBusiness, SortKey } from "./types";

/**
 * Smart ranking weights (see MASTER_PROMPT_V2 §8).
 * The algorithm rewards earned trust (verification, reviews, completeness,
 * recency) over raw pay-to-win. `plan` contributes but never dominates.
 */
const WEIGHTS = {
  verified: 30,
  planPro: 25,
  planPremium: 15,
  reviewCount: 0.4,
  rating: 5,
  completeness: 15,
  recent: 5,
} as const;

const RECENT_WINDOW_DAYS = 30;

export function relevanceScore(b: SearchBusiness): number {
  let score = 0;
  if (b.verified) score += WEIGHTS.verified;
  if (b.plan === "pro") score += WEIGHTS.planPro;
  else if (b.plan === "premium") score += WEIGHTS.planPremium;

  score += Math.min(b.reviews_count ?? 0, 50) * WEIGHTS.reviewCount;
  score += (b.rating_avg ?? 0) * WEIGHTS.rating;
  score += ((b.profile_completeness ?? 0) / 100) * WEIGHTS.completeness;

  const updated = b.last_updated_at ?? b.created_at;
  const daysSince = updated
    ? (Date.now() - new Date(updated).getTime()) / 86_400_000
    : Infinity;
  if (daysSince < RECENT_WINDOW_DAYS) score += WEIGHTS.recent;

  return score;
}

/**
 * Server-side comparator used after SQL-level filtering. Sorting lives on
 * the server so "recommended" can never be gamed or reimplemented by the
 * client.
 */
export function rankBusinesses(
  items: SearchBusiness[],
  sort: SortKey,
  userLat: number | null,
  userLng: number | null,
): SearchBusiness[] {
  const list = [...items];

  switch (sort) {
    case "rating":
      return list.sort(
        (a, b) =>
          (b.rating_avg ?? 0) - (a.rating_avg ?? 0) ||
          (b.reviews_count ?? 0) - (a.reviews_count ?? 0),
      );
    case "newest":
      return list.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    case "popular":
      return list.sort(
        (a, b) => (b.reviews_count ?? 0) - (a.reviews_count ?? 0),
      );
    case "premium":
      return list.sort(
        (a, b) =>
          planRank(a) - planRank(b) || relevanceScore(b) - relevanceScore(a),
      );
    case "recently_active":
      return list.sort(
        (a, b) =>
          ts(b.last_updated_at ?? b.created_at) -
          ts(a.last_updated_at ?? a.created_at),
      );
    case "recommended":
    default: {
      if (userLat != null && userLng != null) {
        return list.sort(
          (a, b) =>
            relevanceScore(b) - relevanceScore(a) ||
            (a.distance_km ?? Infinity) - (b.distance_km ?? Infinity),
        );
      }
      return list.sort((a, b) => relevanceScore(b) - relevanceScore(a));
    }
  }
}

export function planRank(b: SearchBusiness): number {
  return b.plan === "pro" ? 0 : b.plan === "premium" ? 1 : 2;
}

export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number | null,
  lng2: number | null,
): number | null {
  if (lat2 == null || lng2 == null) return null;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function ts(v: string): number {
  return new Date(v).getTime();
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}