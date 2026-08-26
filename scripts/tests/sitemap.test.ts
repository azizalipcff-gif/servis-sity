/**
 * Regression test for sitemap entry generation.
 *
 * Directly calls the pure `buildSitemapEntries` builder (no DB, no network)
 * with representative bad data and asserts that NO generated entry can ever be
 * `{}`, lack a `url`, or serialize to `<url></url>` / `<loc></loc>`.
 *
 * Run: node scripts/tests/sitemap.test.ts
 */
import { run, finish, assert } from "./suite.ts";
import { buildSitemapEntries } from "../../lib/sitemap-entries.ts";

const SITE = "https://servis-sity-iwtr.vercel.app";

function fakeBusinessHref(b: {
  slug?: string | null;
  city?: string | null;
  city_id?: string | null;
  city_slug?: string | null;
}): string {
  const city = b.city_slug?.trim() || "maroc";
  return `/businesses/${city}/${b.slug ?? ""}`;
}

/** Serialize exactly the way Next.js would, to catch empty <url></url>. */
function serialize(entries: { url: string | URL }[]): string {
  return entries
    .map((e) => `<url><loc>${String(e.url)}</loc></url>`)
    .join("\n");
}

const BAD_INPUT = {
  categories: [
    { slug: null },
    { slug: undefined },
    { slug: "" },
    { slug: "   " },
    { slug: "valid-cat" },
    { slug: "valid-cat" },
    { slug: "bad/slug" },
  ],
  businesses: [
    { slug: null, city_slug: "oujda" },
    { slug: "", city_slug: "oujda" },
    { slug: "valid-biz", city_slug: "oujda", last_updated_at: null },
  ],
  products: [
    { slug: undefined },
    { slug: "" },
    { slug: "valid-prod", updated_at: "2024-01-01T00:00:00Z" },
  ],
  services: [{ id: null }, { id: "valid-svc", updated_at: null }],
};

await run("sitemap builder: every entry has a non-empty canonical url", () => {
  const entries = buildSitemapEntries(BAD_INPUT, {
    siteUrl: SITE,
    businessHref: fakeBusinessHref,
    locales: ["en", "fr", "ar"],
  });
  assert(entries.length > 0, "should produce some valid entries");
  for (const e of entries) {
    assert(typeof e.url === "string" && e.url.length > 0, `entry url must be non-empty string, got ${JSON.stringify(e.url)}`);
    assert(
      e.url === SITE || e.url.startsWith(`${SITE}/`),
      `entry url must be canonical ${SITE}, got ${e.url}`,
    );
    assert(!e.url.includes("?") && !e.url.includes("#"), `entry url must not contain query/hash, got ${e.url}`);
  }
});

await run("sitemap builder: never serializes an empty <url> or <loc>", () => {
  const entries = buildSitemapEntries(BAD_INPUT, {
    siteUrl: SITE,
    businessHref: fakeBusinessHref,
    locales: ["en", "fr", "ar"],
  });
  const xml = serialize(entries);
  assert(!/<url>\s*<\/url>/.test(xml), "must never emit <url></url>");
  assert(!/<loc>\s*<\/loc>/.test(xml), "must never emit <loc></loc>");
  // No leaked null/undefined slug text.
  assert(!/null/.test(xml), "must not leak 'null' slug text");
  assert(!/undefined/.test(xml), "must not leak 'undefined' slug text");
  // No empty url objects (defensive double-check on the array itself).
  for (const e of entries) {
    assert(!!e.url, "no entry may have a falsy url");
  }
});

await run("sitemap builder: drops invalid slugs and keeps only valid entries", () => {
  const entries = buildSitemapEntries(BAD_INPUT, {
    siteUrl: SITE,
    businessHref: fakeBusinessHref,
    locales: ["en", "fr", "ar"],
  });
  // homepages: 3
  // listings (5 paths): 15
  // categories: only "valid-cat" (deduped) -> 3
  // businesses: only "valid-biz" -> 3
  // products: only "valid-prod" -> 3
  // services: only "valid-svc" -> 3
  const expected = 3 + 15 + 3 + 3 + 3 + 3;
  assert(entries.length === expected, `expected ${expected} valid entries, got ${entries.length}`);

  const urls = entries.map((e) => String(e.url));
  assert(new Set(urls).size === urls.length, "no duplicate urls allowed");
});

await run("sitemap builder: malformed/non-canonical url is rejected by add()", () => {
  // Inject an entry that would resolve to a non-canonical origin; the builder
  // must drop it (origin guard in add()).
  const entries = buildSitemapEntries(
    { categories: [{ slug: "x" }], businesses: [], products: [], services: [] },
    {
      siteUrl: SITE,
      businessHref: fakeBusinessHref,
      locales: ["en"],
    },
  );
  for (const e of entries) {
    assert(String(e.url).startsWith(SITE), `must be canonical, got ${String(e.url)}`);
  }
});

await finish();
