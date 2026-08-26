/**
 * SEO infrastructure contract tests.
 *
 * These guard the production SEO plumbing required by the audit:
 *  - canonical origin is the production Vercel URL (no old `service-city.ma`,
 *    no stray Vercel deployment)
 *  - robots.txt blocks private/authenticated areas but never public pages
 *  - sitemap.xml is built from the canonical origin and only includes
 *    indexable public URLs
 *
 * It reads the source modules as text (the project's `@/` alias is not
 * resolvable by the plain-node test runner), which is enough to lock the
 * required rules in place and catch accidental regressions.
 *
 * Run: node scripts/tests/seo.test.ts
 */
import { run, finish, assert } from "./suite.ts";
import { readFileSync } from "node:fs";

const CANONICAL = "https://servis-sity-iwtr.vercel.app";

function read(p: string): string {
  return readFileSync(p, "utf8");
}

const seo = read("lib/seo.ts");
const robots = read("app/robots.ts");
const sitemap = read("app/sitemap.ts") + "\n" + read("lib/sitemap-entries.ts");

await run("seo: canonical default origin is the production Vercel URL", () => {
  assert(
    seo.includes(`"${CANONICAL}"`),
    `lib/seo.ts default origin must be ${CANONICAL}`,
  );
});

await run("robots: disallows admin, dashboard, auth, profile, messenger, checkout, api", () => {
  const required = [
    "mvkbazizalimvkbadmen", // admin surface
    "dashboard",
    "login",
    "register",
    "forgot-password",
    "update-password",
    "profile",
    "messenger",
    "checkout",
    "/auth/",
    "/api/",
  ];
  for (const p of required) {
    assert(
      robots.includes(p) || seo.includes(p),
      `robots must disallow ${p}`,
    );
  }
});

await run("robots: does NOT disallow public locales or public content routes", () => {
  // Parse the ROBOTS_DISALLOW array itself (not the whole file, which contains
  // illustrative examples in comments) and ensure no entry blocks public pages.
  const m = seo.match(/ROBOTS_DISALLOW: string\[\] = \[([\s\S]*?)\];/);
  assert(m, "ROBOTS_DISALLOW array must be present in lib/seo.ts");
  const entries = [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]);

  const forbidden = [
    "/en",
    "/fr",
    "/ar",
    "/businesses",
    "/category",
    "/help",
    "/pricing",
    "/products",
    "/services",
    "/",
  ];
  for (const f of forbidden) {
    assert(
      !entries.includes(f),
      `robots must NOT disallow public route ${f}`,
    );
  }
  // Every entry must be a path pattern (rooted or wildcard-rooted).
  for (const e of entries) {
    assert(
      e.startsWith("/") || e.startsWith("/*/"),
      `disallow entry "${e}" must be a rooted path pattern`,
    );
  }
});

await run("robots: references the sitemap via the canonical-origin helper", () => {
  assert(
    robots.includes("sitemapUrl()"),
    "robots must set sitemap via sitemapUrl()",
  );
});

await run("sitemap: builds URLs from siteUrl() and never references an old domain", () => {
  assert(sitemap.includes("siteUrl()"), "sitemap must build URLs from siteUrl()");
  assert(
    !sitemap.includes("service-city.ma"),
    "sitemap must not reference the old service-city.ma domain",
  );
});

await run("sitemap: includes localized home, listing, category, business, product, service, help", () => {
  const required = [
    "routing.locales", // localized homepages + loops
    "/business",
    "/products",
    "/services",
    "/pricing",
    "/help",
    "/category/",
    "/product/",
    "/service/",
  ];
  for (const token of required) {
    assert(sitemap.includes(token), `sitemap must include ${token}`);
  }
});

await run("sitemap: excludes api, auth, dashboard, admin URLs", () => {
  const excluded = ["/api/", "login", "register", "dashboard", "mvkbazizalimvkbadmen"];
  for (const token of excluded) {
    assert(!sitemap.includes(token), `sitemap must NOT include ${token}`);
  }
});

await finish();
