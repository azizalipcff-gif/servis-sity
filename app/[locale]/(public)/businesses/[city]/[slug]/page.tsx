import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Home, ChevronRight } from "lucide-react";
import { notFound, permanentRedirect } from "next/navigation";
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
import { SectionNav, type SectionNavItem } from "@/components/business/section-nav";
import { FadeIn } from "@/components/motion";
import { RelatedSection } from "@/components/business/related-section";
import { toJsonLd } from "@/lib/security/sanitize";
import { siteUrl, absoluteUrl, imageUrl, localizedLanguages } from "@/lib/seo";
import { businessCitySlug, businessPath } from "@/lib/business/url";
import { getBusinessBySlug, getProductsForBusiness, type BusinessDetail } from "@/lib/queries";
import { getRelatedBusinesses } from "@/lib/business-queries";
import { localizedName, type Locale } from "@/lib/translations";
import { SEO_BRAND } from "@/lib/seo-brand";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ locale: string; city: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const business = await getBusinessBySlug(slug);
  if (!business) return { title: "Not found", description: "Business not found" };
  const category = business.categories ? localizedName(business.categories, locale as Locale) : business.city ?? "Pro";
  const canonicalCity = businessCitySlug(business);
  const description = business.description ? business.description.slice(0, 155) : `${category} in ${business.city ?? "Morocco"} — ${business.rating_avg.toFixed(1)} stars on ${SEO_BRAND}.`;
  const title = `${business.name} — ${category} in ${business.city ?? "Morocco"} | ${SEO_BRAND}`;
  const url = absoluteUrl(businessPath(locale, business));
  const ogImage = imageUrl(business.cover_url) || imageUrl(business.logo_url) || absoluteUrl("/branding/service-city-logo.png");
  return { title, description, alternates: { canonical: url, languages: localizedLanguages(`/businesses/${canonicalCity}/${slug}`) }, openGraph: { title, description, type: "website", url, siteName: SEO_BRAND, images: [{ url: ogImage, width: 1200, height: 630, alt: business.name }] }, twitter: { card: "summary_large_image", title, description, images: [ogImage] } };
}

export default async function BusinessPage({ params }: Props) {
  const { locale, city, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("business");
  const business = await getBusinessBySlug(slug);
  if (!business) notFound();
  const canonicalCity = businessCitySlug(business);
  if (city !== canonicalCity) permanentRedirect(businessPath(locale, business));
  const [related, products] = await Promise.all([getRelatedBusinesses(business), getProductsForBusiness(business.id)]);
  const hasMap = Boolean((business.lat && business.lng) || business.address);
  const images = business.media.filter((m) => m.type === "image");
  const breadcrumbJsonLd = toJsonLd({ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: t("home"), item: absoluteUrl(`/${locale}`) }, ...(business.categories ? [{ "@type": "ListItem" as const, position: 2, name: localizedName(business.categories, locale as Locale), item: absoluteUrl(`/${locale}/category/${business.categories.slug}`) }] : []), { "@type": "ListItem" as const, position: business.categories ? 3 : 2, name: business.name, item: absoluteUrl(businessPath(locale, business)) }] });
  const navItems: SectionNavItem[] = [{ id: "about", label: t("description") }, { id: "services", label: t("services") }];
  if (products.length > 0) navItems.push({ id: "products", label: t("products") });
  if (images.length > 0) navItems.push({ id: "gallery", label: t("gallery") });
  navItems.push({ id: "reviews", label: t("reviews") });
  const sectionCls = "scroll-mt-40";
  return <div className="pb-24 lg:pb-8"><BusinessHero business={business} /><nav aria-label="Breadcrumb" className="container-site mt-5 flex items-center gap-2 text-[13px] text-muted-foreground"><Link href="/" className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"><Home className="size-3.5" /><span>{t("home")}</span></Link><ChevronRight className="size-3.5 shrink-0 text-muted-foreground/60 rtl:rotate-180" aria-hidden />{business.categories ? <Link href={`/category/${business.categories.slug}`} className="max-w-40 truncate transition-colors hover:text-foreground">{localizedName(business.categories, locale as Locale)}</Link> : <span className="max-w-40 truncate">{t("home")}</span>}{business.city && <><ChevronRight className="size-3.5 shrink-0 text-muted-foreground/60 rtl:rotate-180" aria-hidden /><span className="max-w-32 truncate">{business.city}</span></>}<ChevronRight className="size-3.5 shrink-0 text-muted-foreground/60 rtl:rotate-180" aria-hidden /><Link href={`/businesses/${canonicalCity}/${business.slug}`} aria-label={t("viewPage")} className="truncate font-medium text-foreground transition-colors hover:text-primary">{business.name}</Link></nav><SectionNav items={navItems} /><div className="container-site mt-8 grid items-start gap-8 py-8 lg:grid-cols-3 lg:gap-8"><div className="min-w-0 space-y-12 lg:col-span-2 lg:space-y-14"><div id="about" className={sectionCls}><FadeIn><BusinessInfo business={business} locale={locale as Locale} /></FadeIn></div><div id="services" className={sectionCls}><FadeIn><ServicesSection business={business} locale={locale as Locale} /></FadeIn></div>{products.length > 0 && <div id="products" className={sectionCls}><FadeIn><BusinessProducts products={products} business={business} /></FadeIn></div>}{images.length > 0 && <div id="gallery" className={sectionCls}><FadeIn><Gallery images={images} title={business.name} businessId={business.id} /></FadeIn></div>}<div id="reviews" className={sectionCls}><FadeIn><ReviewsSection business={business} /></FadeIn></div></div><aside className="space-y-6 lg:col-span-1 lg:sticky lg:top-28 lg:self-start"><ContactCard business={business} />{business.hours.length > 0 && <OpeningHoursSection business={business} locale={locale as Locale} />}<div id="book" className="scroll-mt-40"><BookingWidget business={business} /></div>{hasMap && <MapSection business={business} />}</aside></div><RelatedSection businesses={related} /><StickyActionBar business={business} /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: toJsonLd(schema(business, locale)) }} /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: breadcrumbJsonLd }} /></div>;
}

function schema(business: BusinessDetail, locale: string) { const base = `${siteUrl()}${businessPath(locale, business)}`; const offers = business.services.length > 0 ? { "@type": "OfferCatalog", name: "Services", itemListElement: business.services.map((s, i) => ({ "@type": "Offer", position: i + 1, name: s.name, description: s.description ?? undefined, price: s.price ?? undefined, priceCurrency: "MAD", ...(s.duration_minutes ? { duration: `PT${s.duration_minutes}M` } : {}) })) } : undefined; return { "@context": "https://schema.org", "@type": business.verified ? "LocalBusiness" : "Business", name: business.name, description: business.description ?? undefined, image: imageUrl(business.cover_url) || undefined, telephone: business.phone ?? undefined, url: base, address: business.address ? { "@type": "PostalAddress", streetAddress: business.address, addressLocality: business.city ?? undefined, addressCountry: "MA" } : undefined, geo: business.lat && business.lng ? { "@type": "GeoCoordinates", latitude: business.lat, longitude: business.lng } : undefined, aggregateRating: business.reviews_count > 0 ? { "@type": "AggregateRating", ratingValue: business.rating_avg, reviewCount: business.reviews_count } : undefined, offers, review: business.reviews.slice(0, 5).length > 0 ? business.reviews.slice(0, 5).map((r) => ({ "@type": "Review", author: { "@type": "Person", name: r.profile?.full_name ?? "Anonymous" }, datePublished: r.created_at, reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5 }, reviewBody: r.comment ?? undefined })) : undefined }; }
