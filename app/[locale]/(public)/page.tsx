import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { Hero } from "@/components/home/hero";
import { CategoryStrip } from "@/components/home/category-strip";
import { FeaturedBusinesses } from "@/components/home/featured-businesses";
import { PopularCategories } from "@/components/home/popular-categories";
import { PopularProducts } from "@/components/home/popular-products";
import { PromoBanner } from "@/components/home/promo-banner";
import { TrustSection } from "@/components/home/trust-section";
import {
  getBusinessCount,
  getCategories,
  getCategoryCounts,
  getCities,
  getFeaturedBusinesses,
  getFeaturedProducts,
} from "@/lib/queries";
import type { Locale } from "@/lib/translations";
import { siteUrl, absoluteUrl, localizedLanguages } from "@/lib/seo";
import { toJsonLd } from "@/lib/security/sanitize";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "meta" });

  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: absoluteUrl(`/${locale}`),
      languages: localizedLanguages(""),
    },
    openGraph: {
      title: t("title"),
      description: t("description"),
      url: absoluteUrl(`/${locale}`),
      siteName: "Servis Sity",
      images: [{ url: absoluteUrl("/branding/servis-sity-logo.png") }],
    },
  };
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [categories, businesses, businessCount, cities, products, counts] = await Promise.all([
    getCategories(),
    getFeaturedBusinesses(),
    getBusinessCount(),
    getCities(),
    getFeaturedProducts(8),
    getCategoryCounts(),
  ]);

  const organizationJsonLd = toJsonLd({
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Servis Sity",
    url: siteUrl(),
    logo: `${siteUrl()}/branding/servis-sity-logo.png`,
    description:
      "The Moroccan platform connecting customers with local businesses and artisans: electrician, plumber, restaurant, barber, doctor and more.",
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: organizationJsonLd }}
      />
      <Hero categories={categories} businesses={businesses} />
      <CategoryStrip
        categories={categories}
        counts={counts}
        locale={locale as Locale}
      />
      <FeaturedBusinesses businesses={businesses} locale={locale as Locale} />
      <PopularCategories categories={categories} locale={locale as Locale} />
      <PopularProducts products={products} />
      <PromoBanner />
      <TrustSection
        businessCount={businessCount}
        cityCount={cities.length}
        bookingCount={0}
      />
    </>
  );
}