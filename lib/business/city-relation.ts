type CityLike = {
  id: string;
  slug?: string | null;
  name_ar?: string | null;
  name_fr?: string | null;
  name_en?: string | null;
};

/** Normalize a free-text city value for comparison (trim + lowercase). */
export function normalizeCity(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

/**
 * Unambiguous single city match by slug or any localized name.
 * Returns `undefined` for 0 or >1 matches — never guesses ambiguous values.
 */
export function findUniqueCity(
  cities: CityLike[],
  value: string | null | undefined,
): CityLike | undefined {
  const n = normalizeCity(value);
  if (!n) return undefined;
  const matches = cities.filter(
    (c) =>
      normalizeCity(c.slug) === n ||
      normalizeCity(c.name_en) === n ||
      normalizeCity(c.name_fr) === n ||
      normalizeCity(c.name_ar) === n,
  );
  return matches.length === 1 ? matches[0] : undefined;
}

/**
 * Resolve the initial `city_id` for edit mode.
 * Prefers an existing valid `city_id`; otherwise safely resolves from the
 * free-text `city` (only when it matches exactly one canonical city).
 * Never guesses ambiguous or unknown values.
 */
export function resolveInitialCityId(
  cities: CityLike[],
  business?: { city_id?: string | null; city?: string | null } | null,
): string {
  if (business?.city_id && cities.some((c) => c.id === business.city_id)) {
    return business.city_id;
  }
  if (business?.city) {
    const match = findUniqueCity(cities, business.city);
    if (match) return match.id;
  }
  return "";
}

/**
 * Derive the compatible free-text `city` value from the selected canonical
 * city. Using the slug keeps it URL-consistent and guarantees it can never
 * disagree with the persisted `city_id`.
 */
export function deriveCityValue(city: CityLike | undefined): string | null {
  return city?.slug ?? null;
}
