export const MOROCCAN_CITIES = [
  "Casablanca",
  "Rabat",
  "Marrakech",
  "Fès",
  "Tanger",
  "Agadir",
  "Meknès",
  "Oujda",
  "Kenitra",
  "Tétouan",
  "Salé",
  "Mohammedia",
  "El Jadida",
  "Nador",
  "Béni Mellal",
  "Laâyoune",
  "Dakhla",
  "Essaouira",
  "Taza",
  "Safi",
] as const;

export const POPULAR_CATEGORY_SLUGS = [
  "electricien",
  "plombier",
  "restaurant",
  "coiffeur",
  "mecanicien",
  "menuiserie",
] as const;

export const DEFAULT_PLACEHOLDER_IMAGES = {
  cover: "https://placehold.co/1600x900/f1e7d8/4a3b2f?text=Service+City",
  logo: "https://placehold.co/400x400/bf5b32/ffffff?text=Logo",
  business: "https://placehold.co/800x600/f1e7d8/4a3b2f?text=Service+City",
};

/** Light neutral SVG used as a Next.js blur placeholder while images load. */
export const IMAGE_BLUR_PLACEHOLDER =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiNmMWU3ZDgiLz48L3N2Zz4=";

export type LocalizedLabel = Record<"ar" | "fr" | "en", string>;

/** Trending category suggestions shown in the search autocomplete. */
export const TRENDING_CATEGORIES: Array<{
  slug: string;
  icon: string;
  label: LocalizedLabel;
}> = [
  { slug: "electricien", icon: "zap", label: { ar: "كهربائي", fr: "Électricien", en: "Electrician" } },
  { slug: "plombier", icon: "droplets", label: { ar: "سباك", fr: "Plombier", en: "Plumber" } },
  { slug: "restaurant", icon: "utensils", label: { ar: "مطعم", fr: "Restaurant", en: "Restaurant" } },
  { slug: "coiffeur", icon: "scissors", label: { ar: "حلاق", fr: "Coiffeur", en: "Barber" } },
  { slug: "mecanicien", icon: "wrench", label: { ar: "ميكانيكي", fr: "Mécanicien", en: "Mechanic" } },
  { slug: "menuiserie", icon: "hammer", label: { ar: "نجار", fr: "Menuisier", en: "Carpenter" } },
];

export const categoryLabel = (
  slug: string,
  locale: keyof LocalizedLabel,
): string | null => {
  const cat = TRENDING_CATEGORIES.find((c) => c.slug === slug);
  return cat ? cat.label[locale] : null;
};
