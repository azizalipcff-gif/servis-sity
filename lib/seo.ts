/** Central SEO helpers. Keep the canonical origin in ONE place. */

import { routing } from "@/i18n/routing";

export function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "https://servis-sity-iwtr.vercel.app"
  ).replace(/\/$/, "");
}

export function absoluteUrl(path = ""): string {
  return `${siteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Map of supported site locales to hreflang codes. */
export const hreflangLocales: Record<string, string> = {
  en: "en-US",
  fr: "fr-FR",
  ar: "ar-MA",
};

/**
 * Build the `alternates.languages` map for a page that has the same pathname
 * across every locale (e.g. `/business/foo`). Includes `x-default`.
 */
export function localizedLanguages(pathname: string): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const locale of routing.locales) {
    languages[hreflangLocales[locale] ?? locale] = absoluteUrl(
      `/${locale}${pathname}`,
    );
  }
  languages["x-default"] = absoluteUrl(`/${routing.defaultLocale}${pathname}`);
  return languages;
}

/** OG/Twitter locale tag in the `lang_TERRITORY` underscore form (e.g. `ar_MA`). */
export function ogLocale(locale: string): string {
  return (hreflangLocales[locale] ?? locale).replace("-", "_");
}

/** Absolute URL for images that may be stored as relative paths. */
export function imageUrl(url?: string | null): string {
  if (!url) return "";
  return /^https?:\/\//i.test(url) ? url : absoluteUrl(url);
}

/**
 * robots.txt disallow rules.
 *
 * The app uses localePrefix "always", so every public/private page carries a
 * "/<locale>/" segment — private areas are matched with a star-slash wildcard.
 * A bare "/admin" pattern would never match "/en/mvkbazizalimvkbadmen" and would
 * leave those pages crawlable, so the admin/dashboard/auth/profile/messenger/
 * checkout segments are all locale-prefixed.
 *
 * The OAuth callback and every API route live at the root (no locale prefix),
 * so they are blocked with a root-anchored pattern.
 */
export const ROBOTS_DISALLOW: string[] = [
  "/*/mvkbazizalimvkbadmen", // admin surface (all sub-pages)
  "/*/dashboard", // owner/business dashboard
  "/*/login", // auth
  "/*/register", // auth
  "/*/forgot-password", // auth
  "/*/update-password", // auth
  "/*/profile", // private user profile + sub-pages
  "/*/messenger", // private messaging
  "/*/checkout", // transactional checkout flow
  "/auth/", // OAuth callback (root, no locale prefix)
  "/api/", // all API routes
];

/** Absolute URL of the generated sitemap, using the canonical origin. */
export function sitemapUrl(): string {
  return `${siteUrl()}/sitemap.xml`;
}

/**
 * Centralized, configurable supply thresholds for programmatic SEO pages.
 *
 * City landing pages are only indexable (and only included in the sitemap)
 * when local supply clears one of these bars. This prevents doorway/thin
 * pages from being indexed. Tune here — do not hardcode in pages.
 */
export const INDEX_THRESHOLDS = {
  city: {
    minBusinesses: 5,
    minServices: 8,
  },
} as const;

/** Supply summary for a single city, used by the gating logic. */
export type CitySupply = { businesses: number; services: number };

/**
 * Decide whether a city landing page should be indexed. A city qualifies when
 * it has enough businesses OR enough services to support a genuinely useful
 * page. Below threshold it still renders (for users/internal links) but is
 * `noindex` and excluded from the sitemap.
 */
export function isCityIndexable(supply: CitySupply): boolean {
  return (
    supply.businesses >= INDEX_THRESHOLDS.city.minBusinesses ||
    supply.services >= INDEX_THRESHOLDS.city.minServices
  );
}