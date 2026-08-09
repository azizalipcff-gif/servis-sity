/** Central SEO helpers. Keep the canonical origin in ONE place. */

import { routing } from "@/i18n/routing";

export function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "https://servis-sity.com"
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