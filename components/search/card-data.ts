import type { SearchBusiness, SearchItem } from "@/lib/search/types";
import type { Locale } from "@/lib/translations";
import { localizedName } from "@/lib/translations";
import { businessHref } from "@/lib/business/url";

/**
 * Pure, hook-free normalization from a real catalog row in any of the three
 * card components AND the mixed `/api/search` feed into ONE presentational
 * shape. The card shell only knows about `ResultItemData`, so every surface
 * (home, category, service/product catalogs, search) shares one design.
 */

export type EntityKind = "business" | "service" | "product";

export type PriceMode = "from" | "exact" | "request";

export type ResultItemData = {
  kind: EntityKind;
  id: string;
  href: string;
  name: string;
  imageSrc: string | null;
  verified: boolean;
  categoryLabel: string | null;
  rating: number;
  reviewsCount: number;
  city: string | null;
  sellerName: string | null;
  durationMinutes: number | null;
  priceValue: number | null;
  priceMode: PriceMode;
  compareAtPrice: number | null;
  discountPct: number | null;
  outOfStock: boolean;
};

export type ResultSellerInput = {
  name: string | null;
  slug?: string | null;
  logo_url?: string | null;
  verified?: boolean;
  city?: string | null;
  city_slug?: string | null;
  rating_avg?: number;
  reviews_count?: number;
};

export type ServiceCardInput = {
  id: string;
  name: string;
  price: number | null;
  duration_minutes: number | null;
  photo_url: string | null;
  gallery?: string[];
  description?: string | null;
  business?: ResultSellerInput | null;
};

export type ProductCardInput = {
  id: string;
  slug: string;
  name: string;
  price: number;
  compare_at_price: number | null;
  stock: number;
  images: string[];
  description?: string | null;
  business?: ResultSellerInput | null;
};

function toSeller(seller: ResultSellerInput | null | undefined): ResultSellerInput {
  return seller ?? { name: null };
}

export function toBusinessItemData(
  business: SearchBusiness,
): ResultItemData {
  return {
    kind: "business",
    id: business.id,
    href: businessHref(business),
    name: business.name,
    imageSrc: business.cover_url ?? business.logo_url ?? null,
    verified: business.verified,
    categoryLabel: null, // resolved by caller (needs translation context)
    rating: business.rating_avg ?? 0,
    reviewsCount: business.reviews_count ?? 0,
    city: business.city ?? null,
    sellerName: null,
    durationMinutes: null,
    priceValue: business.starting_price ?? null,
    priceMode: business.starting_price != null ? "from" : "request",
    compareAtPrice: null,
    discountPct: null,
    outOfStock: false,
  };
}

export function toServiceItemData(
  service: ServiceCardInput,
  sellerInput?: ResultSellerInput,
  showSeller = true,
): ResultItemData {
  const seller = toSeller(service.business ?? sellerInput);
  const rating = seller.rating_avg ?? 0;
  return {
    kind: "service",
    id: service.id,
    href: `/service/${service.id}`,
    name: service.name,
    imageSrc: service.photo_url ?? service.gallery?.[0] ?? null,
    verified: Boolean(seller.verified),
    categoryLabel: null,
    rating,
    reviewsCount: seller.reviews_count ?? 0,
    city: seller.city ?? null,
    sellerName: showSeller ? (seller.name ?? null) : null,
    durationMinutes: service.duration_minutes ?? null,
    priceValue: service.price ?? null,
    priceMode: service.price != null ? "exact" : "request",
    compareAtPrice: null,
    discountPct: null,
    outOfStock: false,
  };
}

export function toProductItemData(
  product: ProductCardInput,
  sellerInput?: ResultSellerInput,
  showSeller = true,
): ResultItemData {
  const seller = toSeller(product.business ?? sellerInput);
  const hasDiscount =
    product.compare_at_price != null && product.compare_at_price > product.price;
  return {
    kind: "product",
    id: product.id,
    href: `/product/${product.slug}`,
    name: product.name,
    imageSrc: product.images?.[0] ?? null,
    verified: Boolean(seller.verified),
    categoryLabel: null,
    rating: seller.rating_avg ?? 0,
    reviewsCount: seller.reviews_count ?? 0,
    city: seller.city ?? null,
    sellerName: showSeller ? (seller.name ?? null) : null,
    durationMinutes: null,
    priceValue: product.price,
    priceMode: "exact",
    compareAtPrice: hasDiscount ? product.compare_at_price : null,
    discountPct: hasDiscount
      ? Math.round((1 - product.price / product.compare_at_price!) * 100)
      : null,
    outOfStock: product.stock <= 0,
  };
}

/** Category display name for the unified card body. */
export function categoryText(
  categories: { name_ar: string; name_fr: string; name_en: string } | null,
  locale: Locale,
): string | null {
  const label = localizedName(categories, locale);
  return label || null;
}

/**
 * Normalize one row from the mixed `/api/search` feed into the single
 * presentational shape. The grid view never needs to know which kind it
 * renders — it just maps every item through here and drops it into the shell.
 */
export function fromSearchItem(item: SearchItem): ResultItemData {
  switch (item.kind) {
    case "business":
      return toBusinessItemData(item);
    case "service": {
      const seller = item.business;
      return {
        kind: "service",
        id: item.id,
        href: `/service/${item.id}`,
        name: item.name,
        imageSrc: item.photo_url ?? null,
        verified: seller.verified,
        categoryLabel: null,
        rating: seller.rating_avg ?? 0,
        reviewsCount: seller.reviews_count ?? 0,
        city: seller.city ?? null,
        sellerName: item.sellerName ?? seller.name ?? null,
        durationMinutes: item.duration_minutes ?? null,
        priceValue: item.price ?? null,
        priceMode: item.price != null ? "exact" : "request",
        compareAtPrice: null,
        discountPct: null,
        outOfStock: false,
      };
    }
    case "product": {
      const seller = item.business;
      const hasDiscount =
        item.compare_at_price != null && item.compare_at_price > item.price;
      return {
        kind: "product",
        id: item.id,
        href: `/product/${item.slug}`,
        name: item.name,
        imageSrc: item.images?.[0] ?? null,
        verified: seller.verified,
        categoryLabel: null,
        rating: seller.rating_avg ?? 0,
        reviewsCount: seller.reviews_count ?? 0,
        city: seller.city ?? null,
        sellerName: item.sellerName ?? seller.name ?? null,
        durationMinutes: null,
        priceValue: item.price,
        priceMode: "exact",
        compareAtPrice: hasDiscount ? item.compare_at_price : null,
        discountPct: hasDiscount
          ? Math.round((1 - item.price / item.compare_at_price!) * 100)
          : null,
        outOfStock: item.stock <= 0,
      };
    }
  }
}