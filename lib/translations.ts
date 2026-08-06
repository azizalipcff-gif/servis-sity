export const LOCALES = ["ar", "fr", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const isRtl = (locale: Locale) => locale === "ar";

export const dirForLocale = (locale: Locale): "rtl" | "ltr" =>
  isRtl(locale) ? "rtl" : "ltr";

export function formatPrice(amount: number | null, locale: Locale): string {
  if (amount === null || amount === undefined) return "";
  const value = new Intl.NumberFormat(locale === "ar" ? "ar-MA" : locale, {
    maximumFractionDigits: 0,
  }).format(amount);

  if (locale === "ar") return `${value} د.م.`;
  return `${value} DH`;
}

export function formatDate(date: Date | string, locale: Locale): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-MA" : locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(d);
}

export function localizedName(
  category: {
    name_ar: string;
    name_fr: string;
    name_en: string;
  } | null,
  locale: Locale,
): string {
  if (!category) return "";
  if (locale === "ar") return category.name_ar;
  if (locale === "fr") return category.name_fr;
  return category.name_en;
}
