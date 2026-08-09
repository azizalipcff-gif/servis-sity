import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Home, ChevronRight } from "lucide-react";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { BusinessHero } from "@/components/business/business-hero";
import { BusinessInfo } from "@/components/business/business-info";
import { ServicesSection } from "@/components/business/services-section";
import { BusinessProducts } from "@/components/business/products";
import { OpeningHoursSection } from "@/components/business/opening-hours-section";
import { Gallery } from "@/components/business/gallery";
import { ReviewsSection } from "@/components/business/reviews-section";
import { MapSection } from "@/components/business/map-section";
import { ContactCard } from "@/components/business/contact-card";
import { BookingWidget } from "@/components/business/booking-widget";
import { StickyActionBar } from "@/components/business/sticky-action-bar";
import { FadeIn } from "@/components/motion";
import { RelatedSection } from "@/components/business/related-section";
import { toJsonLd } from "@/lib/security/sanitize";
import { siteUrl, absoluteUrl, imageUrl, localizedLanguages } from "@/lib/seo";
import {
  getBusinessBySlug,
  getRelatedBusinesses,
  getProductsForBusiness,
  type BusinessDetail,
} from "@/lib/queries";
import { localizedName, type Locale } from "@/lib/translations";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const business = await getBusinessBySlug(slug);
  if (!business)
    return { title: "Not found", description: "Business not found" };

  const category =
    business.categories
      ? localizedName(business.categories, locale as Locale)
      : business.city ?? "Pro";

  const description = business.description
    ? business.description.slice(0, 155)
    : `${category} in ${business.city ?? "Morocco"} — ${business.rating_avg.toFixed(1)} stars.`;

  const title = `${business.name} — ${category} in ${business.city ?? "Morocco"}`;
  const url = absoluteUrl(`/${locale}/business/${slug}`);
  const ogImage = imageUrl(business.cover_url) || imageUrl(business.logo_url) || absoluteUrl("/branding/servis-sity-logo.png");

  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: localizedLanguages(`/business/${slug}`),
    },
    openGraph: {
      title: `${business.name} · Servis Sity`,
      description,
      type: "website",
      url,
      siteName: "Servis Sity",
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: business.name,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: business.name,
      description,
      images: [ogImage],
    },
  };
}

export default async function BusinessPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("business");
  const business = await getBusinessBySlug(slug);
  if (!business) notFound();

  const related = await getRelatedBusinesses(business);
  const products = await getProductsForBusiness(business.id);
  const hasMap = Boolean((business.lat && business.lng) || business.address);
  const images = business.media.filter((m) => m.type === "image");

  return (
    <div className="pb-24 lg:pb-8">
      <BusinessHero business={business} />

      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="container-site mt-6 flex items-center gap-1.5 text-xs text-muted-foreground"
      >
        <Link
          href="/"
          className="inline-flex items-center gap-1 transition-colors hover:text-primary"
        >
          <Home className="size-3.5" />
          {t("home")}
        </Link>
        <ChevronRight className="size-3.5 rtl:rotate-180" />
        {business.categories ? (
          <Link
            href={`/category/${business.categories?.slug}`}
            className="transition-colors hover:text-primary"
          >
            {business.categories
              ? localizedName(business.categories, locale as Locale)
              : business.city}
          </Link>
        ) : (
          business.city && (
            <Link href="/" className="transition-colors hover:text-primary">
              {business.city}
            </Link>
          )
        )}
        <ChevronRight className="size-3.5 rtl:rotate-180" />
        <span className="truncate font-medium text-foreground">
          {business.name}
        </span>
      </nav>

      <div className="container-site mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-10">
        <div className="min-w-0 space-y-12">
          <FadeIn>
            <BusinessInfo business={business} locale={locale as Locale} />
          </FadeIn>

          <FadeIn>
            <ServicesSection business={business} locale={locale as Locale} />
          </FadeIn>

          <FadeIn>
            <BusinessProducts products={products} />
          </FadeIn>

          <FadeIn>
            <OpeningHoursSection business={business} locale={locale as Locale} />
          </FadeIn>

          {images.length > 0 && (
            <FadeIn>
              <Gallery images={images} title={business.name} />
            </FadeIn>
          )}

          <FadeIn>
            <ReviewsSection business={business} />
          </FadeIn>
        </div>

        <aside className="space-y-6">
          <ContactCard business={business} />
          <div id="book">
            <BookingWidget business={business} />
          </div>
          {hasMap && <MapSection business={business} />}
        </aside>
      </div>

      <RelatedSection businesses={related} />

      <StickyActionBar business={business} />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: toJsonLd(schema(business, locale)),
        }}
      />
    </div>
  );
}

function schema(business: BusinessDetail, locale: string) {
  const base = `${siteUrl()}/${locale}/business/${business.slug}`;
  const offers =
    business.services.length > 0
      ? {
          "@type": "OfferCatalog",
          name: "Services",
          itemListElement: business.services.map((s, i) => ({
            "@type": "Offer",
            position: i + 1,
            name: s.name,
            description: s.description ?? undefined,
            price: s.price ?? undefined,
            priceCurrency: "MAD",
            ...(s.duration_minutes
              ? { duration: `PT${s.duration_minutes}M` }
              : {}),
          })),
        }
      : undefined;

  return {
    "@context": "https://schema.org",
    "@type": business.verified ? "LocalBusiness" : "Business",
    name: business.name,
    description: business.description ?? undefined,
    image: business.cover_url ?? undefined,
    telephone: business.phone ?? undefined,
    url: base,
    address: business.address
      ? {
          "@type": "PostalAddress",
          streetAddress: business.address,
          addressLocality: business.city ?? undefined,
          addressCountry: "MA",
        }
      : undefined,
    geo:
      business.lat && business.lng
        ? { "@type": "GeoCoordinates", latitude: business.lat, longitude: business.lng }
        : undefined,
    aggregateRating:
      business.reviews_count > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: business.rating_avg,
            reviewCount: business.reviews_count,
          }
        : undefined,
    offers,
    review:
      business.reviews.slice(0, 5).length > 0
        ? business.reviews.slice(0, 5).map((r) => ({
            "@type": "Review",
            author: {
              "@type": "Person",
              name: r.profile?.full_name ?? "Anonymous",
            },
            datePublished: r.created_at,
            reviewRating: {
              "@type": "Rating",
              ratingValue: r.rating,
              bestRating: 5,
            },
            reviewBody: r.comment ?? undefined,
          }))
        : undefined,
  };
}