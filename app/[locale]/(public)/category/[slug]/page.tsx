import { setRequestLocale, getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BusinessCard } from "@/components/business-card";
import { FadeIn, Stagger, StaggerItem } from "@/components/motion";
import { getCategoryBySlug, getBusinessesByCategory } from "@/lib/queries";
import { localizedName, type Locale } from "@/lib/translations";

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
  return {
    title: name,
    description: `${name} — find trusted professionals, compare prices and book online.`,
    alternates: { canonical: `/${locale}/category/${slug}` },
  };
}

export default async function CategoryPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("category");
  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const businesses = await getBusinessesByCategory(slug);

  return (
    <div className="container-site py-12">
      <FadeIn>
        <h1 className="text-3xl font-bold md:text-4xl">
          {localizedName(category, locale as Locale)}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {t("subtitle", { name: localizedName(category, locale as Locale) })}
        </p>
      </FadeIn>

      {businesses.length === 0 ? (
        <FadeIn delay={0.1}>
          <p className="mt-10 text-muted-foreground">{t("empty")}</p>
        </FadeIn>
      ) : (
        <Stagger className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {businesses.map((business) => (
            <StaggerItem key={business.id} className="h-full">
              <BusinessCard business={business} />
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </div>
  );
}
