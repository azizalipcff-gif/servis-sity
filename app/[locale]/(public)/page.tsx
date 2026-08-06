import { setRequestLocale } from "next-intl/server";
import { Hero } from "@/components/home/hero";
import { CategoriesGrid } from "@/components/home/categories-grid";
import { FeaturedBusinesses } from "@/components/home/featured-businesses";
import { TrustSection } from "@/components/home/trust-section";
import {
  getBusinessCount,
  getCategories,
  getFeaturedBusinesses,
} from "@/lib/queries";
import { MOROCCAN_CITIES } from "@/lib/constants";
import type { Locale } from "@/lib/translations";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [categories, businesses, businessCount] = await Promise.all([
    getCategories(),
    getFeaturedBusinesses(),
    getBusinessCount(),
  ]);

  return (
    <>
      <Hero categories={categories} />
      <CategoriesGrid categories={categories} locale={locale as Locale} />
      <FeaturedBusinesses businesses={businesses} />
      <TrustSection
        businessCount={businessCount}
        cityCount={MOROCCAN_CITIES.length}
        bookingCount={0}
      />
    </>
  );
}
