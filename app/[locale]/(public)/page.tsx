import { setRequestLocale } from "next-intl/server";
import { Hero } from "@/components/home/hero";
import { CategoriesGrid } from "@/components/home/categories-grid";
import { FeaturedBusinesses } from "@/components/home/featured-businesses";
import { PopularProducts } from "@/components/home/popular-products";
import { TrustSection } from "@/components/home/trust-section";
import {
  getBusinessCount,
  getCategories,
  getCities,
  getFeaturedBusinesses,
  getFeaturedProducts,
} from "@/lib/queries";
import type { Locale } from "@/lib/translations";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [categories, businesses, businessCount, cities, products] = await Promise.all([
    getCategories(),
    getFeaturedBusinesses(),
    getBusinessCount(),
    getCities(),
    getFeaturedProducts(8),
  ]);

  return (
    <>
      <Hero categories={categories} />
      <CategoriesGrid categories={categories} locale={locale as Locale} />
      <FeaturedBusinesses businesses={businesses} />
      <PopularProducts products={products} />
      <TrustSection
        businessCount={businessCount}
        cityCount={cities.length}
        bookingCount={0}
      />
    </>
  );
}
