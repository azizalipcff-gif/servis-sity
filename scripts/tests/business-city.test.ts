/**
 * Phase 2B — Canonical city selection for business create/edit.
 * Covers the city/city_id relationship: validation, persistence,
 * consistency, legacy resolution, and the Berkane/momia regression.
 *
 * Run: node scripts/tests/business-city.test.ts
 */

import { run, finish, assert, assertEqual } from "./suite.ts";
import { businessSchema } from "../../lib/validations/schemas.ts";
import {
  normalizeCity,
  findUniqueCity,
  resolveInitialCityId,
  deriveCityValue,
} from "../../lib/business/city-relation.ts";
import { localizedName } from "../../lib/translations.ts";

type TestCity = {
  id: string;
  slug: string;
  name_ar: string;
  name_fr: string;
  name_en: string;
};

const CITIES: TestCity[] = [
  { id: "berkane-id", slug: "berkane", name_ar: "بركان", name_fr: "Berkane", name_en: "Berkane" },
  { id: "casablanca-id", slug: "casablanca", name_ar: "الدار البيضاء", name_fr: "Casablanca", name_en: "Casablanca" },
  { id: "foo-a-id", slug: "foo-a", name_ar: "فو", name_fr: "Foo", name_en: "Foo" },
  { id: "foo-b-id", slug: "foo-b", name_ar: "فو", name_fr: "foo", name_en: "foo" },
];

const UUID = "00000000-0000-0000-0000-000000000000";
const berkane = CITIES[0];
const casablanca = CITIES[1];

/* ---- 1. valid city selection ---- */
await run("business: valid city_id accepted", () => {
  const r = businessSchema.safeParse({
    name: "Salon",
    category_id: UUID,
    city_id: UUID,
    slug: "salon",
  });
  assert(r.success, "valid city_id must parse");
});

/* ---- 2. invalid city_id rejection ---- */
await run("business: invalid city_id rejected", () => {
  const r = businessSchema.safeParse({
    name: "Salon",
    category_id: UUID,
    city_id: "not-a-uuid",
    slug: "salon",
  });
  assert(!r.success, "non-uuid city_id must be rejected");
});

await run("business: missing city_id rejected", () => {
  const r = businessSchema.safeParse({
    name: "Salon",
    category_id: UUID,
    slug: "salon",
  });
  assert(!r.success, "absent city_id must be rejected");
});

/* ---- 3. city_id persistence ---- */
await run("business: city_id persisted in parsed output", () => {
  const r = businessSchema.safeParse({
    name: "Salon",
    category_id: UUID,
    city_id: UUID,
    slug: "salon",
  });
  assert(r.success && r.data.city_id === UUID, "city_id must round-trip");
});

/* ---- 4. city/city_id consistency ---- */
await run("deriveCityValue: uses canonical slug (never disagrees with city_id)", () => {
  assertEqual(deriveCityValue(berkane), "berkane");
  assertEqual(deriveCityValue(casablanca), "casablanca");
  // Round-trip: the derived city text resolves back to the same canonical city.
  const back = findUniqueCity(CITIES, deriveCityValue(berkane));
  assert(back?.id === berkane.id, "derived city text must resolve to same city");
});

await run("resolveInitialCityId: prefers existing valid city_id", () => {
  const id = resolveInitialCityId(CITIES, { city_id: casablanca.id, city: "Berkane" });
  assertEqual(id, casablanca.id);
});

await run("resolveInitialCityId: legacy text resolves uniquely", () => {
  const id = resolveInitialCityId(CITIES, { city_id: null, city: "Berkane" });
  assertEqual(id, berkane.id);
});

await run("resolveInitialCityId: ambiguous text is never guessed", () => {
  // "foo" matches both foo-a and foo-b -> must NOT pick one.
  const id = resolveInitialCityId(CITIES, { city_id: null, city: "foo" });
  assertEqual(id, "");
});

await run("resolveInitialCityId: unknown text leaves empty", () => {
  const id = resolveInitialCityId(CITIES, { city_id: null, city: "Atlantis" });
  assertEqual(id, "");
});

/* ---- 5. editing existing business ---- */
await run("edit: resolves from stored city_id", () => {
  const id = resolveInitialCityId(CITIES, { city_id: berkane.id, city: "berkane" });
  assertEqual(id, berkane.id);
});

/* ---- 6. Berkane / momia regression ---- */
await run("regression: momia loads with city_id=Berkane, city=berkane", () => {
  const id = resolveInitialCityId(CITIES, { city_id: berkane.id, city: "berkane" });
  assertEqual(id, berkane.id);
  assertEqual(deriveCityValue(findUniqueCity(CITIES, "berkane")), "berkane");
});

await run("regression: 'berkane' (slug) and 'Berkane' (name) both map to Berkane", () => {
  assertEqual(findUniqueCity(CITIES, "berkane")?.id, berkane.id);
  assertEqual(findUniqueCity(CITIES, "Berkane")?.id, berkane.id);
});

/* ---- 7. localized city display ---- */
await run("localizedName: Berkane renders per locale", () => {
  assertEqual(localizedName(berkane, "en"), "Berkane");
  assertEqual(localizedName(berkane, "fr"), "Berkane");
  assertEqual(localizedName(berkane, "ar"), "بركان");
});

await run("normalizeCity: trims and lowercases", () => {
  assertEqual(normalizeCity("  BERKANE "), "berkane");
});

finish();
