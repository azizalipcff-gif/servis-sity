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
    languages[locale] = absoluteUrl(`/${locale}${pathname}`);
  }
  languages["x-default"] = absoluteUrl(
    `/${routing.defaultLocale}${pathname}`,
  );
  return languages;
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