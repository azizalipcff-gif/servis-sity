/**
 * F2 — Canonical city slug regression tests.
 * Verifies business URL generation prefers the canonical `cities.slug`
 * (resolved via `city_id`) over slugifying free-text `business.city`.
 *
 * Run: node scripts/tests/url.test.ts
 */

import { run, finish, assertEqual } from "./suite.ts";
import {
  businessCitySlug,
  businessHref,
  businessPath,
  citySlugFallback,
  DEFAULT_CITY_SLUG,
} from "../../lib/business/url.ts";

// Canonical slug is resolved from the cities table and attached as `city_slug`.
await run("F2: Casablanca business -> casablanca", () => {
  assertEqual(
    businessCitySlug({ city: "Casablanca", city_slug: "casablanca" }),
    "casablanca",
  );
  assertEqual(
    businessHref({ slug: "rossito", city: "Casablanca", city_slug: "casablanca" }),
    "/businesses/casablanca/rossito",
  );
  assertEqual(
    businessPath("en", { slug: "rossito", city: "Casablanca", city_slug: "casablanca" }),
    "/en/businesses/casablanca/rossito",
  );
});

await run("F2: Berkane business -> berkane", () => {
  assertEqual(
    businessCitySlug({ city: "Berkane", city_slug: "berkane" }),
    "berkane",
  );
  assertEqual(
    businessHref({ slug: "momia-shop", city: "Berkane", city_slug: "berkane" }),
    "/businesses/berkane/momia-shop",
  );
});

// Tangier's English display name slugifies to "tangier", but the canonical
// cities.slug is "tanger" — the canonical slug must win.
await run("F2: Tangier display-name mismatch -> canonical slug tanger", () => {
  assertEqual(citySlugFallback("Tangier"), "tangier");
  assertEqual(
    businessCitySlug({ city: "Tangier", city_slug: "tanger" }),
    "tanger",
  );
  assertEqual(
    businessHref({ slug: "tanger-shop", city: "Tangier", city_slug: "tanger" }),
    "/businesses/tanger/tanger-shop",
  );
  assertEqual(
    businessPath("ar", { slug: "tanger-shop", city: "Tangier", city_slug: "tanger" }),
    "/ar/businesses/tanger/tanger-shop",
  );
});

// Legacy rows without a resolved city_slug fall back to slugify(city).
await run("F2: legacy row (no city_slug) -> slugify(city)", () => {
  assertEqual(
    businessCitySlug({ city: "Casablanca" }),
    "casablanca",
  );
  assertEqual(
    businessHref({ slug: "legacy", city: "Berkane" }),
    "/businesses/berkane/legacy",
  );
});

await run("F2: missing city -> default maroc", () => {
  assertEqual(businessCitySlug({}), DEFAULT_CITY_SLUG);
  assertEqual(businessCitySlug({ city: null, city_slug: null }), DEFAULT_CITY_SLUG);
  assertEqual(
    businessHref({ slug: "nomad", city: null }),
    `/businesses/${DEFAULT_CITY_SLUG}/nomad`,
  );
});

// Accented display names still map to canonical ASCII slugs via the data layer.
await run("F2: accented display name handled by canonical slug", () => {
  assertEqual(
    businessCitySlug({ city: "Salé", city_slug: "sale" }),
    "sale",
  );
  assertEqual(
    businessCitySlug({ city: "Meknès", city_slug: "meknes" }),
    "meknes",
  );
});

await finish();
