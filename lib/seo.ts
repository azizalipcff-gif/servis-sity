/** Central SEO helpers. Keep the canonical origin in ONE place. */

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