import { setRequestLocale, getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LayoutGrid } from "lucide-react";
import { BusinessCard } from "@/components/business-card";
import { EmptyState } from "@/components/empty-state";
import { FadeIn, Stagger, StaggerItem } from "@/components/motion";
import { getCategoryBySlug, getBusinessesByCategory } from "@/lib/queries";
import { localizedName, type Locale } from "@/lib/translations";
import { absoluteUrl, localizedLanguages, imageUrl } from "@/lib/seo";
import { toJsonLd } from "@/lib/security/sanitize";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const category = await getCategoryBySlug(slug);
  if (!category) return {};

  const name = localizedName(category, locale as Locale);
  const siteName = "Service City";
  const url = absoluteUrl(`/${locale}/category/${slug}`);
  const ogImage = imageUrl(category.image_url) || absoluteUrl("/branding/service-city-logo.png");

  const title = category.seo_title || name;
  const description =
    category.seo_description ||
    `${name} — find trusted professionals, compare prices and book online.`;

  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: localizedLanguages(`/category/${slug}`),
    },
    openGraph: {
      title,
      description,
      url,
      type: "website",
      siteName,
      locale: locale === "ar" ? "ar_MA" : locale === "fr" ? "fr_FR" : "en_US",
      images: [{ url: ogImage, width: 1200, height: 630, alt: name }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function CategoryPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("category");
  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const name = localizedName(category, locale as Locale);
  const businesses = await getBusinessesByCategory(slug);

  const breadcrumb = toJsonLd({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: t("home"),
        item: absoluteUrl(`/${locale}`),
      },
      {
        "@type": "ListItem",
        position: 2,
        name,
        item: absoluteUrl(`/${locale}/category/${category.slug}`),
      },
    ],
  });

  return (
    <div className="container-wide py-12">
      <FadeIn>
        <div className="border-b border-border pb-8">
          <h1 className="text-editorial text-3xl sm:text-4xl md:text-5xl">
            {name}
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">
            {t("subtitle", { name })}
          </p>
        </div>
      </FadeIn>

      {businesses.length === 0 ? (
        <FadeIn delay={0.1}>
          <div className="mt-10">
            <EmptyState
              icon={<LayoutGrid className="size-7" />}
              title={t("emptyTitle")}
              description={t("empty")}
            />
          </div>
        </FadeIn>
      ) : (
        <Stagger className="mt-10 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {businesses.map((business) => (
            <StaggerItem key={business.id} className="h-full">
              <BusinessCard business={business} />
            </StaggerItem>
          ))}
        </Stagger>
      )}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: breadcrumb }}
      />
    </div>
  );
}
